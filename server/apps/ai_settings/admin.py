from django.contrib import admin

from .models import AiSetting


@admin.register(AiSetting)
class AiSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'label', 'value_type', 'is_active', 'updated_at')
    search_fields = ('key', 'label')
