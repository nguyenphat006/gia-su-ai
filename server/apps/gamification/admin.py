from django.contrib import admin

from .models import Challenge, LevelTier, UserChallenge, UserStats, XpLog


@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_xp', 'weekly_xp', 'points', 'current_streak', 'longest_streak', 'last_study_date')
    raw_id_fields = ('user',)


@admin.register(XpLog)
class XpLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'action', 'source_type', 'source_id', 'created_at')
    list_filter = ('action',)
    raw_id_fields = ('user',)


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'trigger_action', 'goal', 'period', 'xp_reward', 'is_active')


@admin.register(UserChallenge)
class UserChallengeAdmin(admin.ModelAdmin):
    list_display = ('user', 'challenge', 'period_key', 'progress', 'completed_at')
    raw_id_fields = ('user',)


@admin.register(LevelTier)
class LevelTierAdmin(admin.ModelAdmin):
    list_display = ('title', 'min_xp', 'sort_order', 'is_active')
