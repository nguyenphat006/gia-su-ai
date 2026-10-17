from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SchoolClassViewSet, StudentViewSet, TeacherViewSet

router = DefaultRouter()
router.register(r'classes', SchoolClassViewSet, basename='classes')
router.register(r'students', StudentViewSet, basename='students')
router.register(r'teachers', TeacherViewSet, basename='teachers')

urlpatterns = [
    path('', include(router.urls)),
]
