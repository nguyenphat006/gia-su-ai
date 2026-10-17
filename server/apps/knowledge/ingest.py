"""
Nạp tài liệu giáo viên: trích văn bản -> cắt đoạn -> tạo KnowledgeChunk -> nhúng vector -> (tùy chọn) sinh câu hỏi.

PDF: pypdf trước; PDF scan (không có lớp chữ) -> nhờ Gemini đọc. DOCX: python-docx. TXT: UTF-8.
"""
import io
import logging
import os

from django.db import transaction
from django.utils.translation import gettext as _

from apps.ai.client import AiUnavailable, generate_json, generate_text
from apps.ai.prompts import quiz_prompt

from .models import DocumentStatus, KnowledgeChunk, SourceDocument
from .rag import CHUNK_MIN_CHARS, embed_chunks, split_text

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = ('.pdf', '.docx', '.txt')
MAX_UPLOAD_MB = 50
MIN_TEXT_CHARS = 50
QUESTIONS_PER_CHUNK_MC = 2
QUESTIONS_PER_CHUNK_ESSAY = 1


class ExtractionError(Exception):
    pass


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    text = "\n\n".join((page.extract_text() or '') for page in reader.pages)
    if len(''.join(text.split())) >= MIN_TEXT_CHARS:
        return text
    # PDF scan: nhờ Gemini đọc toàn bộ chữ trên ảnh trang
    return generate_text(
        "Trích xuất toàn bộ văn bản trong tài liệu này, giữ nguyên thứ tự và xuống dòng giữa các đoạn. "
        "Công thức viết bằng LaTeX $...$. Chỉ trả về văn bản, không bình luận.",
        image={'data': data, 'mime_type': 'application/pdf'},
    )


def _extract_docx(data: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(data))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_text(file_name: str, data: bytes) -> str:
    ext = os.path.splitext(file_name)[1].lower()
    if ext == '.pdf':
        text = _extract_pdf(data)
    elif ext == '.docx':
        text = _extract_docx(data)
    elif ext == '.txt':
        text = data.decode('utf-8', errors='ignore')
    else:
        raise ExtractionError(_("Chỉ hỗ trợ tệp PDF, DOCX hoặc TXT."))
    if len(''.join(text.split())) < MIN_TEXT_CHARS:
        raise ExtractionError(_("Không trích xuất được nội dung (tài liệu trống hoặc là ảnh không đọc được)."))
    return text


def _generate_questions(doc: SourceDocument, chunk: KnowledgeChunk) -> int:
    from apps.revision.models import Origin, Question, QuestionStatus, QuestionType
    created = 0
    for question_type, count in ((QuestionType.MULTIPLE_CHOICE, QUESTIONS_PER_CHUNK_MC), (QuestionType.ESSAY, QUESTIONS_PER_CHUNK_ESSAY)):
        data = generate_json(quiz_prompt(
            topic=doc.topic or doc.title, grade=doc.grade, count=count, question_type=question_type,
            difficulties=[], context=chunk.content,
        ))
        for item in (data.get('questions') or [])[:count]:
            content = str(item.get('content') or '').strip()
            answer = str(item.get('correct_answer') or '').strip()
            options = item.get('options') if question_type == QuestionType.MULTIPLE_CHOICE else None
            if not content or not answer or (options is not None and (len(options) != 4 or answer not in options)):
                continue
            Question.objects.create(
                grade=doc.grade, topic=doc.topic or doc.title, question_type=question_type,
                difficulty=item.get('difficulty') if item.get('difficulty') in ('NHAN_BIET', 'THONG_HIEU', 'VAN_DUNG') else 'NHAN_BIET',
                content=content, options=options, correct_answer=answer, explanation=item.get('explanation'),
                hint=item.get('hint'), status=QuestionStatus.PENDING, origin=Origin.DOCUMENT, source_document=doc,
                created_by=doc.created_by, updated_by=doc.created_by,
            )
            created += 1
    return created


def process_document(doc_id: int, file_name: str, data: bytes):
    """Chạy trong Celery. Mọi lỗi -> FAILED kèm lý do (bản cũ không bao giờ báo lỗi)."""
    doc = SourceDocument.objects.get(pk=doc_id)
    try:
        text = extract_text(file_name, data)
        pieces = [p for p in split_text(text) if len(p) >= CHUNK_MIN_CHARS]
        with transaction.atomic():
            doc.raw_text = text
            doc.total_chunks = len(pieces)
            doc.save(update_fields=['raw_text', 'total_chunks', 'updated_at'])
            chunks = KnowledgeChunk.objects.bulk_create([
                KnowledgeChunk(
                    source_document=doc, chunk_index=i, title=f"{doc.title} - P{i + 1}", content=piece,
                    grade=doc.grade, topic=doc.topic, created_by=doc.created_by, updated_by=doc.created_by,
                )
                for i, piece in enumerate(pieces)
            ])
        embed_chunks(chunks)

        for i, chunk in enumerate(chunks, start=1):
            if doc.generate_questions:
                try:
                    _generate_questions(doc, chunk)
                except AiUnavailable as exc:  # sinh câu hỏi lỗi 1 đoạn không làm hỏng cả tài liệu
                    logger.warning("Sinh câu hỏi đoạn %s của tài liệu %s lỗi: %s", i, doc_id, exc)
            SourceDocument.objects.filter(pk=doc_id).update(processed_chunks=i)

        SourceDocument.objects.filter(pk=doc_id).update(status=DocumentStatus.COMPLETED, error_message=None)
    except (ExtractionError, AiUnavailable) as exc:
        SourceDocument.objects.filter(pk=doc_id).update(status=DocumentStatus.FAILED, error_message=str(getattr(exc, 'detail', exc)))
    except Exception as exc:
        logger.exception("Nạp tài liệu %s lỗi", doc_id)
        SourceDocument.objects.filter(pk=doc_id).update(status=DocumentStatus.FAILED, error_message=_("Lỗi hệ thống: %(error)s") % {"error": exc})
