from django.contrib import admin

from .models import ArenaMatch, ArenaParticipant


class ParticipantInline(admin.TabularInline):
    model = ArenaParticipant
    extra = 0
    raw_id_fields = ('user',)
    exclude = ('answers',)


@admin.register(ArenaMatch)
class ArenaMatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'mode', 'topic', 'status', 'started_at', 'ended_at')
    list_filter = ('mode', 'status')
    exclude = ('questions', 'ai_analysis')
    inlines = [ParticipantInline]
