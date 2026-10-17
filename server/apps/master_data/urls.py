from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UnitOfMeasureViewSet, MaterialCategoryViewSet, MaterialViewSet

router = DefaultRouter()
router.register(r'units', UnitOfMeasureViewSet, basename='unit')
router.register(r'material-categories', MaterialCategoryViewSet, basename='material-category')
router.register(r'materials', MaterialViewSet, basename='material')

urlpatterns = [
    path('', include(router.urls)),
]
