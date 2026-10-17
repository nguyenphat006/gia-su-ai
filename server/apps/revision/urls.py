from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FlashcardDeckViewSet, MindmapViewSet, QuestionViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')
router.register(r'flashcard-decks', FlashcardDeckViewSet, basename='flashcard-decks')
router.register(r'mindmaps', MindmapViewSet, basename='mindmaps')

urlpatterns = [
    path('', include(router.urls)),
]
