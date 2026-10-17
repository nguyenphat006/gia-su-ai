"""Tác vụ nền (Celery) của Tri thức RAG."""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def process_source_document(doc_id: int, attachment_id: int):
    """Đọc tệp đã tải lên (Attachment) rồi nạp vào ngân hàng tri thức."""
    from apps.core.models import Attachment

    from .ingest import process_document

    attachment = Attachment.objects.get(pk=attachment_id)
    with attachment.file.open('rb') as fh:
        data = fh.read()
    process_document(doc_id, attachment.file_name, data)


@shared_task
def embed_pending_chunks():
    """Nhúng vector cho các đoạn mới / vừa sửa nội dung (embedding NULL)."""
    from apps.ai.client import AiUnavailable

    from .models import KnowledgeChunk
    from .rag import embed_chunks

    pending = KnowledgeChunk.objects.filter(embedding__isnull=True, is_active=True)[:500]
    try:
        return embed_chunks(pending)
    except AiUnavailable as exc:
        logger.warning("Chưa nhúng được đoạn tri thức: %s", exc)
        return 0
