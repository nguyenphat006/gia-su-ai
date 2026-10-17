from django.contrib import admin

from .models import FlashcardDeck, Mindmap, Question, QuizAttempt


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'grade', 'topic', 'question_type', 'difficulty', 'status', 'origin', 'is_active')
    list_filter = ('grade', 'question_type', 'difficulty', 'status', 'origin')
    search_fields = ('content', 'topic')


@admin.register(FlashcardDeck)
class FlashcardDeckAdmin(admin.ModelAdmin):
    list_display = ('title', 'grade', 'topic', 'origin', 'is_active')
    search_fields = ('title', 'topic')


@admin.register(Mindmap)
class MindmapAdmin(admin.ModelAdmin):
    list_display = ('title', 'grade', 'topic', 'origin', 'is_active')
    search_fields = ('title', 'topic')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz_type', 'topic', 'correct_count', 'total_questions', 'xp_earned', 'created_at')
    raw_id_fields = ('user',)
