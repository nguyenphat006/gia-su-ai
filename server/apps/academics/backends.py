"""
Đăng nhập bằng mã học sinh hoặc email (ngoài tên đăng nhập) — giữ hành vi của bản cũ.

SimpleJWT gọi `authenticate(username=<chuỗi nhập>, password=...)`: ModelBackend thử theo username trước,
backend này thử tiếp theo mã học sinh (không phân biệt hoa thường) rồi đến email.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class StudentCodeOrEmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = (username or kwargs.get(User.USERNAME_FIELD) or '').strip()
        if not identifier or password is None:
            return None
        alive = User.objects.filter(deleted_at__isnull=True)
        user = alive.filter(student_profile__student_code__iexact=identifier).first()
        if user is None and '@' in identifier:
            user = alive.filter(email__iexact=identifier).first()
        if user is None:
            User().set_password(password)  # cân bằng thời gian phản hồi như ModelBackend
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
