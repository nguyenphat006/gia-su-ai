import pghistory
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.academics.models import GRADE_VALIDATORS, Grade, SchoolClass
from apps.core.models import AuditModel


class QuestionType(models.TextChoices):
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', _("Trắc nghiệm")
    ESSAY = 'ESSAY', _("Tự luận")


class Difficulty(models.TextChoices):
    NHAN_BIET = 'NHAN_BIET', _("Nhận biết")
    THONG_HIEU = 'THONG_HIEU', _("Thông hiểu")
    VAN_DUNG = 'VAN_DUNG', _("Vận dụng")


class QuestionStatus(models.TextChoices):
    PENDING = 'PENDING', _("Chờ duyệt")
    APPROVED = 'APPROVED', _("Đã duyệt")
    REJECTED = 'REJECTED', _("Từ chối")


class Origin(models.TextChoices):
    MANUAL = 'MANUAL', _("Nhập tay")
    AI = 'AI', _("AI sinh")
    DOCUMENT = 'DOCUMENT', _("Từ tài liệu")


class QuizType(models.TextChoices):
    CHINH_PHUC = 'CHINH_PHUC', _("Chinh phục kiến thức")
    FLASHCARD_QUIZ = 'FLASHCARD_QUIZ', _("Kiểm tra flashcard")


class _GradeTopicModel(AuditModel):
    """Khung chung: nội dung ôn tập gắn khối / lớp / chủ đề."""
    grade = models.PositiveSmallIntegerField(choices=Grade.choices, validators=GRADE_VALIDATORS, null=True, blank=True,
                                             verbose_name=_("Khối"))
    school_class = models.ForeignKey(SchoolClass, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='%(class)s_items', verbose_name=_("Lớp (riêng)"))
    topic = models.CharField(max_length=255, verbose_name=_("Chủ đề"))

    class Meta:
        abstract = True


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class Question(_GradeTopicModel):
    """4.1 Ngân hàng câu hỏi (bảng Questions)."""
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.MULTIPLE_CHOICE,
                                     verbose_name=_("Loại câu hỏi"))
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.NHAN_BIET,
                                  verbose_name=_("Mức độ"))
    content = models.TextField(verbose_name=_("Nội dung câu hỏi"))
    options = models.JSONField(null=True, blank=True, verbose_name=_("Phương án"))
    correct_answer = models.TextField(verbose_name=_("Đáp án"))
    explanation = models.TextField(null=True, blank=True, verbose_name=_("Giải thích"))
    hint = models.TextField(null=True, blank=True, verbose_name=_("Gợi ý"))
    status = models.CharField(max_length=20, choices=QuestionStatus.choices, default=QuestionStatus.APPROVED,
                              verbose_name=_("Trạng thái duyệt"))
    origin = models.CharField(max_length=20, choices=Origin.choices, default=Origin.MANUAL, verbose_name=_("Nguồn"))
    source_document = models.ForeignKey('knowledge.SourceDocument', on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='questions', verbose_name=_("Tài liệu nguồn"))

    class Meta:
        db_table = "Questions"
        verbose_name = _("câu hỏi")
        verbose_name_plural = _("Ngân hàng câu hỏi")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['grade', 'topic']),
            models.Index(fields=['status', 'is_active']),
        ]

    def __str__(self):
        return self.content[:80]


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class FlashcardDeck(_GradeTopicModel):
    """4.2 Bộ flashcard (bảng FlashcardDecks). cards = [{front, back}]."""
    title = models.CharField(max_length=255, verbose_name=_("Tên bộ thẻ"))
    cards = models.JSONField(default=list, verbose_name=_("Danh sách thẻ"))
    origin = models.CharField(max_length=20, choices=Origin.choices, default=Origin.MANUAL, verbose_name=_("Nguồn"))

    class Meta:
        db_table = "FlashcardDecks"
        verbose_name = _("bộ flashcard")
        verbose_name_plural = _("Danh sách bộ flashcard")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['grade', 'topic'])]

    def __str__(self):
        return self.title


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class Mindmap(_GradeTopicModel):
    """4.3 Sơ đồ tư duy (bảng Mindmaps). nodes = [{id, label, parentId}], parentId null là gốc."""
    title = models.CharField(max_length=255, verbose_name=_("Tên sơ đồ"))
    nodes = models.JSONField(default=list, verbose_name=_("Các nút"))
    origin = models.CharField(max_length=20, choices=Origin.choices, default=Origin.MANUAL, verbose_name=_("Nguồn"))

    class Meta:
        db_table = "Mindmaps"
        verbose_name = _("sơ đồ tư duy")
        verbose_name_plural = _("Danh sách sơ đồ tư duy")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['grade', 'topic'])]

    def __str__(self):
        return self.title


class QuizAttempt(AuditModel):
    """4.4 Lượt làm bài ôn tập của học sinh (bảng QuizAttempts)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts',
                             verbose_name=_("Học sinh"))
    quiz_type = models.CharField(max_length=20, choices=QuizType.choices, default=QuizType.CHINH_PHUC,
                                 verbose_name=_("Loại bài"))
    grade = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_("Khối"))
    topic = models.CharField(max_length=255, null=True, blank=True, verbose_name=_("Chủ đề"))
    total_questions = models.PositiveIntegerField(verbose_name=_("Số câu"))
    correct_count = models.PositiveIntegerField(verbose_name=_("Số câu đúng"))
    xp_earned = models.IntegerField(default=0, verbose_name=_("XP nhận được"))
    answers = models.JSONField(null=True, blank=True, verbose_name=_("Chi tiết bài làm"))

    class Meta:
        db_table = "QuizAttempts"
        verbose_name = _("lượt làm bài")
        verbose_name_plural = _("Lịch sử làm bài")
        ordering = ['-created_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f"{self.user_id} {self.correct_count}/{self.total_questions}"
