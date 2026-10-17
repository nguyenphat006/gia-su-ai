"""
Nghiệp vụ thành tích: XP, chuỗi ngày học, thử thách theo kỳ, danh hiệu, bảng xếp hạng.

Quy tắc XP (giữ như bản cũ):
    Hỏi gia sư +10 · Ôn tập +10 / câu đúng · Đấu AI 50 (thắng 100) · Đấu PvP 20 (thắng 50)
    Vi phạm nội dung -base × 2^n (n = số lần vi phạm trong tháng, tối đa 4) · Điểm danh +5 điểm thưởng (0 XP)
Sửa so với bản cũ: thử thách tự sang kỳ mới (PeriodKey), không hoàn thành sớm 1 bước, XP tuần reset thứ Hai.
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Challenge, LevelTier, Period, UserChallenge, UserStats, XpAction, XpLog

XP_CHAT = 10
XP_PER_CORRECT_ANSWER = 10
XP_ARENA = {('AI', False): 50, ('AI', True): 100, ('PVP', False): 20, ('PVP', True): 50}
DAILY_LOGIN_POINTS = 5
GUARD_MAX_EXPONENT = 4


def local_today():
    return timezone.localdate()


def period_key(period: str, today=None) -> str:
    today = today or local_today()
    if period == Period.DAILY:
        return today.isoformat()
    if period == Period.WEEKLY:
        iso = today.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    return 'ONCE'


def get_stats(user) -> UserStats:
    stats, _created = UserStats.objects.get_or_create(user=user)
    return stats


@transaction.atomic
def add_xp(user, amount: int, action: str, *, source=None) -> int:
    """Cộng / trừ XP (không để âm). Trả về số XP thực sự thay đổi. `source` = (source_type, source_id)."""
    stats = UserStats.objects.select_for_update().get_or_create(user=user)[0]
    applied = max(amount, -stats.total_xp)
    stats.total_xp += applied
    stats.weekly_xp = max(stats.weekly_xp + applied, 0)
    stats.save(update_fields=['total_xp', 'weekly_xp', 'updated_at'])
    source_type, source_id = source or (None, None)
    XpLog.objects.create(user=user, amount=applied, action=action, source_type=source_type, source_id=source_id)
    return applied


def record_progress(user, trigger_action: str, increment: int = 1) -> list[Challenge]:
    """Tăng tiến độ các thử thách khớp hành động; trả danh sách thử thách VỪA hoàn thành (đã cộng thưởng)."""
    completed = []
    for challenge in Challenge.objects.filter(trigger_action=trigger_action, is_active=True):
        with transaction.atomic():
            row, _created = UserChallenge.objects.select_for_update().get_or_create(
                user=user, challenge=challenge, period_key=period_key(challenge.period),
            )
            if row.completed_at:
                continue
            row.progress = min(row.progress + increment, challenge.goal)
            if row.progress >= challenge.goal:
                row.completed_at = timezone.now()
                completed.append(challenge)
            row.save(update_fields=['progress', 'completed_at', 'updated_at'])
            if row.completed_at:
                if challenge.xp_reward:
                    add_xp(user, challenge.xp_reward, XpAction.QUEST_COMPLETED, source=('USER_CHALLENGE', row.id))
                if challenge.points_reward:
                    UserStats.objects.filter(user=user).update(points=F('points') + challenge.points_reward)
    return completed


@transaction.atomic
def check_in(user) -> dict:
    """Điểm danh đầu ngày (idempotent trong ngày): cập nhật chuỗi ngày học, +5 điểm thưởng."""
    stats = UserStats.objects.select_for_update().get_or_create(user=user)[0]
    today = local_today()
    if stats.last_study_date == today:
        return {'checked_in': False, 'current_streak': stats.current_streak}
    stats.current_streak = stats.current_streak + 1 if stats.last_study_date == today - timedelta(days=1) else 1
    stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.last_study_date = today
    stats.points += DAILY_LOGIN_POINTS
    stats.save(update_fields=['current_streak', 'longest_streak', 'last_study_date', 'points', 'updated_at'])
    XpLog.objects.create(user=user, amount=0, action=XpAction.DAILY_LOGIN)

    from apps.analytics.models import EventType, record_event
    record_event(user, EventType.LOGIN)
    return {'checked_in': True, 'current_streak': stats.current_streak}


def guard_penalty(user, base: int) -> int:
    """XP phạt khi vi phạm nội dung: base × 2^n, n = số lần đã vi phạm trong tháng (tối đa 4)."""
    month_start = timezone.localtime().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    violations = XpLog.objects.filter(user=user, action=XpAction.GUARD_PENALTY, created_at__gte=month_start).count()
    return base * (2 ** min(violations, GUARD_MAX_EXPONENT))


def level_info(total_xp: int) -> dict:
    tiers = list(LevelTier.objects.filter(is_active=True).order_by('min_xp').values('title', 'min_xp'))
    if not tiers:
        return {'title': '', 'min_xp': 0, 'next_title': None, 'next_min_xp': None, 'progress': 100}
    current, nxt = tiers[0], None
    for i, tier in enumerate(tiers):
        if total_xp >= tier['min_xp']:
            current, nxt = tier, (tiers[i + 1] if i + 1 < len(tiers) else None)
    if nxt is None:
        progress = 100
    else:
        span = nxt['min_xp'] - current['min_xp']
        progress = round((total_xp - current['min_xp']) * 100 / span) if span else 100
    return {
        'title': current['title'], 'min_xp': current['min_xp'],
        'next_title': nxt['title'] if nxt else None, 'next_min_xp': nxt['min_xp'] if nxt else None,
        'progress': progress,
    }


def challenges_for(user) -> list[dict]:
    rows = {
        (r.challenge_id, r.period_key): r
        for r in UserChallenge.objects.filter(user=user, period_key__in={period_key(p) for p in Period.values})
    }
    result = []
    for ch in Challenge.objects.filter(is_active=True).order_by('period', 'id'):
        row = rows.get((ch.id, period_key(ch.period)))
        result.append({
            'id': ch.id, 'code': ch.code, 'name': ch.name, 'description': ch.description or '', 'period': ch.period,
            'goal': ch.goal, 'progress': row.progress if row else 0, 'completed': bool(row and row.completed_at),
            'xp_reward': ch.xp_reward, 'points_reward': ch.points_reward,
        })
    return result


def reset_weekly_xp() -> int:
    return UserStats.objects.filter(weekly_xp__gt=0).update(weekly_xp=0)
