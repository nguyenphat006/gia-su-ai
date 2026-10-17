from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .learn_views import (
    CheckAnswerView, FlashcardQuizSubmitView, LearnFlashcardsView, LearnMindmapView, LearnTopicsView, QuizHistoryView,
    QuizStartView, QuizSubmitView,
)
from .views import FlashcardDeckViewSet, MindmapViewSet, QuestionViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')
router.register(r'flashcard-decks', FlashcardDeckViewSet, basename='flashcard-decks')
router.register(r'mindmaps', MindmapViewSet, basename='mindmaps')

urlpatterns = [
    path('', include(router.urls)),
    # Cổng học sinh
    path('learn/practice/topics/', LearnTopicsView.as_view(), name='learn-topics'),
    path('learn/practice/quiz/start/', QuizStartView.as_view(), name='learn-quiz-start'),
    path('learn/practice/quiz/check/', CheckAnswerView.as_view(), name='learn-quiz-check'),
    path('learn/practice/quiz/submit/', QuizSubmitView.as_view(), name='learn-quiz-submit'),
    path('learn/practice/quiz/history/', QuizHistoryView.as_view(), name='learn-quiz-history'),
    path('learn/practice/flashcards/', LearnFlashcardsView.as_view(), name='learn-flashcards'),
    path('learn/practice/flashcards/submit/', FlashcardQuizSubmitView.as_view(), name='learn-flashcards-submit'),
    path('learn/practice/mindmap/', LearnMindmapView.as_view(), name='learn-mindmap'),
]
