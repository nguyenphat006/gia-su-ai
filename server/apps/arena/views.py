"""
API đấu trường phía học sinh (quyền LEARN_USE). Đấu AI chạy hoàn toàn qua REST; PvP qua WebSocket (consumers.py),
REST dùng chung cho kết quả / lịch sử / thống kê / nhận xét AI.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.views import APIView

from apps.academics.models import Grade
from apps.core.exceptions import BusinessError
from apps.core.permissions import HasPermission
from apps.core.responses import success_response
from apps.revision.models import Difficulty

from . import services
from .models import ArenaMatch, ArenaParticipant, MatchMode, MatchStatus

User = get_user_model()
TAG = "Học sinh - Đấu trường"
LEARN_PERMISSIONS = [permissions.IsAuthenticated, HasPermission('LEARN_USE')]
HISTORY_LIMIT = 20


class AiMatchStartSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    count = serializers.IntegerField(min_value=1, max_value=20, default=services.DEFAULT_COUNT)
    difficulties = serializers.ListField(child=serializers.ChoiceField(choices=Difficulty.choices), required=False, default=list)


class ArenaQuestionSerializer(serializers.Serializer):
    index = serializers.IntegerField()
    content = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())
    hint = serializers.CharField(allow_blank=True)
    difficulty = serializers.CharField()


class MatchStartedSerializer(serializers.Serializer):
    match_id = serializers.IntegerField()
    topic = serializers.CharField()
    seconds_per_question = serializers.IntegerField()
    questions = ArenaQuestionSerializer(many=True)


class ArenaAnswerSerializer(serializers.Serializer):
    question_index = serializers.IntegerField(min_value=0)
    answer = serializers.CharField(required=False, allow_blank=True, default='', help_text=_("Bỏ trống khi hết giờ"))


class AnswerResultSerializer(serializers.Serializer):
    question_index = serializers.IntegerField()
    is_correct = serializers.BooleanField()
    correct_answer = serializers.CharField()
    explanation = serializers.CharField(allow_blank=True)
    time_left = serializers.IntegerField()
    points = serializers.IntegerField(allow_null=True)


class OpponentMoveSerializer(serializers.Serializer):
    question_index = serializers.IntegerField()
    is_correct = serializers.BooleanField()
    time_left = serializers.IntegerField()
    points = serializers.IntegerField()


class AiAnswerOutcomeSerializer(serializers.Serializer):
    result = AnswerResultSerializer()
    opponent_move = OpponentMoveSerializer()
    done = serializers.BooleanField()
    my_score = serializers.IntegerField()
    opponent_score = serializers.IntegerField()


class ParticipantResultSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    score = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    is_winner = serializers.BooleanField()
    xp_earned = serializers.IntegerField()
    is_me = serializers.BooleanField()


class MatchResultSerializer(serializers.Serializer):
    match_id = serializers.IntegerField()
    mode = serializers.CharField()
    topic = serializers.CharField()
    status = serializers.CharField()
    total_questions = serializers.IntegerField()
    participants = ParticipantResultSerializer(many=True)


class AnalysisSerializer(serializers.Serializer):
    score = serializers.FloatField(allow_null=True)
    analysis = serializers.CharField()
    advice = serializers.CharField()


class MatchHistorySerializer(serializers.Serializer):
    match_id = serializers.IntegerField()
    mode = serializers.CharField()
    topic = serializers.CharField()
    status = serializers.CharField()
    score = serializers.IntegerField()
    opponent_name = serializers.CharField()
    opponent_score = serializers.IntegerField()
    is_winner = serializers.BooleanField()
    xp_earned = serializers.IntegerField()
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M")


class ArenaStatsSerializer(serializers.Serializer):
    total_matches = serializers.IntegerField()
    wins = serializers.IntegerField()
    losses = serializers.IntegerField()
    win_rate = serializers.IntegerField()
    total_score = serializers.IntegerField()


class ArenaLeaderRowSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    total_score = serializers.IntegerField()
    wins = serializers.IntegerField()
    is_me = serializers.BooleanField()


def _grade_of(user, requested):
    if requested:
        return requested
    profile = getattr(user, 'student_profile', None)
    return profile.grade if profile else None


class AiMatchStartView(APIView):
    """Bắt đầu trận đấu với AI."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Bắt đầu đấu với AI", request=AiMatchStartSerializer, responses=MatchStartedSerializer)
    def post(self, request):
        p = AiMatchStartSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        d = p.validated_data
        match = services.create_match(mode=MatchMode.AI, users=[request.user], topic=d['topic'],
                                      grade=_grade_of(request.user, d.get('grade')), count=d['count'],
                                      difficulties=d['difficulties'])
        data = {'match_id': match.id, 'topic': match.topic, 'seconds_per_question': services.SECONDS_PER_QUESTION,
                'questions': services.public_questions(match)}
        return success_response(data=MatchStartedSerializer(data).data, status_code=status.HTTP_201_CREATED)


