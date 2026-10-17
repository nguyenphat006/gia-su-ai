"""
Truy vấn báo cáo học tập cho giáo viên. Mọi mốc thời gian theo giờ Việt Nam (TIME_ZONE).
Phạm vi lọc chung: date_from / date_to (YYYY-MM-DD), grade, school_class.
"""
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import ExtractHour, ExtractIsoWeekDay, TruncDate
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.academics.models import StudentProfile
from apps.arena.models import ArenaMatch
from apps.revision.models import QuizAttempt
from apps.tutor.models import ChatMessage, ChatRole

from .models import EventType, LearningEvent

User = get_user_model()
DEFAULT_DAYS = 30
MAX_DAYS = 366


def parse_range(params) -> tuple[datetime, datetime]:
    """[start, end) theo ngày địa phương; mặc định 30 ngày gần nhất."""
    tz = timezone.get_current_timezone()
    today = timezone.localdate()

    def _date(key, default):
        try:
            return datetime.strptime(params.get(key, ''), '%Y-%m-%d').date()
        except ValueError:
            return default

    end_day = _date('date_to', today)
    start_day = _date('date_from', end_day - timedelta(days=DEFAULT_DAYS - 1))
    if start_day > end_day:
        start_day, end_day = end_day, start_day
    start_day = max(start_day, end_day - timedelta(days=MAX_DAYS))
    return (timezone.make_aware(datetime.combine(start_day, time.min), tz),
            timezone.make_aware(datetime.combine(end_day + timedelta(days=1), time.min), tz))


def window_filter(params, field: str) -> dict:
    """Lọc theo khoảng ngày; xem riêng 1 học sinh (`user`) mà không truyền ngày -> toàn bộ lịch sử."""
    if params.get('user') and not params.get('date_from') and not params.get('date_to'):
        return {}
    start, end = parse_range(params)
    return {f'{field}__gte': start, f'{field}__lt': end}


def student_users(params):
    """Tài khoản học sinh trong phạm vi lọc khối / lớp."""
    qs = User.objects.filter(student_profile__isnull=False, student_profile__deleted_at__isnull=True)
    grade = params.get('grade')
    if grade and str(grade).isdigit():
        qs = qs.filter(student_profile__grade=int(grade))
    school_class = params.get('school_class')
    if school_class and str(school_class).isdigit():
        qs = qs.filter(student_profile__school_class_id=int(school_class))
    return qs


def overview(params) -> dict:
    start, end = parse_range(params)
    users = student_users(params)
    events = LearningEvent.objects.filter(user__in=users, occurred_at__gte=start, occurred_at__lt=end)
    by_type = dict(events.values_list('event_type').annotate(n=Count('id')))
    attempts = QuizAttempt.objects.filter(user__in=users, created_at__gte=start, created_at__lt=end).aggregate(
        total=Sum('total_questions'), correct=Sum('correct_count'))
    daily = (events.annotate(day=TruncDate('occurred_at')).values('day')
             .annotate(active=Count('user', distinct=True), total=Count('id')).order_by('day'))
    counts = {row['day']: row for row in daily}
    days = (end - start).days
    series = []
    for i in range(days):
        day = (start + timedelta(days=i)).date()
        row = counts.get(day, {})
        series.append({'date': day.isoformat(), 'active_students': row.get('active', 0), 'events': row.get('total', 0)})
    return {
        'total_students': users.count(),
        'active_students': events.values('user').distinct().count(),
        'chat_questions': by_type.get(EventType.CHAT, 0),
        'quiz_attempts': by_type.get(EventType.QUIZ, 0),
        'arena_matches': by_type.get(EventType.ARENA, 0),
        'flashcard_views': by_type.get(EventType.FLASHCARD_VIEW, 0),
        'mindmap_views': by_type.get(EventType.MINDMAP_VIEW, 0),
        'quiz_accuracy': round((attempts['correct'] or 0) * 100 / attempts['total']) if attempts['total'] else None,
        'daily': series,
    }


def heatmap(params) -> list[dict]:
    """Số hoạt động theo (thứ trong tuần 1=Thứ Hai..7=Chủ nhật, giờ 0-23), giờ Việt Nam."""
    start, end = parse_range(params)
    rows = (LearningEvent.objects.filter(user__in=student_users(params), occurred_at__gte=start, occurred_at__lt=end)
            .annotate(weekday=ExtractIsoWeekDay('occurred_at'), hour=ExtractHour('occurred_at'))
            .values('weekday', 'hour').annotate(count=Count('id')).order_by('weekday', 'hour'))
    return list(rows)


