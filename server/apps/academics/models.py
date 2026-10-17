import pghistory
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel

GRADE_VALIDATORS = [MinValueValidator(6), MaxValueValidator(9)]


class Grade(models.IntegerChoices):
    """Khối lớp THCS."""
    G6 = 6, _("Khối 6")
    G7 = 7, _("Khối 7")
    G8 = 8, _("Khối 8")
    G9 = 9, _("Khối 9")


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class SchoolClass(AuditModel):
    """1.1 Lớp học (bảng Classes theo DBML)."""
    code = models.CharField(max_length=50, unique=True, verbose_name=_("Mã lớp"))
    name = models.CharField(max_length=100, verbose_name=_("Tên lớp"))
    grade = models.PositiveSmallIntegerField(choices=Grade.choices, validators=GRADE_VALIDATORS, verbose_name=_("Khối"))
    academic_year = models.CharField(max_length=20, verbose_name=_("Năm học"))
    homeroom_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='homeroom_classes', verbose_name=_("Giáo viên chủ nhiệm"),
    )

    class Meta:
        db_table = "Classes"
        verbose_name = _("lớp học")
        verbose_name_plural = _("Danh sách lớp học")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['grade']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['name', 'academic_year'], name='uniq_class_name_year'),
        ]

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class StudentProfile(AuditModel):
    """1.2 Hồ sơ học sinh — 1-1 với tài khoản có vai trò STUDENT (bảng StudentProfiles)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile',
        verbose_name=_("Tài khoản"),
    )
    student_code = models.CharField(max_length=30, unique=True, verbose_name=_("Mã học sinh"))
    grade = models.PositiveSmallIntegerField(choices=Grade.choices, validators=GRADE_VALIDATORS, verbose_name=_("Khối"))
    school_class = models.ForeignKey(
        SchoolClass, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='students', verbose_name=_("Lớp"),
    )

    class Meta:
        db_table = "StudentProfiles"
        verbose_name = _("học sinh")
        verbose_name_plural = _("Danh sách học sinh")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['grade']),
            models.Index(fields=['school_class']),
        ]

    def save(self, *args, **kwargs):
        if self.student_code:
            self.student_code = self.student_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_code} - {self.user.full_name}"


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class TeacherProfile(AuditModel):
    """1.3 Hồ sơ giáo viên — 1-1 với tài khoản có vai trò TEACHER (bảng TeacherProfiles)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teacher_profile',
        verbose_name=_("Tài khoản"),
    )
    employee_code = models.CharField(max_length=30, unique=True, null=True, blank=True, verbose_name=_("Mã giáo viên"))
    subject = models.CharField(max_length=100, null=True, blank=True, verbose_name=_("Bộ môn"))

    class Meta:
        db_table = "TeacherProfiles"
        verbose_name = _("giáo viên")
        verbose_name_plural = _("Danh sách giáo viên")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id'])]

    def __str__(self):
        return self.user.full_name or self.user.username
