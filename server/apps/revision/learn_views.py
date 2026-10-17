"""
API ôn tập phía học sinh (quyền LEARN_USE). Mọi chấm điểm ở server; đề không lộ đáp án trước khi trả lời.
"""
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from apps.academics.models import Grade
from apps.core.permissions import HasPermission
from apps.core.responses import success_response

from . import practice
from .models import Difficulty, QuestionType, QuizAttempt

TAG = "Học sinh - Ôn tập"
LEARN_PERMISSIONS = [permissions.IsAuthenticated, HasPermission('LEARN_USE')]
HISTORY_LIMIT = 20


class QuizStartSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    topic = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    count = serializers.IntegerField(min_value=1, max_value=practice.MAX_QUESTIONS, default=10)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.MULTIPLE_CHOICE)
    difficulties = serializers.ListField(child=serializers.ChoiceField(choices=Difficulty.choices), required=False, default=list)


class PublicQuestionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    content = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField(), allow_null=True)
    question_type = serializers.CharField()
    difficulty = serializers.CharField()
    topic = serializers.CharField()
    hint = serializers.CharField(allow_blank=True)


class CheckAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.CharField(required=False, allow_blank=True, default='', max_length=5000)
    image = serializers.ImageField(required=False, help_text=_("Ảnh bài làm tự luận"))


class CheckAnswerResultSerializer(serializers.Serializer):
    is_correct = serializers.BooleanField()
    correct_answer = serializers.CharField()
    explanation = serializers.CharField(allow_blank=True)
    score = serializers.IntegerField()
    feedback = serializers.CharField(allow_blank=True)


class AnswerItemSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.CharField(required=False, allow_blank=True, default='')


class QuizSubmitSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    topic = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    answers = AnswerItemSerializer(many=True)


class FlashcardAnswerSerializer(serializers.Serializer):
    card_index = serializers.IntegerField(min_value=0)
    answer = serializers.CharField(required=False, allow_blank=True, default='')


class FlashcardQuizSubmitSerializer(serializers.Serializer):
    deck_id = serializers.IntegerField()
    answers = FlashcardAnswerSerializer(many=True)


class QuizResultSerializer(serializers.Serializer):
    attempt_id = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    xp_earned = serializers.IntegerField()
    completed_challenges = serializers.ListField(child=serializers.CharField())
    results = serializers.ListField(child=serializers.DictField())


class TopicRequestSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    topic = serializers.CharField(max_length=255)


class LearnFlashcardDeckSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    topic = serializers.CharField()
    grade = serializers.IntegerField(allow_null=True)
    cards = serializers.ListField(child=serializers.DictField())


class LearnMindmapSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    topic = serializers.CharField()
    grade = serializers.IntegerField(allow_null=True)
    nodes = serializers.ListField(child=serializers.DictField())


class QuizAttemptHistorySerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M")

    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz_type', 'grade', 'topic', 'total_questions', 'correct_count', 'xp_earned', 'created_at']


def _student_grade(user, requested):
    if requested:
        return requested
    profile = getattr(user, 'student_profile', None)
    return profile.grade if profile else None


