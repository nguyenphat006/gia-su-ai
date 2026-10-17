"""
Báo cáo học tập cho giáo viên (phân hệ REPORT). Chỉ đọc. Lọc chung: date_from, date_to, grade, school_class.
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from apps.academics.models import StudentProfile
from apps.arena.models import ArenaMatch
from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission, ModulePermissionChecker
from apps.core.responses import success_response
from apps.core.viewsets import BaseERPViewSet
from apps.gamification import services as gamification
from apps.revision.models import QuizAttempt
from apps.tutor.models import ChatMessage

from . import reports
from .models import LearningEvent

TAG = "Báo cáo học tập"
REPORT_PERMISSIONS = [permissions.IsAuthenticated, ModulePermissionChecker]
SCOPE_PARAMS = [
    OpenApiParameter('date_from', str, description='YYYY-MM-DD'), OpenApiParameter('date_to', str, description='YYYY-MM-DD'),
    OpenApiParameter('grade', int), OpenApiParameter('school_class', int),
]
DT = "%d/%m/%Y %H:%M"


# ------------------------------------------------------------------------------------------- serializers
class DailyPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    active_students = serializers.IntegerField()
    events = serializers.IntegerField()


class OverviewSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    chat_questions = serializers.IntegerField()
    quiz_attempts = serializers.IntegerField()
    arena_matches = serializers.IntegerField()
    flashcard_views = serializers.IntegerField()
    mindmap_views = serializers.IntegerField()
    quiz_accuracy = serializers.IntegerField(allow_null=True)
    daily = DailyPointSerializer(many=True)


class HeatmapCellSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(help_text='1 = Thứ Hai ... 7 = Chủ nhật')
    hour = serializers.IntegerField()
    count = serializers.IntegerField()


class LeaderRowSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    student_code = serializers.CharField(allow_null=True)
    class_name = serializers.CharField(allow_null=True)
    xp = serializers.IntegerField()


class StudentReportSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(source='user.full_name')
    username = serializers.CharField(source='user.username')
    school_class_name = serializers.CharField(source='school_class.name', default='')
    chat_count = serializers.IntegerField()
    quiz_count = serializers.IntegerField()
    arena_count = serializers.IntegerField()
    flashcard_count = serializers.IntegerField()
    mindmap_count = serializers.IntegerField()
    total_xp = serializers.IntegerField(allow_null=True)
    current_streak = serializers.IntegerField(allow_null=True)
    last_active_at = serializers.DateTimeField(format=DT, allow_null=True)
    level_title = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ['id', 'user_id', 'student_code', 'full_name', 'username', 'grade', 'school_class', 'school_class_name',
                  'chat_count', 'quiz_count', 'arena_count', 'flashcard_count', 'mindmap_count', 'total_xp',
                  'current_streak', 'last_active_at', 'level_title', 'is_active']
        read_only_fields = fields

    def get_level_title(self, obj) -> str:
        return gamification.level_info(obj.total_xp or 0)['title']


class StudentStatsDetailSerializer(serializers.Serializer):
    total_xp = serializers.IntegerField()
    weekly_xp = serializers.IntegerField()
    points = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    level_title = serializers.CharField()
    quiz_accuracy = serializers.IntegerField(allow_null=True)
    arena_wins = serializers.IntegerField()
    arena_matches = serializers.IntegerField()


class LearningEventSerializer(serializers.ModelSerializer):
    occurred_at = serializers.DateTimeField(format=DT)

    class Meta:
        model = LearningEvent
        fields = ['id', 'event_type', 'source_type', 'source_id', 'metadata', 'occurred_at']


class ChatPairSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='session.user_id')
    student_name = serializers.CharField(source='session.user.full_name')
    class_name = serializers.SerializerMethodField()
    session_id = serializers.IntegerField()
    question = serializers.CharField(source='content')
    answer = serializers.CharField(source='reply_content', allow_null=True)
    answer_role = serializers.CharField(source='reply_role', allow_null=True)
    created_at = serializers.DateTimeField(format=DT)

    class Meta:
        model = ChatMessage
        fields = ['id', 'user_id', 'student_name', 'class_name', 'session_id', 'question', 'answer', 'answer_role',
                  'is_blocked', 'block_reason', 'created_at']

    def get_class_name(self, obj) -> str | None:
        profile = getattr(obj.session.user, 'student_profile', None)
        return profile.school_class.name if profile and profile.school_class_id else None


class ArenaParticipantRowSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    score = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    is_winner = serializers.BooleanField()


class ArenaMatchReportSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format=DT)
    ended_at = serializers.DateTimeField(format=DT, allow_null=True)

    class Meta:
        model = ArenaMatch
        fields = ['id', 'mode', 'topic', 'grade', 'status', 'total_questions', 'participants', 'created_at', 'ended_at']

    def get_participants(self, obj) -> list[dict]:
        return ArenaParticipantRowSerializer(reports.arena_participant_rows(obj), many=True).data

    def get_total_questions(self, obj) -> int:
        return len(obj.questions or [])


class ArenaMatchDetailSerializer(ArenaMatchReportSerializer):
    answers = serializers.SerializerMethodField()

    class Meta(ArenaMatchReportSerializer.Meta):
        fields = [*ArenaMatchReportSerializer.Meta.fields, 'answers', 'ai_analysis']

    def get_answers(self, obj) -> list[dict]:
        """Từng câu: đề, đáp án đúng, câu trả lời + điểm của từng người chơi."""
        players = list(obj.participants.all())
        rows = []
        for i, q in enumerate(obj.questions or []):
            row = {'index': i, 'content': q['content'], 'correct_answer': q['correct_answer'], 'players': []}
            for p in players:
                ans = next((a for a in p.answers if a['question_index'] == i), None)
                row['players'].append({'user_id': p.user_id, 'answer': ans['answer'] if ans else None,
                                       'is_correct': bool(ans and ans['is_correct']),
                                       'points': ans.get('points') if ans else None})
            rows.append(row)
        return rows


class QuizAttemptReportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='user.full_name')
    class_name = serializers.SerializerMethodField()
    accuracy = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format=DT)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'user_id', 'student_name', 'class_name', 'quiz_type', 'grade', 'topic', 'total_questions',
                  'correct_count', 'accuracy', 'xp_earned', 'answers', 'created_at']

    def get_class_name(self, obj) -> str | None:
        profile = getattr(obj.user, 'student_profile', None)
        return profile.school_class.name if profile and profile.school_class_id else None

    def get_accuracy(self, obj) -> int:
        return round(obj.correct_count * 100 / obj.total_questions) if obj.total_questions else 0


# ------------------------------------------------------------------------------------------- views
class _ReportView(APIView):
    # APIView không có `action` -> ModulePermissionChecker không suy ra được quyền; khai báo thẳng REPORT_READ
    permission_classes = [permissions.IsAuthenticated, HasPermission('REPORT_READ')]


class OverviewView(_ReportView):
    """Tổng quan hoạt động học sinh trong khoảng thời gian (mặc định 30 ngày)."""

    @extend_schema(tags=[TAG], summary="Tổng quan học tập", parameters=SCOPE_PARAMS, responses=OverviewSerializer)
    def get(self, request):
        return success_response(data=OverviewSerializer(reports.overview(request.query_params)).data)


class HeatmapView(_ReportView):
    """Giờ học tập trong tuần (thứ × giờ)."""

    @extend_schema(tags=[TAG], summary="Heatmap giờ học", parameters=SCOPE_PARAMS, responses=HeatmapCellSerializer(many=True))
    def get(self, request):
        return success_response(data=HeatmapCellSerializer(reports.heatmap(request.query_params), many=True).data)


class XpLeaderboardView(_ReportView):
    """Học sinh nhận nhiều XP nhất trong khoảng thời gian (thay báo cáo BXH tháng bản cũ)."""

    @extend_schema(tags=[TAG], summary="Bảng xếp hạng XP", parameters=[*SCOPE_PARAMS, OpenApiParameter('limit', int)],
                   responses=LeaderRowSerializer(many=True))
    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 10)), 100)
        except ValueError:
            limit = 10
        return success_response(data=LeaderRowSerializer(reports.xp_leaderboard(request.query_params, limit), many=True).data)


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="Thống kê theo học sinh", parameters=SCOPE_PARAMS),
    retrieve=extend_schema(tags=[TAG], summary="Thống kê một học sinh"),
)
class StudentReportViewSet(BaseERPViewSet):
    """Số liệu học tập từng học sinh (đếm theo khoảng thời gian nếu có date_from / date_to). Chỉ đọc + xuất Excel."""
    serializer_class = StudentReportSerializer
    permission_classes = REPORT_PERMISSIONS
    permission_module = 'REPORT'
    http_method_names = ['get', 'post']
    filterset_fields = {'is_active': ['exact']}
    search_fields = ['student_code', 'user__full_name', 'user__username']
    ordering_fields = ['student_code', 'user__full_name', 'grade', 'chat_count', 'quiz_count', 'arena_count',
                       'total_xp', 'current_streak', 'last_active_at']
    custom_action_permissions = {'timeline': 'REPORT_READ', 'summary': 'REPORT_READ'}
    excel_columns = [
        {'key': 'student_code', 'label': 'Mã học sinh', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'full_name', 'label': 'Họ và tên', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'grade', 'label': 'Khối', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'school_class_name', 'label': 'Lớp', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'chat_count', 'label': 'Câu hỏi gia sư', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'quiz_count', 'label': 'Bài ôn tập', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'arena_count', 'label': 'Trận đấu', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'total_xp', 'label': 'Tổng XP', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'current_streak', 'label': 'Chuỗi ngày học', 'type': 'number', 'default_selected': True, 'required': False},
        {'key': 'last_active_at', 'label': 'Hoạt động gần nhất', 'type': 'string', 'default_selected': True, 'required': False},
    ]

    def get_queryset(self):
        return reports.student_profiles(self.request.query_params).order_by('-last_active_at', 'id')

    def create(self, request, *args, **kwargs):
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed('POST')

    @extend_schema(tags=[TAG], summary="Chỉ số tổng hợp của một học sinh", responses=StudentStatsDetailSerializer)
    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        from django.db.models import Count, Q, Sum

        from apps.arena.models import ArenaParticipant
        profile = self.get_object()
        stats = gamification.get_stats(profile.user)
        quiz = QuizAttempt.objects.filter(user=profile.user).aggregate(t=Sum('total_questions'), c=Sum('correct_count'))
        arena = ArenaParticipant.objects.filter(user=profile.user).aggregate(n=Count('id'), w=Count('id', filter=Q(is_winner=True)))
        data = {
            'total_xp': stats.total_xp, 'weekly_xp': stats.weekly_xp, 'points': stats.points,
            'current_streak': stats.current_streak, 'longest_streak': stats.longest_streak,
            'level_title': gamification.level_info(stats.total_xp)['title'],
            'quiz_accuracy': round((quiz['c'] or 0) * 100 / quiz['t']) if quiz['t'] else None,
            'arena_wins': arena['w'], 'arena_matches': arena['n'],
        }
        return success_response(data=StudentStatsDetailSerializer(data).data)

    @extend_schema(tags=[TAG], summary="Dòng thời gian hoạt động của một học sinh",
                   parameters=[OpenApiParameter('event_type', str)], responses=LearningEventSerializer(many=True))
    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        profile = self.get_object()
        qs = LearningEvent.objects.filter(user=profile.user).order_by('-occurred_at', '-id')
        if request.query_params.get('event_type'):
            qs = qs.filter(event_type=request.query_params['event_type'])
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(LearningEventSerializer(page, many=True).data)


class _ReadOnlyReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = REPORT_PERMISSIONS
    permission_module = 'REPORT'
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return success_response(data=response.data)


@extend_schema_view(list=extend_schema(tags=[TAG], summary="Nhật ký hỏi đáp gia sư AI", parameters=[
    *SCOPE_PARAMS, OpenApiParameter('user', int), OpenApiParameter('q', str), OpenApiParameter('blocked', bool)]),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết một lượt hỏi đáp"))
class ChatLogViewSet(_ReadOnlyReportViewSet):
    """Câu hỏi của học sinh kèm câu trả lời ngay sau đó (để giáo viên theo dõi chất lượng gia sư AI)."""
    serializer_class = ChatPairSerializer

    def get_queryset(self):
        return reports.chat_pairs(self.request.query_params)


@extend_schema_view(list=extend_schema(tags=[TAG], summary="Lịch sử trận đấu", parameters=[
    *SCOPE_PARAMS, OpenApiParameter('user', int), OpenApiParameter('mode', str, enum=['PVP', 'AI'])]),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết trận đấu (từng câu)"))
class ArenaReportViewSet(_ReadOnlyReportViewSet):
    def get_serializer_class(self):
        return ArenaMatchDetailSerializer if self.action == 'retrieve' else ArenaMatchReportSerializer

    def get_queryset(self):
        return reports.arena_matches(self.request.query_params)


@extend_schema_view(list=extend_schema(tags=[TAG], summary="Lịch sử ôn tập", parameters=[
    *SCOPE_PARAMS, OpenApiParameter('user', int), OpenApiParameter('quiz_type', str)]),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết lượt ôn tập"))
class QuizReportViewSet(_ReadOnlyReportViewSet):
    serializer_class = QuizAttemptReportSerializer

    def get_queryset(self):
        return reports.quiz_attempts(self.request.query_params)
