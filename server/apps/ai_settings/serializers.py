from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.messages import DUPLICATE_CODE

from .defaults import DEFAULT_SETTINGS
from .models import AiSetting, ValueType

DT_FORMAT = "%d/%m/%Y %H:%M"


class AiSettingSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC cấu hình AI."""
    is_system = serializers.SerializerMethodField()
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = AiSetting
        fields = ['id', 'key', 'label', 'value', 'value_type', 'is_system', 'description', 'is_active',
                  'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_is_system(self, obj) -> bool:
        """Khóa hệ thống: code đang dùng -> không xóa / đổi khóa được."""
        return obj.key in DEFAULT_SETTINGS


class AiSettingCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer GHI: kiểm tra giá trị đúng kiểu (số / bật-tắt)."""

    class Meta:
        model = AiSetting
        fields = ['id', 'key', 'label', 'value', 'value_type', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_key(self, value):
        key = value.strip().upper()
        if self.instance is not None and key != self.instance.key and self.instance.key in DEFAULT_SETTINGS:
            raise serializers.ValidationError(_("Không đổi được khóa của cấu hình hệ thống."))
        qs = AiSetting.all_objects.filter(key=key)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(DUPLICATE_CODE % {"code": key})
        return key

    def validate(self, attrs):
        value_type = attrs.get('value_type', getattr(self.instance, 'value_type', ValueType.TEXT))
        value = attrs.get('value', getattr(self.instance, 'value', ''))
        if value_type == ValueType.NUMBER:
            try:
                float(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError({'value': [_("Giá trị phải là số.")]})
        elif value_type == ValueType.BOOLEAN:
            normalized = str(value).strip().lower()
            if normalized not in ('true', 'false'):
                raise serializers.ValidationError({'value': [_("Giá trị phải là true hoặc false.")]})
            attrs['value'] = normalized
        elif not str(value).strip():
            raise serializers.ValidationError({'value': [_("Giá trị không được để trống.")]})
        return attrs
