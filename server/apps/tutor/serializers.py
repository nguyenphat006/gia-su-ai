from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.attachment_access import signed_file_url

from .models import ChatMessage, ChatSession

MAX_IMAGE_MB = 5
IMAGE_TYPES = ('image/jpeg', 'image/png', 'image/webp')
MAX_CONTENT = 4000


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'last_message_at', 'created_at']
        read_only_fields = ['id', 'last_message_at', 'created_at']
        extra_kwargs = {'title': {'required': False, 'allow_blank': True, 'max_length': 255}}


class ChatMessageSerializer(serializers.ModelSerializer):
    image_urls = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'is_blocked', 'image_urls', 'created_at']
        read_only_fields = fields

    def get_image_urls(self, obj) -> list[str]:
        images = self.context.get('images', {})
        return [signed_file_url(att_id) for att_id in images.get(obj.id, [])]


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=MAX_CONTENT, required=False, allow_blank=True, default='')
    image = serializers.ImageField(required=False)

    def validate_image(self, value):
        if getattr(value, 'content_type', None) not in IMAGE_TYPES:
            raise serializers.ValidationError(_("Chỉ nhận ảnh JPG, PNG hoặc WEBP."))
        if value.size > MAX_IMAGE_MB * 1024 * 1024:
            raise serializers.ValidationError(_("Ảnh tối đa %(size)sMB.") % {"size": MAX_IMAGE_MB})
        return value

    def validate(self, attrs):
        if not attrs.get('content', '').strip() and not attrs.get('image'):
            raise serializers.ValidationError({'content': [_("Em hãy nhập câu hỏi hoặc gửi ảnh bài tập.")]})
        return attrs


class SendMessageResultSerializer(serializers.Serializer):
    user_message = ChatMessageSerializer()
    ai_message = ChatMessageSerializer()
    xp_delta = serializers.IntegerField()
    blocked = serializers.BooleanField()
    completed_challenges = serializers.ListField(child=serializers.CharField())
    session = ChatSessionSerializer()
