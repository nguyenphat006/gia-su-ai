from django.utils.translation import gettext as _
from rest_framework import serializers

from apps.core.countries import COUNTRY_CODES

from apps.core.messages import DUPLICATE_CODE, NAME_REQUIRED

from .models import CUSTOMER_CODE_VALIDATOR, Customer


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC — dùng cho mọi response (list, detail, sau create/update)."""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    updated_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'customer_name', 'country', 'logo_url', 'description', 'is_active',
            'created_by_name', 'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class CustomerCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer GHI — mã tự viết hoa, kiểm tra trùng trên cả bản ghi đã xóa mềm (cột unique ở DB)."""

    class Meta:
        model = Customer
        fields = ['id', 'customer_code', 'customer_name', 'country', 'logo_url', 'description', 'is_active']
        read_only_fields = ['id']
        # Kiểm tra trùng / định dạng sau khi đã viết hoa (validate_customer_code), không dùng validator tự động
        extra_kwargs = {'customer_code': {'validators': []}}

    def validate_customer_code(self, value):
        code = value.strip().upper()
        CUSTOMER_CODE_VALIDATOR(code)
        qs = Customer.all_objects.filter(customer_code=code)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(DUPLICATE_CODE % {"code": code})
        return code

    def validate_customer_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(NAME_REQUIRED)
        return name

    def validate_country(self, value):
        code = (value or '').strip().upper()
        if not code:
            return None
        if code not in COUNTRY_CODES:
            raise serializers.ValidationError(_("Mã quốc gia không hợp lệ (dùng mã ISO 2 chữ cái, vd. US, VN)."))
        return code
