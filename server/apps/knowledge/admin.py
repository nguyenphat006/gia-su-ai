from django.contrib import admin

from .models import KnowledgeChunk, SourceDocument


@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'grade', 'status', 'processed_chunks', 'total_chunks', 'created_at')
    list_filter = ('status', 'grade')
    search_fields = ('title', 'topic')
    exclude = ('raw_text',)


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ('title', 'grade', 'topic', 'embedded_at', 'is_active')
    list_filter = ('grade', 'is_active')
    search_fields = ('title', 'content')
    exclude = ('embedding',)
