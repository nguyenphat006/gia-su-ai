from django.urls import path

from .views import CheckInView, LeaderboardView, MyChallengesView, MyStatsView

urlpatterns = [
    path('learn/me/stats/', MyStatsView.as_view(), name='learn-my-stats'),
    path('learn/me/check-in/', CheckInView.as_view(), name='learn-check-in'),
    path('learn/me/challenges/', MyChallengesView.as_view(), name='learn-my-challenges'),
    path('learn/leaderboard/', LeaderboardView.as_view(), name='learn-leaderboard'),
]
