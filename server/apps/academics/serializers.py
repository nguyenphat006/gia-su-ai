from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.messages import DUPLICATE_CODE, NAME_REQUIRED

from . import services
from .models import Grade, SchoolClass, StudentProfile, TeacherProfile

DT_FORMAT = "%d/%m/%Y %H:%M"


# ---------------------------------------------------------------------------- Lớp học
class SchoolClassSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC lớp học."""
    homeroom_teacher_name = serializers.CharField(source='homeroom_teacher.full_name', read_only=True, default='')
    student_count = serializers.IntegerField(read_only=True, default=0)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = SchoolClass
        fields = [
            'id', 'code', 'name', 'grade', 'academic_year', 'homeroom_teacher', 'homeroom_teacher_name',
            'student_count', 'description', 'is_active',
            'created_by_name', 'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class SchoolClassCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer GHI lớp học."""

    class Meta:
        model = SchoolClass
        fields = ['id', 'code', 'name', 'grade', 'academic_year', 'homeroom_teacher', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_code(self, value):
        code = value.strip().upper()
        qs = SchoolClass.all_objects.filter(code=code)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(DUPLICATE_CODE % {"code": code})
        return code

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(NAME_REQUIRED)
        return name

    def validate_homeroom_teacher(self, value):
        if value and not value.roles.filter(role_code__in=['TEACHER', 'ADMIN']).exists():
            raise serializers.ValidationError(_("Giáo viên chủ nhiệm phải là tài khoản giáo viên."))
        return value

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        year = attrs.get('academic_year', getattr(self.instance, 'academic_year', None))
        qs = SchoolClass.objects.filter(name__iexact=name, academic_year=year)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({'name': [_("Năm học %(year)s đã có lớp %(name)s.") % {"year": year, "name": name}]})
        return attrs


# ---------------------------------------------------------------------------- Học sinh
class StudentSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC học sinh (hồ sơ + tài khoản)."""
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    must_change_password = serializers.BooleanField(source='user.must_change_password', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', format=DT_FORMAT, read_only=True)
    school_class_name = serializers.CharField(source='school_class.name', read_only=True, default='')
    initial_password = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user_id', 'username', 'full_name', 'email', 'student_code', 'grade', 'school_class',
            'school_class_name', 'must_change_password', 'last_login', 'initial_password', 'description', 'is_active',
            'created_by_name', 'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_initial_password(self, obj) -> str | None:
        """Chỉ có ngay sau khi tạo với mật khẩu tự sinh; mọi lần đọc sau là null."""
        return getattr(obj, 'initial_password', None)


class _AccountFieldsMixin(serializers.Serializer):
    """Trường tài khoản dùng chung cho form học sinh / giáo viên."""
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6,
                                     help_text=_("Bỏ trống khi tạo -> sinh ngẫu nhiên; khi sửa -> giữ nguyên"))

    def _user_id(self):
        return self.instance.user_id if self.instance is not None else None

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(NAME_REQUIRED)
        return value

    def validate_email(self, value):
        value = (value or '').strip()
        if services.email_taken(value, exclude_user_id=self._user_id()):
            raise serializers.ValidationError(_("Địa chỉ email này đã được sử dụng bởi một tài khoản khác."))
        return value


class StudentCreateUpdateSerializer(_AccountFieldsMixin, serializers.ModelSerializer):
    """Serializer GHI học sinh: tạo / sửa tài khoản + hồ sơ trong 1 lần."""
    username = serializers.CharField(max_length=100, required=False, allow_blank=True,
                                     help_text=_("Bỏ trống -> dùng mã học sinh (chữ thường)"))

    class Meta:
        model = StudentProfile
        fields = ['id', 'username', 'full_name', 'email', 'password', 'student_code', 'grade', 'school_class',
                  'description', 'is_active']
        read_only_fields = ['id']

    def validate_student_code(self, value):
        code = value.strip().upper()
        qs = StudentProfile.all_objects.filter(student_code=code)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(DUPLICATE_CODE % {"code": code})
        return code

    def validate(self, attrs):
        if self.instance is None:
            username = (attrs.get('username') or attrs.get('student_code', '')).strip().lower()
            if services.username_taken(username):
                raise serializers.ValidationError({'username': [_("Tên đăng nhập '%(username)s' đã tồn tại.") % {"username": username}]})
            attrs['username'] = username
        else:
            attrs.pop('username', None)  # không đổi tên đăng nhập qua form hồ sơ
        return attrs

    def create(self, validated_data):
        actor = validated_data.pop('created_by', None)
        validated_data.pop('updated_by', None)
        return services.create_student(**validated_data, actor=actor)

    def update(self, instance, validated_data):
        validated_data.pop('updated_by', None)
        return services.update_student(instance, validated_data, actor=self.context['request'].user)


class StudentImportSerializer(serializers.Serializer):
    """Nhập học sinh: file Excel (`file`) hoặc mảng dòng đã đọc (`rows`)."""
    file = serializers.FileField(required=False)
    rows = serializers.ListField(child=serializers.DictField(), required=False)
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, help_text=_("Khối mặc định khi file không có cột khối"))
    school_class = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all(), required=False, allow_null=True)


class ImportCredentialSerializer(serializers.Serializer):
    student_code = serializers.CharField()
    full_name = serializers.CharField()
    username = serializers.CharField()
    initial_password = serializers.CharField(allow_null=True)


class StudentImportResultSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())
    credentials = ImportCredentialSerializer(many=True)


# ---------------------------------------------------------------------------- Giáo viên
class TeacherSerializer(serializers.ModelSerializer):
    """Serializer ĐỌC giáo viên."""
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', format=DT_FORMAT, read_only=True)
    initial_password = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)

    class Meta:
        model = TeacherProfile
        fields = [
            'id', 'user_id', 'username', 'full_name', 'email', 'employee_code', 'subject', 'last_login',
            'initial_password', 'description', 'is_active',
            'created_by_name', 'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_initial_password(self, obj) -> str | None:
        return getattr(obj, 'initial_password', None)


class TeacherCreateUpdateSerializer(_AccountFieldsMixin, serializers.ModelSerializer):
    """Serializer GHI giáo viên."""
    username = serializers.CharField(max_length=100, required=False)

    class Meta:
        model = TeacherProfile
        fields = ['id', 'username', 'full_name', 'email', 'password', 'employee_code', 'subject', 'description',
                  'is_active']
        read_only_fields = ['id']

    def validate_employee_code(self, value):
        code = (value or '').strip().upper() or None
        if code:
            qs = TeacherProfile.all_objects.filter(employee_code=code)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(DUPLICATE_CODE % {"code": code})
        return code

    def validate(self, attrs):
        if self.instance is None:
            username = (attrs.get('username') or '').strip().lower()
            if not username:
                raise serializers.ValidationError({'username': [_("Vui lòng nhập tên đăng nhập.")]})
            if services.username_taken(username):
                raise serializers.ValidationError({'username': [_("Tên đăng nhập '%(username)s' đã tồn tại.") % {"username": username}]})
            attrs['username'] = username
        else:
            attrs.pop('username', None)
        return attrs

    def create(self, validated_data):
        actor = validated_data.pop('created_by', None)
        validated_data.pop('updated_by', None)
        return services.create_teacher(**validated_data, actor=actor)

    def update(self, instance, validated_data):
        validated_data.pop('updated_by', None)
        return services.update_teacher(instance, validated_data, actor=self.context['request'].user)
