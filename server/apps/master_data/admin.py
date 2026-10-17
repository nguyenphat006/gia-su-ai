from django.contrib import admin
from .models import UnitOfMeasure

@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active', 'created_at', 'updated_at')
    search_fields = ('code', 'name', 'description')
    list_filter = ('is_active', 'created_at')
