from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions
from rest_framework.decorators import action

from apps.core.permissions import ModulePermissionChecker
from apps.core.responses import success_response
from apps.core.viewsets import BaseERPViewSet

from . import generation
from .models import FlashcardDeck, Mindmap, Question
from .serializers import (
    AiDraftRequestSerializer, FlashcardDeckCreateUpdateSerializer, FlashcardDeckSerializer, FlashcardDraftSerializer,
    MindmapCreateUpdateSerializer, MindmapDraftSerializer, MindmapSerializer, QuestionCreateUpdateSerializer,
    QuestionDraftSerializer, QuestionSerializer,
)

TAG = "Ôn tập (quản trị)"
GRADE_TOPIC_FILTERS = {
    'is_active': ['exact'],
    'grade': ['exact', 'in', 'isnull'],
    'school_class': ['exact', 'isnull'],
    'topic': ['icontains'],
    'origin': ['exact', 'in'],
    'updated_at': ['date__gte', 'date__lte'],
}


def _crud_schema(label: str):
    return extend_schema_view(
        list=extend_schema(tags=[TAG], summary=f"Danh sách {label}"),
        retrieve=extend_schema(tags=[TAG], summary=f"Chi tiết {label}"),
        create=extend_schema(tags=[TAG], summary=f"Tạo mới {label}"),
        update=extend_schema(tags=[TAG], summary=f"Cập nhật {label}"),
        partial_update=extend_schema(tags=[TAG], summary=f"Cập nhật một phần {label}"),
        destroy=extend_schema(tags=[TAG], summary=f"Xóa mềm {label}"),
    )


class _AiDraftMixin:
    """Action `ai-draft`: AI soạn nháp (không lưu) để giáo viên sửa rồi mới lưu. Cần quyền CREATE."""

    def _draft_request(self, request):
        payload = AiDraftRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        return payload.validated_data


@_crud_schema("câu hỏi")
class QuestionViewSet(_AiDraftMixin, BaseERPViewSet):
    """Ngân hàng câu hỏi trắc nghiệm / tự luận; câu sinh từ tài liệu ở trạng thái Chờ duyệt."""
    queryset = Question.objects.select_related('school_class', 'source_document', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = QuestionSerializer
    write_serializer_class = QuestionCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'QUESTION'
    custom_action_permissions = {'ai_draft': 'QUESTION_CREATE'}
    filterset_fields = {
        **GRADE_TOPIC_FILTERS,
        'question_type': ['exact', 'in'],
        'difficulty': ['exact', 'in'],
        'status': ['exact', 'in'],
        'source_document': ['exact', 'isnull'],
        'content': ['icontains'],
    }
    search_fields = ['content', 'topic', 'correct_answer']
    ordering_fields = ['created_at', 'updated_at', 'grade', 'topic', 'difficulty', 'status']
    excel_excluded_fields = ['school_class', 'source_document']

    @extend_schema(tags=[TAG], summary="AI soạn nháp câu hỏi (không lưu)", request=AiDraftRequestSerializer,
                   responses=QuestionDraftSerializer(many=True))
    @action(detail=False, methods=['post'], url_path='ai-draft')
    def ai_draft(self, request):
        data = self._draft_request(request)
        drafts = generation.draft_questions(
            topic=data['topic'], grade=data.get('grade'), count=data['count'],
            question_type=data['question_type'], difficulties=data['difficulties'],
        )
        return success_response(data=QuestionDraftSerializer(drafts, many=True).data)


@_crud_schema("bộ flashcard")
class FlashcardDeckViewSet(_AiDraftMixin, BaseERPViewSet):
    queryset = FlashcardDeck.objects.select_related('school_class', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = FlashcardDeckSerializer
    write_serializer_class = FlashcardDeckCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'FLASHCARD'
    custom_action_permissions = {'ai_draft': 'FLASHCARD_CREATE'}
    filterset_fields = {**GRADE_TOPIC_FILTERS, 'title': ['icontains']}
    search_fields = ['title', 'topic']
    ordering_fields = ['created_at', 'updated_at', 'grade', 'topic', 'title']
    excel_excluded_fields = ['school_class', 'cards']

    @extend_schema(tags=[TAG], summary="AI soạn nháp bộ flashcard (không lưu)", request=AiDraftRequestSerializer,
                   responses=FlashcardDraftSerializer)
    @action(detail=False, methods=['post'], url_path='ai-draft')
    def ai_draft(self, request):
        data = self._draft_request(request)
        return success_response(data=generation.draft_flashcards(topic=data['topic'], grade=data.get('grade')))


@_crud_schema("sơ đồ tư duy")
class MindmapViewSet(_AiDraftMixin, BaseERPViewSet):
    queryset = Mindmap.objects.select_related('school_class', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = MindmapSerializer
    write_serializer_class = MindmapCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'MINDMAP'
    custom_action_permissions = {'ai_draft': 'MINDMAP_CREATE'}
    filterset_fields = {**GRADE_TOPIC_FILTERS, 'title': ['icontains']}
    search_fields = ['title', 'topic']
    ordering_fields = ['created_at', 'updated_at', 'grade', 'topic', 'title']
    excel_excluded_fields = ['school_class', 'nodes']

    @extend_schema(tags=[TAG], summary="AI soạn nháp sơ đồ tư duy (không lưu)", request=AiDraftRequestSerializer,
                   responses=MindmapDraftSerializer)
    @action(detail=False, methods=['post'], url_path='ai-draft')
    def ai_draft(self, request):
        data = self._draft_request(request)
        return success_response(data=generation.draft_mindmap(topic=data['topic'], grade=data.get('grade')))
