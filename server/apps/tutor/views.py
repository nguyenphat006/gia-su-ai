"""
API gia sư AI phía học sinh. Chỉ thao tác trên phiên của CHÍNH MÌNH (queryset lọc theo request.user) — không dùng
ModulePermissionChecker vì đây không phải dữ liệu quản trị; quyền vào cổng học sinh: LEARN_USE.
"""
from collections import defaultdict

from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.models import Attachment
from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission
from apps.core.responses import success_response

from . import services
from .models import ChatSession
from .serializers import ChatMessageSerializer, ChatSessionSerializer, SendMessageResultSerializer, SendMessageSerializer

TAG = "Học sinh - Gia sư AI"
MESSAGE_LIMIT = 500


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="Các phiên trò chuyện của tôi"),
    create=extend_schema(tags=[TAG], summary="Tạo phiên trò chuyện mới"),
    partial_update=extend_schema(tags=[TAG], summary="Đổi tên phiên"),
    destroy=extend_schema(tags=[TAG], summary="Xóa phiên trò chuyện"),
)
class ChatSessionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin,
                         mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission('LEARN_USE')]
    pagination_class = StandardResultsSetPagination
    http_method_names = ['get', 'post', 'patch', 'delete']
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # gửi câu hỏi kèm ảnh = multipart

    queryset = ChatSession.objects.none()  # cho drf-spectacular suy ra kiểu; dữ liệu thật lấy ở get_queryset

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ChatSession.objects.none()
        return ChatSession.objects.filter(user=self.request.user).order_by('-last_message_at', '-created_at', '-id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user, updated_by=self.request.user)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return success_response(data=response.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        return success_response(data=response.data)

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(user=request.user)
        return success_response(message=_("Đã xóa cuộc trò chuyện"))

    @extend_schema(tags=[TAG], summary="Tin nhắn trong phiên (cũ -> mới)", responses=ChatMessageSerializer(many=True))
    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        session = self.get_object()
        rows = list(session.messages.order_by('-id')[:MESSAGE_LIMIT])[::-1]
        return success_response(data=ChatMessageSerializer(rows, many=True, context={'images': _images_for(rows)}).data)

    @extend_schema(tags=[TAG], summary="Gửi câu hỏi cho gia sư AI",
                   request={'multipart/form-data': SendMessageSerializer, 'application/json': SendMessageSerializer},
                   responses=SendMessageResultSerializer)
    @messages.mapping.post
    def send_message(self, request, pk=None):
        session = self.get_object()
        payload = SendMessageSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        result = services.process_message(session, payload.validated_data['content'], payload.validated_data.get('image'))
        session.refresh_from_db()
        rows = [result['user_message'], result['ai_message']]
        context = {'images': _images_for(rows)}
        data = {
            'user_message': ChatMessageSerializer(result['user_message'], context=context).data,
            'ai_message': ChatMessageSerializer(result['ai_message'], context=context).data,
            'xp_delta': result['xp_delta'], 'blocked': result['blocked'],
            'completed_challenges': result['completed_challenges'],
            'session': ChatSessionSerializer(session).data,
        }
        return success_response(data=data, status_code=status.HTTP_201_CREATED)


def _images_for(messages) -> dict:
    ids = [m.id for m in messages]
    mapping = defaultdict(list)
    for att_id, entity_id in Attachment.objects.filter(
        entity_type=services.ATTACHMENT_ENTITY, entity_id__in=ids,
    ).values_list('id', 'entity_id'):
        mapping[entity_id].append(att_id)
    return mapping
