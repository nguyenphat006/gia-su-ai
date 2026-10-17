from django.urls import path

from .views import (
    AiMatchAnswerView, AiMatchStartView, ArenaLeaderboardView, MatchAnalysisView, MatchFinishView, MatchResultView,
    MyArenaStatsView, MyMatchesView,
)

urlpatterns = [
    path('learn/arena/ai/start/', AiMatchStartView.as_view(), name='learn-arena-ai-start'),
    path('learn/arena/matches/<int:match_id>/answer/', AiMatchAnswerView.as_view(), name='learn-arena-answer'),
    path('learn/arena/matches/<int:match_id>/finish/', MatchFinishView.as_view(), name='learn-arena-finish'),
    path('learn/arena/matches/<int:match_id>/', MatchResultView.as_view(), name='learn-arena-result'),
    path('learn/arena/matches/<int:match_id>/analysis/', MatchAnalysisView.as_view(), name='learn-arena-analysis'),
    path('learn/arena/me/matches/', MyMatchesView.as_view(), name='learn-arena-my-matches'),
    path('learn/arena/me/stats/', MyArenaStatsView.as_view(), name='learn-arena-my-stats'),
    path('learn/arena/leaderboard/', ArenaLeaderboardView.as_view(), name='learn-arena-leaderboard'),
]
