from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AiSettingViewSet

router = DefaultRouter()
router.register(r'ai-settings', AiSettingViewSet, basename='ai-settings')

urlpatterns = [
    path('', include(router.urls)),
]
