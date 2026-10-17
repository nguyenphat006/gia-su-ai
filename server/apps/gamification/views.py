"""API thành tích phía học sinh (chỉ dữ liệu của chính mình + bảng xếp hạng)."""
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers
from rest_framework.views import APIView

from apps.core.permissions import HasPermission
from apps.core.responses import success_response

from . import services
from .models import UserStats, XpLog

User = get_user_model()
TAG = "Học sinh - Thành tích"
LEARN_PERMISSIONS = [permissions.IsAuthenticated, HasPermission('LEARN_USE')]
LEADERBOARD_LIMIT = 50


class LevelSerializer(serializers.Serializer):
    title = serializers.CharField()
    min_xp = serializers.IntegerField()
    next_title = serializers.CharField(allow_null=True)
    next_min_xp = serializers.IntegerField(allow_null=True)
    progress = serializers.IntegerField()


class MyStatsSerializer(serializers.Serializer):
    total_xp = serializers.IntegerField()
    weekly_xp = serializers.IntegerField()
    points = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    last_study_date = serializers.DateField(allow_null=True)
    level = LevelSerializer()
    weekly_rank = serializers.IntegerField(allow_null=True)


class CheckInSerializer(serializers.Serializer):
    checked_in = serializers.BooleanField()
    current_streak = serializers.IntegerField()


class ChallengeProgressSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    period = serializers.CharField()
    goal = serializers.IntegerField()
    progress = serializers.IntegerField()
    completed = serializers.BooleanField()
    xp_reward = serializers.IntegerField()
    points_reward = serializers.IntegerField()


class LeaderboardRowSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    grade = serializers.IntegerField(allow_null=True)
    class_name = serializers.CharField(allow_null=True)
    xp = serializers.IntegerField()
    level_title = serializers.CharField()
    is_me = serializers.BooleanField()


def _my_stats(user) -> dict:
    stats = services.get_stats(user)
    weekly_rank = None
    if stats.weekly_xp > 0:
        weekly_rank = UserStats.objects.filter(weekly_xp__gt=stats.weekly_xp).count() + 1
    return {
        'total_xp': stats.total_xp, 'weekly_xp': stats.weekly_xp, 'points': stats.points,
        'current_streak': stats.current_streak, 'longest_streak': stats.longest_streak,
        'last_study_date': stats.last_study_date, 'level': services.level_info(stats.total_xp),
        'weekly_rank': weekly_rank,
    }


class MyStatsView(APIView):
    """Thống kê của học sinh đang đăng nhập (XP, chuỗi ngày, danh hiệu, hạng tuần)."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Thành tích của tôi", responses=MyStatsSerializer)
    def get(self, request):
        return success_response(data=MyStatsSerializer(_my_stats(request.user)).data)


class CheckInView(APIView):
    """Điểm danh đầu ngày — giao diện học sinh gọi khi mở; gọi nhiều lần trong ngày không cộng thêm."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Điểm danh hằng ngày", request=None, responses=CheckInSerializer)
    def post(self, request):
        return success_response(data=CheckInSerializer(services.check_in(request.user)).data)


class MyChallengesView(APIView):
    """Thử thách kỳ hiện tại kèm tiến độ của tôi."""
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Thử thách của tôi", responses=ChallengeProgressSerializer(many=True))
    def get(self, request):
        return success_response(data=ChallengeProgressSerializer(services.challenges_for(request.user), many=True).data)


class LeaderboardView(APIView):
    """
    Bảng xếp hạng: `scope=weekly` (XP tuần, mặc định) | `month` (tổng XP trong tháng) | `all` (tổng XP).
    Lọc `grade` để xem trong khối. Chỉ lộ họ tên + lớp (không lộ tài khoản / email).
    """
    permission_classes = LEARN_PERMISSIONS

    @extend_schema(tags=[TAG], summary="Bảng xếp hạng", parameters=[
        OpenApiParameter('scope', str, enum=['weekly', 'month', 'all']),
        OpenApiParameter('grade', int), OpenApiParameter('limit', int),
    ], responses=LeaderboardRowSerializer(many=True))
    def get(self, request):
        scope = request.query_params.get('scope', 'weekly')
        grade = request.query_params.get('grade')
        try:
            limit = min(int(request.query_params.get('limit', 10)), LEADERBOARD_LIMIT)
        except ValueError:
            limit = 10

        users = User.objects.filter(deleted_at__isnull=True, is_active=True, student_profile__isnull=False)
        if grade and grade.isdigit():
            users = users.filter(student_profile__grade=int(grade))

        if scope == 'month':
            month_start = timezone.localtime().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            rows = (XpLog.objects.filter(user__in=users, created_at__gte=month_start)
                    .values('user_id').annotate(xp=Sum('amount')).filter(xp__gt=0).order_by('-xp')[:limit])
            scores = [(r['user_id'], r['xp']) for r in rows]
        else:
            field = 'total_xp' if scope == 'all' else 'weekly_xp'
            rows = (UserStats.objects.filter(user__in=users, **{f'{field}__gt': 0})
                    .order_by(f'-{field}', 'user_id').values_list('user_id', field)[:limit])
            scores = list(rows)

        profiles = {
            u.id: u for u in User.objects.filter(id__in=[uid for uid, _xp in scores])
            .select_related('student_profile__school_class', 'stats')
        }
        data = []
        for rank, (uid, xp) in enumerate(scores, start=1):
            user = profiles[uid]
            profile = getattr(user, 'student_profile', None)
            total = getattr(getattr(user, 'stats', None), 'total_xp', 0)
            data.append({
                'rank': rank, 'user_id': uid, 'full_name': user.full_name or user.username,
                'grade': profile.grade if profile else None,
                'class_name': profile.school_class.name if profile and profile.school_class else None,
                'xp': xp, 'level_title': services.level_info(total)['title'], 'is_me': uid == request.user.id,
            })
        return success_response(data=LeaderboardRowSerializer(data, many=True).data)
