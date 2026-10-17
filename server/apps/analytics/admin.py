from django.contrib import admin

from .models import LearningEvent


@admin.register(LearningEvent)
class LearningEventAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'source_type', 'source_id', 'occurred_at')
    list_filter = ('event_type',)
    raw_id_fields = ('user',)
