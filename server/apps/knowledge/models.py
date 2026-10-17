import pghistory
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from pgvector.django import HnswIndex, VectorField

from apps.academics.models import GRADE_VALIDATORS, Grade
from apps.core.models import AuditModel


class DocumentStatus(models.TextChoices):
    PROCESSING = 'PROCESSING', _("Đang xử lý")
    COMPLETED = 'COMPLETED', _("Hoàn tất")
    FAILED = 'FAILED', _("Lỗi")


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class SourceDocument(AuditModel):
    """
    3.1 Tài liệu gốc giáo viên tải lên (bảng SourceDocuments). Tệp lưu ở Attachments (EntityType = SOURCE_DOCUMENT).
    Celery trích văn bản -> cắt đoạn -> nhúng vector -> (tùy chọn) sinh câu hỏi.
    """
    title = models.CharField(max_length=255, verbose_name=_("Tên tài liệu"))
    grade = models.PositiveSmallIntegerField(choices=Grade.choices, validators=GRADE_VALIDATORS, null=True, blank=True,
                                             verbose_name=_("Khối"))
    topic = models.CharField(max_length=255, null=True, blank=True, verbose_name=_("Chủ đề"))
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PROCESSING,
                              verbose_name=_("Trạng thái xử lý"))
    total_chunks = models.PositiveIntegerField(default=0, verbose_name=_("Tổng số đoạn"))
    processed_chunks = models.PositiveIntegerField(default=0, verbose_name=_("Số đoạn đã xử lý"))
    raw_text = models.TextField(null=True, blank=True, verbose_name=_("Văn bản trích xuất"))
    generate_questions = models.BooleanField(default=True, verbose_name=_("Sinh câu hỏi từ tài liệu"))
    error_message = models.TextField(null=True, blank=True, verbose_name=_("Lỗi xử lý"))

    class Meta:
        db_table = "SourceDocuments"
        verbose_name = _("tài liệu nguồn")
        verbose_name_plural = _("Danh sách tài liệu nguồn")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['status'])]

    def __str__(self):
        return self.title


@pghistory.track(
    pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent(),
    exclude=['embedding'],  # vector 768 chiều -> không chép vào nhật ký
)
class KnowledgeChunk(AuditModel):
    """3.2 Đoạn tri thức dùng cho RAG (bảng KnowledgeChunks) — cắt từ tài liệu hoặc giáo viên nhập tay."""
    source_document = models.ForeignKey(SourceDocument, on_delete=models.CASCADE, null=True, blank=True,
                                        related_name='chunks', verbose_name=_("Tài liệu nguồn"))
    chunk_index = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Thứ tự đoạn"))
    title = models.CharField(max_length=255, verbose_name=_("Tiêu đề"))
    content = models.TextField(verbose_name=_("Nội dung"))
    grade = models.PositiveSmallIntegerField(choices=Grade.choices, validators=GRADE_VALIDATORS, null=True, blank=True,
                                             verbose_name=_("Khối"))
    topic = models.CharField(max_length=255, null=True, blank=True, verbose_name=_("Chủ đề"))
    embedding = VectorField(dimensions=settings.GEMINI_EMBEDDING_DIMENSIONS, null=True, blank=True,
                            verbose_name=_("Vector nhúng"))
    embedded_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Thời điểm nhúng"))

    class Meta:
        db_table = "KnowledgeChunks"
        verbose_name = _("đoạn tri thức")
        verbose_name_plural = _("Ngân hàng tri thức")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['source_document']),
            models.Index(fields=['grade']),
            HnswIndex(name='knowledge_chunk_embedding_hnsw', fields=['embedding'], m=16, ef_construction=64,
                      opclasses=['vector_cosine_ops']),
        ]

    def __str__(self):
        return self.title
