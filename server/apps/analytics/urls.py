from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ArenaReportViewSet, ChatLogViewSet, HeatmapView, OverviewView, QuizReportViewSet, StudentReportViewSet,
    XpLeaderboardView,
)

router = DefaultRouter()
router.register(r'reports/students', StudentReportViewSet, basename='report-students')
router.register(r'reports/chat-logs', ChatLogViewSet, basename='report-chat-logs')
router.register(r'reports/arena-matches', ArenaReportViewSet, basename='report-arena-matches')
router.register(r'reports/quiz-attempts', QuizReportViewSet, basename='report-quiz-attempts')

urlpatterns = [
    path('reports/overview/', OverviewView.as_view(), name='report-overview'),
    path('reports/heatmap/', HeatmapView.as_view(), name='report-heatmap'),
    path('reports/xp-leaderboard/', XpLeaderboardView.as_view(), name='report-xp-leaderboard'),
    path('', include(router.urls)),
]