class QuizStartView(APIView):
    """Lấy đề ôn tập (ngân hàng trước, AI bù). Không kèm đáp án."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Bắt đầu bài ôn tập", request=QuizStartSerializer,
                   responses=PublicQuestionSerializer(many=True))
    def post(self, request):
        p = QuizStartSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        d = p.validated_data
        questions = practice.pick_questions(request.user, grade=_student_grade(request.user, d.get('grade')),
                                            topic=d['topic'], count=d['count'], question_type=d['question_type'],
                                            difficulties=d['difficulties'])
        return success_response(data=PublicQuestionSerializer([practice.public_question(q) for q in questions], many=True).data)


class CheckAnswerView(APIView):
    """Chấm 1 câu ngay khi trả lời (tự luận: AI chấm, có thể gửi ảnh bài làm)."""
    permission_classes = LEARN_PERMISSIONS
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(tags=[TAG], summary="Chấm một câu trả lời",
                   request={'application/json': CheckAnswerSerializer, 'multipart/form-data': CheckAnswerSerializer},
                   responses=CheckAnswerResultSerializer)
    def post(self, request):
        p = CheckAnswerSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        image_file = p.validated_data.get('image')
        image = {'data': image_file.read(), 'mime_type': image_file.content_type} if image_file else None
        result = practice.check_answer(request.user, p.validated_data['question_id'], p.validated_data['answer'], image)
        return success_response(data=CheckAnswerResultSerializer(result).data)


class QuizSubmitView(APIView):
    """Nộp bài: server chấm lại, lưu lịch sử, cộng XP (10 / câu đúng), tính thử thách."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Nộp bài ôn tập", request=QuizSubmitSerializer, responses=QuizResultSerializer)
    def post(self, request):
        p = QuizSubmitSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        d = p.validated_data
        result = practice.submit_quiz(request.user, grade=_student_grade(request.user, d.get('grade')),
                                      topic=d['topic'], answers=d['answers'])
        return success_response(data=QuizResultSerializer(result).data, status_code=status.HTTP_201_CREATED)


class FlashcardQuizSubmitView(APIView):
    """Nộp bài kiểm tra flashcard (chọn mặt sau đúng cho từng thẻ)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Nộp bài kiểm tra flashcard", request=FlashcardQuizSubmitSerializer,
                   responses=QuizResultSerializer)
    def post(self, request):
        p = FlashcardQuizSubmitSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        result = practice.submit_flashcard_quiz(request.user, deck_id=p.validated_data['deck_id'],
                                                answers=p.validated_data['answers'])
        return success_response(data=QuizResultSerializer(result).data, status_code=status.HTTP_201_CREATED)


class LearnFlashcardsView(APIView):
    """Bộ flashcard theo chủ đề (có sẵn hoặc AI tạo mới và lưu lại)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Lấy bộ flashcard theo chủ đề", request=TopicRequestSerializer,
                   responses=LearnFlashcardDeckSerializer)
    def post(self, request):
        p = TopicRequestSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        deck = practice.get_flashcards(request.user, grade=_student_grade(request.user, p.validated_data.get('grade')),
                                       topic=p.validated_data['topic'])
        return success_response(data=LearnFlashcardDeckSerializer(deck).data)


class LearnMindmapView(APIView):
    """Sơ đồ tư duy theo chủ đề (có sẵn hoặc AI tạo mới và lưu lại)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Lấy sơ đồ tư duy theo chủ đề", request=TopicRequestSerializer,
                   responses=LearnMindmapSerializer)
    def post(self, request):
        p = TopicRequestSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        mindmap = practice.get_mindmap(request.user, grade=_student_grade(request.user, p.validated_data.get('grade')),
                                       topic=p.validated_data['topic'])
        return success_response(data=LearnMindmapSerializer(mindmap).data)


class LearnTopicsView(APIView):
    """Chủ đề đang có câu hỏi trong ngân hàng (gợi ý cho ô chọn chủ đề)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Chủ đề gợi ý", parameters=[OpenApiParameter('grade', int)],
                   responses=serializers.ListSerializer(child=serializers.CharField()))
    def get(self, request):
        grade = request.query_params.get('grade')
        grade = int(grade) if grade and grade.isdigit() else _student_grade(request.user, None)
        return success_response(data=practice.available_topics(grade))


class QuizHistoryView(APIView):
    """20 lượt ôn tập gần nhất của tôi."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Lịch sử ôn tập của tôi", responses=QuizAttemptHistorySerializer(many=True))
    def get(self, request):
        rows = QuizAttempt.objects.filter(user=request.user).order_by('-created_at')[:HISTORY_LIMIT]
        return success_response(data=QuizAttemptHistorySerializer(rows, many=True).data)
