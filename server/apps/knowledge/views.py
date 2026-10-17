import os

from django.db import transaction
from django.db.models import Count, Q
from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.parsers import FormParser, MultiPartParser

from apps.core.models import Attachment
from apps.core.permissions import ModulePermissionChecker
from apps.core.responses import success_response
from apps.core.viewsets import BaseERPViewSet

from .models import KnowledgeChunk, SourceDocument
from .serializers import (
    KnowledgeChunkCreateUpdateSerializer, KnowledgeChunkSerializer, ReviewQuestionsResultSerializer, ReviewQuestionsSerializer,
    SourceDocumentDetailSerializer, SourceDocumentSerializer, SourceDocumentUpdateSerializer,
    SourceDocumentUploadSerializer,
)
from .tasks import process_source_document


def _crud_schema(tag: str, label: str):
    return extend_schema_view(
        list=extend_schema(tags=[tag], summary=f"Danh sách {label}"),
        retrieve=extend_schema(tags=[tag], summary=f"Chi tiết {label}"),
        create=extend_schema(tags=[tag], summary=f"Tạo mới {label}"),
        update=extend_schema(tags=[tag], summary=f"Cập nhật {label}"),
        partial_update=extend_schema(tags=[tag], summary=f"Cập nhật một phần {label}"),
        destroy=extend_schema(tags=[tag], summary=f"Xóa mềm {label}"),
    )


@_crud_schema("Tri thức RAG", "đoạn tri thức")
class KnowledgeChunkViewSet(BaseERPViewSet):
    """Đoạn tri thức RAG: giáo viên nhập tay hoặc sinh từ tài liệu tải lên."""
    queryset = KnowledgeChunk.objects.select_related('source_document', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = KnowledgeChunkSerializer
    write_serializer_class = KnowledgeChunkCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'KNOWLEDGE'
    filterset_fields = {
        'is_active': ['exact'],
        'grade': ['exact', 'in', 'isnull'],
        'source_document': ['exact', 'isnull'],
        'topic': ['icontains'],
        'title': ['icontains'],
        'embedded_at': ['isnull'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['title', 'content', 'topic']
    ordering_fields = ['created_at', 'updated_at', 'title', 'grade', 'chunk_index']
    excel_excluded_fields = ['embedding', 'source_document']

    def after_write(self, instance=None):
        # Nhúng vector chạy nền cho đoạn mới / vừa sửa nội dung (Celery — P3)
        from .tasks import embed_pending_chunks
        embed_pending_chunks.delay()


@extend_schema_view(
    list=extend_schema(tags=["Tri thức RAG"], summary="Danh sách tài liệu nguồn"),
    retrieve=extend_schema(tags=["Tri thức RAG"], summary="Chi tiết tài liệu nguồn (kèm văn bản trích xuất)"),
    update=extend_schema(tags=["Tri thức RAG"], summary="Cập nhật thông tin tài liệu"),
    partial_update=extend_schema(tags=["Tri thức RAG"], summary="Cập nhật một phần thông tin tài liệu"),
    destroy=extend_schema(tags=["Tri thức RAG"], summary="Xóa mềm tài liệu (kèm các đoạn tri thức)"),
)
class SourceDocumentViewSet(BaseERPViewSet):
    """Tài liệu nguồn giáo viên tải lên. Tạo mới qua action `upload` (multipart) — không qua POST thường."""
    queryset = (
        SourceDocument.objects.select_related('created_by')
        .annotate(
            chunk_count=Count('chunks', filter=Q(chunks__deleted_at__isnull=True), distinct=True),
            question_count=Count('questions', filter=Q(questions__deleted_at__isnull=True), distinct=True),
            pending_question_count=Count('questions', filter=Q(questions__deleted_at__isnull=True, questions__status='PENDING'), distinct=True),
        )
        .order_by('-updated_at', 'id')
    )
    serializer_class = SourceDocumentSerializer
    write_serializer_class = SourceDocumentUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'KNOWLEDGE'
    http_method_names = ['get', 'patch', 'put', 'delete', 'post']
    filterset_fields = {
        'is_active': ['exact'],
        'status': ['exact', 'in'],
        'grade': ['exact', 'in', 'isnull'],
        'topic': ['icontains'],
        'title': ['icontains'],
        'created_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['title', 'topic']
    ordering_fields = ['created_at', 'updated_at', 'title', 'status']
    excel_excluded_fields = ['raw_text', 'error_message']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SourceDocumentDetailSerializer
        return super().get_serializer_class()

    custom_action_permissions = {'upload': 'KNOWLEDGE_CREATE', 'review_questions': 'KNOWLEDGE_UPDATE'}

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed('POST', detail=_("Dùng /source-documents/upload/ để tải tài liệu lên."))

    @extend_schema(tags=["Tri thức RAG"], summary="Tải tài liệu lên và nạp vào ngân hàng tri thức (chạy nền)",
                   request={'multipart/form-data': SourceDocumentUploadSerializer}, responses={201: SourceDocumentSerializer})
    @action(detail=False, methods=['post'], url_path='upload', parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """PDF / DOCX / TXT tối đa 50MB. Trả ngay bản ghi PROCESSING; theo dõi `status` / `progress` để biết khi xong."""
        payload = SourceDocumentUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        file_obj = payload.validated_data['file']
        user = request.user
        with transaction.atomic():
            doc = SourceDocument.objects.create(
                title=payload.validated_data.get('title') or os.path.splitext(file_obj.name)[0],
                grade=payload.validated_data.get('grade'), topic=payload.validated_data.get('topic'),
                generate_questions=payload.validated_data['generate_questions'],
                created_by=user, updated_by=user,
            )
            attachment = Attachment.objects.create(
                entity_type='KNOWLEDGE', entity_id=doc.id, file=file_obj, file_name=file_obj.name,
                file_size=file_obj.size, mime_type=getattr(file_obj, 'content_type', None), file_category='DOCUMENT',
                created_by=user, updated_by=user,
            )
        transaction.on_commit(lambda: process_source_document.delay(doc.id, attachment.id))
        doc = self.get_queryset().get(pk=doc.pk)
        return success_response(data=SourceDocumentSerializer(doc).data, status_code=status.HTTP_201_CREATED,
                                message=_("Đã tải lên, hệ thống đang đọc tài liệu"))

    @extend_schema(tags=["Tri thức RAG"], summary="Duyệt / loại các câu hỏi AI sinh từ tài liệu",
                   request=ReviewQuestionsSerializer, responses=ReviewQuestionsResultSerializer)
    @action(detail=True, methods=['post'], url_path='review-questions')
    def review_questions(self, request, pk=None):
        """`APPROVE_ALL`: đưa mọi câu chờ duyệt vào ngân hàng; `REJECT_ALL`: loại hết."""
        from apps.revision.models import QuestionStatus
        doc = self.get_object()
        payload = ReviewQuestionsSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        new_status = QuestionStatus.APPROVED if payload.validated_data['action'] == 'APPROVE_ALL' else QuestionStatus.REJECTED
        count = doc.questions.filter(status=QuestionStatus.PENDING, deleted_at__isnull=True).update(
            status=new_status, updated_by=request.user,
        )
        return success_response(data={'count': count}, message=_("Đã cập nhật %(count)s câu hỏi") % {"count": count})

    def perform_destroy(self, instance):
        user = self._current_user()
        for chunk in instance.chunks.all():
            chunk.soft_delete(user=user)
        instance.soft_delete(user=user)