class AiMatchAnswerView(APIView):
    """Trả lời 1 câu khi đấu AI — server chấm, AI đi nước của nó cho cùng câu."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Trả lời câu (đấu AI)", request=ArenaAnswerSerializer, responses=AiAnswerOutcomeSerializer)
    def post(self, request, match_id: int):
        participant = services.get_participant(match_id, request.user)
        if participant.match.mode != MatchMode.AI:
            raise BusinessError(_("Trận PvP trả lời qua kết nối đấu trường."))
        p = ArenaAnswerSerializer(data=request.data)
        p.is_valid(raise_exception=True)
        outcome = services.submit_answer(match_id, request.user, p.validated_data['question_index'], p.validated_data['answer'])
        return success_response(data=AiAnswerOutcomeSerializer(outcome).data)


class MatchFinishView(APIView):
    """Kết thúc trận đấu AI (đã trả lời hết câu) -> chốt thắng / thua, cộng XP."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Kết thúc trận đấu AI", request=None, responses=MatchResultSerializer)
    def post(self, request, match_id: int):
        participant = services.get_participant(match_id, request.user)
        match = participant.match
        if match.mode == MatchMode.AI and match.status == MatchStatus.IN_PROGRESS:
            match = services.finish_match(match_id)
        return success_response(data=MatchResultSerializer(services.match_result(match, request.user)).data)


class MatchResultView(APIView):
    """Kết quả 1 trận tôi đã tham gia."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Kết quả trận đấu", responses=MatchResultSerializer)
    def get(self, request, match_id: int):
        match = services.get_participant(match_id, request.user).match
        return success_response(data=MatchResultSerializer(services.match_result(match, request.user)).data)


class MatchAnalysisView(APIView):
    """Cô Trang (AI) nhận xét bài làm của tôi trong trận (tạo 1 lần, lần sau đọc lại)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Nhận xét AI sau trận", request=None, responses=AnalysisSerializer)
    def post(self, request, match_id: int):
        match = services.get_participant(match_id, request.user).match
        if match.status == MatchStatus.IN_PROGRESS:
            raise BusinessError(_("Trận đấu chưa kết thúc."))
        return success_response(data=AnalysisSerializer(services.analyze(match, request.user)).data)


class MyMatchesView(APIView):
    """20 trận gần nhất của tôi."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Lịch sử đấu của tôi", responses=MatchHistorySerializer(many=True))
    def get(self, request):
        mine = (ArenaParticipant.objects.filter(user=request.user).select_related('match')
                .order_by('-created_at')[:HISTORY_LIMIT])
        opponents = {
            p.match_id: p for p in ArenaParticipant.objects.filter(match_id__in=[m.match_id for m in mine])
            .exclude(user=request.user).select_related('user')
        }
        rows = []
        for p in mine:
            opp = opponents.get(p.match_id)
            rows.append({
                'match_id': p.match_id, 'mode': p.match.mode, 'topic': p.match.topic, 'status': p.match.status,
                'score': p.score, 'opponent_name': (opp.user.full_name if opp and opp.user else str(_("Gia sư AI"))),
                'opponent_score': opp.score if opp else 0, 'is_winner': p.is_winner, 'xp_earned': p.xp_earned,
                'created_at': p.created_at,
            })
        return success_response(data=MatchHistorySerializer(rows, many=True).data)


class MyArenaStatsView(APIView):
    """Số trận / thắng / thua / tỉ lệ thắng / tổng điểm của tôi (chỉ trận đã kết thúc)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Thống kê đấu trường của tôi", responses=ArenaStatsSerializer)
    def get(self, request):
        agg = (ArenaParticipant.objects.filter(user=request.user, match__status__in=[MatchStatus.FINISHED, MatchStatus.ABANDONED])
               .aggregate(total=Count('id'), wins=Count('id', filter=Q(is_winner=True)), score=Sum('score')))
        total, wins = agg['total'] or 0, agg['wins'] or 0
        data = {'total_matches': total, 'wins': wins, 'losses': total - wins,
                'win_rate': round(wins * 100 / total) if total else 0, 'total_score': agg['score'] or 0}
        return success_response(data=ArenaStatsSerializer(data).data)


class ArenaLeaderboardView(APIView):
    """Bảng vàng đấu trường: tổng điểm các trận đã kết thúc. Lọc `grade`."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Bảng vàng đấu trường",
                   parameters=[OpenApiParameter('grade', int), OpenApiParameter('limit', int)],
                   responses=ArenaLeaderRowSerializer(many=True))
    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 10)), 50)
        except ValueError:
            limit = 10
        qs = ArenaParticipant.objects.filter(user__isnull=False, user__deleted_at__isnull=True,
                                             match__status__in=[MatchStatus.FINISHED, MatchStatus.ABANDONED])
        grade = request.query_params.get('grade')
        if grade and grade.isdigit():
            qs = qs.filter(user__student_profile__grade=int(grade))
        rows = (qs.values('user_id', 'user__full_name')
                .annotate(total_score=Sum('score'), wins=Count('id', filter=Q(is_winner=True)))
                .order_by('-total_score', 'user_id')[:limit])
        data = [{'rank': i, 'user_id': r['user_id'], 'full_name': r['user__full_name'], 'total_score': r['total_score'] or 0,
                 'wins': r['wins'], 'is_me': r['user_id'] == request.user.id} for i, r in enumerate(rows, start=1)]
        return success_response(data=ArenaLeaderRowSerializer(data, many=True).data)
