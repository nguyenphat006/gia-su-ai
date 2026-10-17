"""
RAG: cắt văn bản thành đoạn, nhúng vector, tìm đoạn gần nghĩa nhất (pgvector cosine).

    from apps.knowledge.rag import retrieve_context
    context, chunk_ids = retrieve_context("Quang hợp là gì?", grade=6)
"""
import logging

from django.db.models import Q
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.ai.client import AiUnavailable, embed_texts

from .models import KnowledgeChunk

logger = logging.getLogger(__name__)

CHUNK_MAX_CHARS = 3000
CHUNK_MIN_CHARS = 100
EMBED_BATCH = 50
# Khoảng cách cosine tối đa để coi là liên quan (0 = trùng nghĩa, 2 = ngược nghĩa)
MAX_DISTANCE = 0.6


def split_text(text: str, max_chars: int = CHUNK_MAX_CHARS) -> list[str]:
    """Gom các đoạn văn (ngăn bởi dòng trống) thành khối <= max_chars; đoạn quá dài thì cắt theo dòng."""
    paragraphs = [p.strip() for p in text.replace('\r\n', '\n').split('\n\n') if p.strip()]
    chunks, current = [], ''
    for para in paragraphs:
        pieces = [para] if len(para) <= max_chars else [para[i:i + max_chars] for i in range(0, len(para), max_chars)]
        for piece in pieces:
            if current and len(current) + len(piece) + 2 > max_chars:
                chunks.append(current)
                current = piece
            else:
                current = f"{current}\n\n{piece}" if current else piece
    if current:
        chunks.append(current)
    return chunks


def embed_chunks(chunks) -> int:
    """Nhúng vector cho danh sách KnowledgeChunk (theo lô). Trả số đoạn đã nhúng."""
    chunks = list(chunks)
    done = 0
    for start in range(0, len(chunks), EMBED_BATCH):
        batch = chunks[start:start + EMBED_BATCH]
        vectors = embed_texts([f"{c.title}\n{c.content}" for c in batch], task_type='RETRIEVAL_DOCUMENT')
        now = timezone.now()
        for chunk, vector in zip(batch, vectors):
            chunk.embedding = vector
            chunk.embedded_at = now
        KnowledgeChunk.objects.bulk_update(batch, ['embedding', 'embedded_at'])
        done += len(batch)
    return done


def search_chunks(query: str, *, grade=None, limit: int = 5):
    """Đoạn tri thức gần nghĩa nhất với câu hỏi, lọc theo khối (đoạn không gắn khối = dùng chung)."""
    if not query.strip():
        return []
    try:
        vector = embed_texts([query], task_type='RETRIEVAL_QUERY')[0]
    except AiUnavailable:
        logger.warning("RAG: không nhúng được câu hỏi, bỏ qua ngữ cảnh")
        return []
    qs = KnowledgeChunk.objects.filter(is_active=True, embedding__isnull=False)
    if grade:
        qs = qs.filter(Q(grade=grade) | Q(grade__isnull=True))
    return list(
        qs.annotate(distance=CosineDistance('embedding', vector))
        .filter(distance__lte=MAX_DISTANCE)
        .order_by('distance')[:limit]
    )


def retrieve_context(query: str, *, grade=None, limit: int | None = None) -> tuple[str, list[int]]:
    """Ghép các đoạn liên quan thành khối ngữ cảnh cho prompt. Trả (context, [chunk_id])."""
    if limit is None:
        from apps.ai_settings.services import get_int
        limit = get_int('RAG_TOP_K', 5)
    chunks = search_chunks(query, grade=grade, limit=limit)
    context = "\n\n---\n\n".join(f"[{c.title}]\n{c.content}" for c in chunks)
    return context, [c.id for c in chunks]