def annotate_student_stats(qs, start=None, end=None):
    """Thêm số liệu học tập vào queryset StudentProfile (không N+1)."""
    window = Q()
    if start is not None:
        window = Q(user__learning_events__occurred_at__gte=start, user__learning_events__occurred_at__lt=end)

    def events(kind):
        return Count('user__learning_events', filter=window & Q(user__learning_events__event_type=kind), distinct=True)

    last_active = (LearningEvent.objects.filter(user=OuterRef('user')).order_by('-occurred_at').values('occurred_at')[:1])
    return qs.annotate(
        chat_count=events(EventType.CHAT),
        quiz_count=events(EventType.QUIZ),
        arena_count=events(EventType.ARENA),
        flashcard_count=events(EventType.FLASHCARD_VIEW),
        mindmap_count=events(EventType.MINDMAP_VIEW),
        total_xp=F('user__stats__total_xp'),
        current_streak=F('user__stats__current_streak'),
        last_active_at=Subquery(last_active),
    )


def student_profiles(params):
    start, end = parse_range(params) if params.get('date_from') or params.get('date_to') else (None, None)
    qs = StudentProfile.objects.filter(user__in=student_users(params)).select_related('user', 'school_class', 'user__stats')
    return annotate_student_stats(qs, start, end)


def chat_pairs(params):
    """Tin nhắn học sinh + câu trả lời ngay sau đó của gia sư (thay cho LEAD() SQL bản cũ)."""
    reply = ChatMessage.objects.filter(session=OuterRef('session'), id__gt=OuterRef('id')).order_by('id')
    qs = (ChatMessage.objects.filter(role=ChatRole.USER, session__user__in=student_users(params),
                                     **window_filter(params, 'created_at'))
          .select_related('session__user__student_profile__school_class')
          .annotate(reply_content=Subquery(reply.values('content')[:1]), reply_role=Subquery(reply.values('role')[:1]))
          .order_by('-created_at', '-id'))
    if params.get('user') and str(params['user']).isdigit():
        qs = qs.filter(session__user_id=int(params['user']))
    keyword = (params.get('q') or '').strip()
    if keyword:
        qs = qs.filter(content__icontains=keyword)
    if params.get('blocked') in ('true', 'false'):
        qs = qs.filter(is_blocked=params['blocked'] == 'true')
    return qs


def arena_matches(params):
    qs = (ArenaMatch.objects.filter(**window_filter(params, 'created_at'))
          .prefetch_related('participants__user__student_profile').order_by('-created_at', '-id'))
    users = student_users(params)
    if params.get('grade') or params.get('school_class'):
        qs = qs.filter(participants__user__in=users).distinct()
    if params.get('user') and str(params['user']).isdigit():
        qs = qs.filter(participants__user_id=int(params['user'])).distinct()
    if params.get('mode') in ('PVP', 'AI'):
        qs = qs.filter(mode=params['mode'])
    if params.get('status') in ('IN_PROGRESS', 'FINISHED', 'ABANDONED'):
        qs = qs.filter(status=params['status'])
    keyword = (params.get('q') or '').strip()
    if keyword:
        qs = qs.filter(topic__icontains=keyword)
    return qs


def quiz_attempts(params):
    qs = (QuizAttempt.objects.filter(user__in=student_users(params), **window_filter(params, 'created_at'))
          .select_related('user__student_profile__school_class').order_by('-created_at', '-id'))
    if params.get('user') and str(params['user']).isdigit():
        qs = qs.filter(user_id=int(params['user']))
    if params.get('quiz_type'):
        qs = qs.filter(quiz_type=params['quiz_type'])
    keyword = (params.get('q') or '').strip()
    if keyword:
        qs = qs.filter(Q(topic__icontains=keyword) | Q(user__full_name__icontains=keyword))
    return qs


def xp_leaderboard(params, limit: int = 10) -> list[dict]:
    """Bảng xếp hạng XP trong khoảng thời gian (mặc định 30 ngày) — tổng XpLog."""
    from apps.gamification.models import XpLog
    start, end = parse_range(params)
    rows = (XpLog.objects.filter(user__in=student_users(params), created_at__gte=start, created_at__lt=end)
            .values('user_id', 'user__full_name', 'user__student_profile__id', 'user__student_profile__student_code',
                    'user__student_profile__school_class__name')
            .annotate(xp=Sum('amount')).filter(xp__gt=0).order_by('-xp', 'user_id')[:limit])
    return [{'rank': i, 'user_id': r['user_id'], 'student_id': r['user__student_profile__id'], 'full_name': r['user__full_name'],
             'student_code': r['user__student_profile__student_code'],
             'class_name': r['user__student_profile__school_class__name'], 'xp': r['xp']}
            for i, r in enumerate(rows, start=1)]


def _student_id(user):
    profile = getattr(user, 'student_profile', None) if user else None
    return profile.id if profile else None


def arena_participant_rows(match: ArenaMatch) -> list[dict]:
    return [{'user_id': p.user_id, 'student_id': _student_id(p.user),
             'name': p.user.full_name if p.user else str(_("Gia sư AI")), 'score': p.score,
             'correct_count': p.correct_count, 'is_winner': p.is_winner}
            for p in match.participants.all()]

