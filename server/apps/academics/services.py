"""
Nghiệp vụ tài khoản học sinh / giáo viên: tạo tài khoản + hồ sơ + vai trò trong 1 giao dịch.

Mật khẩu ban đầu: người tạo nhập, hoặc bỏ trống -> sinh ngẫu nhiên và trả về MỘT lần duy nhất trong response
(`initial_password`) để giáo viên phát cho học sinh. Không có mật khẩu mặc định chung. Tài khoản mới luôn
`must_change_password = True`.
"""
import re
import secrets
import string
import unicodedata

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

from .models import SchoolClass, StudentProfile, TeacherProfile

User = get_user_model()

PASSWORD_ALPHABET = string.ascii_letters + string.digits
MAX_IMPORT_ROWS = 1000


def generate_password(length: int = 8) -> str:
    """Mật khẩu ngẫu nhiên dễ đọc: luôn có chữ hoa, chữ thường và chữ số."""
    while True:
        pwd = ''.join(secrets.choice(PASSWORD_ALPHABET) for _ in range(length))
        if any(c.islower() for c in pwd) and any(c.isupper() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd


def slugify_username(text: str) -> str:
    """'Nguyễn Văn An' -> 'nguyenvanan' (bỏ dấu, chỉ giữ a-z0-9)."""
    text = text.replace('đ', 'd').replace('Đ', 'D')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', text.lower())


def username_taken(username: str, exclude_user_id=None) -> bool:
    qs = User.objects.filter(username__iexact=username)  # tính cả tài khoản đã xóa mềm (cột unique)
    if exclude_user_id:
        qs = qs.exclude(pk=exclude_user_id)
    return qs.exists()


def email_taken(email: str, exclude_user_id=None) -> bool:
    if not email:
        return False
    qs = User.objects.filter(email__iexact=email, deleted_at__isnull=True)
    if exclude_user_id:
        qs = qs.exclude(pk=exclude_user_id)
    return qs.exists()


def _role(code: str) -> Role:
    role = Role.objects.filter(role_code=code).first()
    if role is None:
        raise ValidationError({'detail': [_("Chưa có vai trò %(role)s. Chạy `python manage.py seed_core`.") % {"role": code}]})
    return role


def _create_user(*, username, full_name, email, password, actor, role_code):
    initial_password = password or generate_password()
    user = User(username=username, full_name=full_name, email=email or '', is_active=True, must_change_password=True)
    user.set_password(initial_password)
    user.save()
    user.roles.add(_role(role_code))
    return user, (None if password else initial_password)


def _update_user(user, *, full_name=None, email=None, password=None, is_active=None, actor=None):
    fields = []
    if full_name is not None:
        user.full_name = full_name
        fields.append('full_name')
    if email is not None:
        user.email = email
        fields.append('email')
    if is_active is not None:
        user.is_active = is_active
        fields.append('is_active')
    if password:
        user.set_password(password)
        user.must_change_password = bool(actor and actor.pk != user.pk)
        fields += ['password', 'must_change_password']
    if fields:
        user.save(update_fields=[*fields, 'updated_at'])


@transaction.atomic
def create_student(*, full_name, student_code, grade, school_class=None, username=None, email='', password=None,
                   description=None, is_active=True, actor=None) -> StudentProfile:
    username = (username or student_code).strip().lower()
    user, initial_password = _create_user(
        username=username, full_name=full_name, email=email, password=password, actor=actor, role_code='STUDENT',
    )
    if not is_active:
        user.is_active = False
        user.save(update_fields=['is_active'])
    profile = StudentProfile.objects.create(
        user=user, student_code=student_code, grade=grade, school_class=school_class, description=description,
        is_active=is_active, created_by=actor, updated_by=actor,
    )
    profile.initial_password = initial_password
    return profile


@transaction.atomic
def update_student(profile: StudentProfile, data: dict, actor=None) -> StudentProfile:
    _update_user(
        profile.user, full_name=data.get('full_name'), email=data.get('email'), password=data.get('password'),
        is_active=data.get('is_active'), actor=actor,
    )
    for field in ('student_code', 'grade', 'school_class', 'description', 'is_active'):
        if field in data:
            setattr(profile, field, data[field])
    profile.updated_by = actor
    profile.save()
    invalidate_user_permissions(profile.user_id)
    return profile


@transaction.atomic
def create_teacher(*, full_name, username, email='', password=None, employee_code=None, subject=None,
                   description=None, is_active=True, actor=None) -> TeacherProfile:
    user, initial_password = _create_user(
        username=username.strip().lower(), full_name=full_name, email=email, password=password, actor=actor,
        role_code='TEACHER',
    )
    if not is_active:
        user.is_active = False
        user.save(update_fields=['is_active'])
    profile = TeacherProfile.objects.create(
        user=user, employee_code=employee_code or None, subject=subject, description=description,
        is_active=is_active, created_by=actor, updated_by=actor,
    )
    profile.initial_password = initial_password
    return profile


@transaction.atomic
def update_teacher(profile: TeacherProfile, data: dict, actor=None) -> TeacherProfile:
    _update_user(
        profile.user, full_name=data.get('full_name'), email=data.get('email'), password=data.get('password'),
        is_active=data.get('is_active'), actor=actor,
    )
    for field in ('employee_code', 'subject', 'description', 'is_active'):
        if field in data:
            setattr(profile, field, data[field] or None if field == 'employee_code' else data[field])
    profile.updated_by = actor
    profile.save()
    invalidate_user_permissions(profile.user_id)
    return profile


def deactivate_profile_users(profiles, *, is_active: bool):
    """Đồng bộ trạng thái tài khoản theo hồ sơ (khóa hồ sơ = khóa đăng nhập)."""
    User.objects.filter(pk__in=[p.user_id for p in profiles]).update(is_active=is_active, updated_at=timezone.now())


def soft_delete_profile(profile, actor=None):
    """Xóa mềm hồ sơ kèm tài khoản (không còn đăng nhập được)."""
    profile.soft_delete(user=actor)
    user = profile.user
    user.is_active = False
    user.deleted_at = timezone.now()
    user.save(update_fields=['is_active', 'deleted_at', 'updated_at'])
    invalidate_user_permissions(user.pk)


# ------------------------------------------------------------------ nhập Excel học sinh
IMPORT_COLUMNS = {
    'full_name': ('full_name', 'Họ và tên', 'Ho va ten', 'displayName'),
    'student_code': ('student_code', 'Mã học sinh', 'Ma hoc sinh', 'studentCode'),
    'grade': ('grade', 'Khối', 'Khoi', 'Khoi lop', 'Khối lớp'),
    'class_code': ('class_code', 'Mã lớp', 'Ma lop'),
    'username': ('username', 'Tên đăng nhập', 'Ten dang nhap'),
    'email': ('email', 'Email'),
    'password': ('password', 'Mật khẩu', 'Mat khau'),
}


def _cell(row: dict, field: str) -> str:
    for key in IMPORT_COLUMNS[field]:
        value = row.get(key)
        if value not in (None, ''):
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            return str(value).strip()
    return ''


def _next_student_code(used: set) -> str:
    """Mã tự sinh khi file không có cột mã: HS + 6 số, không trùng DB / trong file."""
    while True:
        code = f"HS{secrets.randbelow(900000) + 100000}"
        if code not in used and not StudentProfile.all_objects.filter(student_code=code).exists():
            used.add(code)
            return code


def import_students(rows: list, *, default_grade=None, default_class=None, actor=None) -> dict:
    """
    Nhập danh sách học sinh. Cột nhận cả tên tiếng Anh lẫn tiếng Việt (có / không dấu) — tương thích file mẫu bản cũ.
    Chỉ có cột họ tên vẫn nhập được: mã HS / tên đăng nhập / mật khẩu tự sinh.
    Trả về {count, errors, credentials} — credentials: tài khoản mới kèm mật khẩu ban đầu (chỉ trả 1 lần).
    """
    if not isinstance(rows, list) or not rows:
        raise ValidationError({'rows': [_("Không tìm thấy dòng dữ liệu nào để nhập.")]})
    if len(rows) > MAX_IMPORT_ROWS:
        raise ValidationError({'rows': [_("Tối đa %(max)s dòng mỗi lần nhập.") % {"max": MAX_IMPORT_ROWS}]})

    classes = {c.code: c for c in SchoolClass.objects.all()}
    errors, prepared = [], []
    seen_codes, seen_usernames = set(), set()

    for idx, row in enumerate(rows, start=2):
        full_name = _cell(row, 'full_name')
        if not full_name:
            errors.append(_("Dòng %(row)s: Thiếu 'Họ và tên'") % {"row": idx})
            continue

        grade_raw = _cell(row, 'grade') or (str(default_grade) if default_grade else '')
        grade = int(grade_raw) if grade_raw.isdigit() else None
        if grade not in (6, 7, 8, 9):
            errors.append(_("Dòng %(row)s: Khối phải là 6, 7, 8 hoặc 9") % {"row": idx})
            continue

        school_class = default_class
        class_code = _cell(row, 'class_code').upper()
        if class_code:
            school_class = classes.get(class_code)
            if school_class is None:
                errors.append(_("Dòng %(row)s: Không có lớp mã '%(code)s'") % {"row": idx, "code": class_code})
                continue

        code = _cell(row, 'student_code').upper() or _next_student_code(seen_codes)
        if code in seen_codes and _cell(row, 'student_code'):
            errors.append(_("Dòng %(row)s: Mã học sinh '%(code)s' bị trùng trong file") % {"row": idx, "code": code})
            continue
        seen_codes.add(code)
        if StudentProfile.all_objects.filter(student_code=code).exists():
            errors.append(_("Dòng %(row)s: Mã học sinh '%(code)s' đã tồn tại") % {"row": idx, "code": code})
            continue

        username = (_cell(row, 'username') or code).lower()
        if username in seen_usernames or username_taken(username):
            errors.append(_("Dòng %(row)s: Tên đăng nhập '%(username)s' đã tồn tại") % {"row": idx, "username": username})
            continue
        seen_usernames.add(username)

        email = _cell(row, 'email')
        if email_taken(email):
            errors.append(_("Dòng %(row)s: Email '%(email)s' đã được dùng") % {"row": idx, "email": email})
            continue

        password = _cell(row, 'password')
        if password and len(password) < 6:
            errors.append(_("Dòng %(row)s: Mật khẩu tối thiểu 6 ký tự") % {"row": idx})
            continue

        prepared.append(dict(full_name=full_name, student_code=code, grade=grade, school_class=school_class,
                             username=username, email=email, password=password or None))

    if not prepared:
        raise ValidationError({'rows': errors or [_("Không thể nhập dữ liệu. Tất cả các dòng đều chứa lỗi!")]})

    credentials = []
    with transaction.atomic():
        for item in prepared:
            profile = create_student(**item, actor=actor)
            credentials.append({
                'student_code': profile.student_code,
                'full_name': profile.user.full_name,
                'username': profile.user.username,
                'initial_password': profile.initial_password,  # None = người nhập đã tự đặt trong file
            })
    return {'count': len(prepared), 'errors': errors, 'credentials': credentials}
