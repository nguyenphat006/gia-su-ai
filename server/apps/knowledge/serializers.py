from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.academics.models import Grade

from .models import KnowledgeChunk, SourceDocument

DT_FORMAT = "%d/%m/%Y %H:%M"


class SourceDocumentSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC tài liệu nguồn (không kèm raw_text — xem ở trang chi tiết)."""
    question_count = serializers.IntegerField(read_only=True, default=0)
    chunk_count = serializers.IntegerField(read_only=True, default=0)
    progress = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = SourceDocument
        fields = ['id', 'title', 'grade', 'topic', 'status', 'total_chunks', 'processed_chunks', 'progress',
                  'chunk_count', 'question_count', 'generate_questions', 'error_message', 'description', 'is_active',
                  'created_by_name', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_progress(self, obj) -> int:
        return round(obj.processed_chunks * 100 / obj.total_chunks) if obj.total_chunks else 0


class SourceDocumentDetailSerializer(SourceDocumentSerializer):
    class Meta(SourceDocumentSerializer.Meta):
        fields = [*SourceDocumentSerializer.Meta.fields, 'raw_text']
        read_only_fields = fields


class SourceDocumentUpdateSerializer(serializers.ModelSerializer):
    """Chỉ sửa thông tin mô tả; nội dung đi theo tệp đã tải lên."""

    class Meta:
        model = SourceDocument
        fields = ['id', 'title', 'grade', 'topic', 'description', 'is_active']
        read_only_fields = ['id']


class SourceDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    topic = serializers.CharField(max_length=255, required=False, allow_blank=True)
    generate_questions = serializers.BooleanField(default=True)

    def validate_file(self, value):
        from .ingest import ALLOWED_EXTENSIONS, MAX_UPLOAD_MB
        import os
        if os.path.splitext(value.name)[1].lower() not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(_("Chỉ hỗ trợ tệp PDF, DOCX hoặc TXT."))
        if value.size > MAX_UPLOAD_MB * 1024 * 1024:
            raise serializers.ValidationError(_("Dung lượng tối đa %(size)sMB.") % {"size": MAX_UPLOAD_MB})
        return value


class ReviewQuestionsSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE_ALL', 'REJECT_ALL'])


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC đoạn tri thức."""
    source_document_title = serializers.CharField(source='source_document.title', read_only=True, default='')
    is_embedded = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = KnowledgeChunk
        fields = ['id', 'title', 'content', 'grade', 'topic', 'source_document', 'source_document_title',
                  'chunk_index', 'is_embedded', 'description', 'is_active',
                  'created_by_name', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_is_embedded(self, obj) -> bool:
        return obj.embedded_at is not None


class KnowledgeChunkCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer GHI đoạn tri thức nhập tay. Sửa nội dung -> phải nhúng lại vector."""

    class Meta:
        model = KnowledgeChunk
        fields = ['id', 'title', 'content', 'grade', 'topic', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(_("Tiêu đề không được để trống."))
        return value

    def validate_content(self, value):
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError(_("Nội dung quá ngắn (tối thiểu 20 ký tự)."))
        return value

    def update(self, instance, validated_data):
        if 'content' in validated_data and validated_data['content'] != instance.content:
            instance.embedding = None  # nội dung đổi -> vector cũ không còn đúng
            instance.embedded_at = None
        return super().update(instance, validated_data)
