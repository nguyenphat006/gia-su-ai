from django.contrib import admin

from .models import ChatMessage, ChatSession


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'last_message_at', 'is_active')
    raw_id_fields = ('user',)
    search_fields = ('title', 'user__username')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'is_blocked', 'created_at')
    list_filter = ('role', 'is_blocked')
    raw_id_fields = ('session',)
