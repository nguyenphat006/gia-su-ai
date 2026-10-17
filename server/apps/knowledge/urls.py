from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import KnowledgeChunkViewSet, SourceDocumentViewSet

router = DefaultRouter()
router.register(r'knowledge-chunks', KnowledgeChunkViewSet, basename='knowledge-chunks')
router.register(r'source-documents', SourceDocumentViewSet, basename='source-documents')

urlpatterns = [
    path('', include(router.urls)),
]
