from django.contrib import admin

from .models import SchoolClass, StudentProfile, TeacherProfile


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'grade', 'academic_year', 'is_active', 'updated_at')
    search_fields = ('code', 'name')
    list_filter = ('grade', 'academic_year', 'is_active')


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('student_code', 'user', 'grade', 'school_class', 'is_active')
    search_fields = ('student_code', 'user__full_name', 'user__username')
    list_filter = ('grade', 'is_active')
    raw_id_fields = ('user',)


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'user', 'subject', 'is_active')
    search_fields = ('employee_code', 'user__full_name', 'user__username')
    raw_id_fields = ('user',)
