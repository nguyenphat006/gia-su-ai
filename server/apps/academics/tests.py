"""Test API Học vụ: lớp học, học sinh (tạo / nhập Excel / khóa / xóa), giáo viên, đăng nhập bằng mã học sinh."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

from .models import SchoolClass, StudentProfile

User = get_user_model()


@override_settings(DEBUG=True)
class AcademicsApiTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.teacher = User.objects.create_user(username='gv1', email='gv1@x.vn', password='Password123!', full_name='Cô Lan')
        self.teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client = APIClient()
        self.client.force_authenticate(self.teacher)
        self.class_6a = SchoolClass.objects.create(code='6A1-2026', name='6A1', grade=6, academic_year='2026-2027')

    # ------------------------------------------------------------------ lớp học
    def test_class_crud_and_student_count(self):
        resp = self.client.post('/api/v1/classes/', {
            'code': '7b2-2026', 'name': '7B2', 'grade': 7, 'academic_year': '2026-2027', 'homeroom_teacher': self.teacher.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        body = resp.json()
        self.assertTrue(body['success'])
        self.assertEqual(body['data']['code'], '7B2-2026')
        self.assertEqual(body['data']['homeroom_teacher_name'], 'Cô Lan')

    def test_class_name_unique_per_year(self):
        resp = self.client.post('/api/v1/classes/', {'code': 'X', 'name': '6a1', 'grade': 6, 'academic_year': '2026-2027'}, format='json')
        self.assertEqual(resp.json()['code'], 'validation_error')
        self.assertIn('name', resp.json()['errors'])

    def test_cannot_delete_class_with_students(self):
        self.client.post('/api/v1/students/', {'full_name': 'An', 'student_code': 'hs001', 'grade': 6, 'school_class': self.class_6a.id}, format='json')
        self.client.force_authenticate(User.objects.get(username='admin'))  # giáo viên không có quyền xóa lớp
        resp = self.client.delete(f'/api/v1/classes/{self.class_6a.id}/')
        self.assertEqual(resp.json()['code'], 'business_rule')

    # ------------------------------------------------------------------ học sinh
    def test_create_student_generates_password_once(self):
        resp = self.client.post('/api/v1/students/', {
            'full_name': 'Nguyễn Văn An', 'student_code': 'hs001', 'grade': 6, 'school_class': self.class_6a.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        data = resp.json()['data']
        self.assertEqual(data['student_code'], 'HS001')
        self.assertEqual(data['username'], 'hs001')
        self.assertTrue(data['must_change_password'])
        self.assertEqual(len(data['initial_password']), 8)

        user = User.objects.get(username='hs001')
        self.assertTrue(user.check_password(data['initial_password']))
        self.assertTrue(user.roles.filter(role_code='STUDENT').exists())

        detail = self.client.get(f"/api/v1/students/{data['id']}/").json()['data']
        self.assertIsNone(detail['initial_password'])

    def test_login_with_student_code(self):
        self.client.post('/api/v1/students/', {'full_name': 'An', 'student_code': 'HS777', 'username': 'an.nguyen', 'password': 'MatKhau1', 'grade': 7}, format='json')
        resp = APIClient().post('/api/v1/auth/login/', {'username': 'hs777', 'password': 'MatKhau1'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(resp.json()['data']['user']['username'], 'an.nguyen')
        self.assertTrue(resp.json()['data']['user']['must_change_password'])

    def test_duplicate_username_rejected(self):
        resp = self.client.post('/api/v1/students/', {'full_name': 'Trùng', 'student_code': 'HS1', 'username': 'gv1', 'grade': 6}, format='json')
        self.assertEqual(resp.json()['code'], 'validation_error')
        self.assertIn('username', resp.json()['errors'])

    def test_lock_and_delete_student_disables_login(self):
        sid = self.client.post('/api/v1/students/', {'full_name': 'B', 'student_code': 'HS2', 'password': 'MatKhau1', 'grade': 8}, format='json').json()['data']['id']
        resp = self.client.post('/api/v1/students/batch-status/', {'ids': [sid], 'is_active': False}, format='json')
        self.assertEqual(resp.json()['data']['count'], 1)
        self.assertFalse(User.objects.get(username='hs2').is_active)

        self.client.post('/api/v1/students/batch-status/', {'ids': [sid], 'is_active': True}, format='json')
        self.assertTrue(User.objects.get(username='hs2').is_active)

        self.client.delete(f'/api/v1/students/{sid}/')
        user = User.objects.get(username='hs2')
        self.assertIsNotNone(user.deleted_at)
        login = APIClient().post('/api/v1/auth/login/', {'username': 'HS2', 'password': 'MatKhau1'}, format='json')
        self.assertEqual(login.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_import_students_from_rows(self):
        rows = [
            {'Họ và tên': 'Trần Thị Bình', 'Mã học sinh': 'HS100', 'Khối': 6, 'Mã lớp': '6a1-2026'},
            {'Ho va ten': 'Lê Văn Cường', 'Khoi lop': '7', 'Mat khau': 'TuDat123'},
            {'Họ và tên': '', 'Khối': 6},                     # thiếu tên
            {'Họ và tên': 'Sai khối', 'Khối': 12},            # khối sai
            {'Họ và tên': 'Lớp lạ', 'Khối': 6, 'Mã lớp': 'ZZZ'},
        ]
        resp = self.client.post('/api/v1/students/import-excel/', {'rows': rows}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        data = resp.json()['data']
        self.assertEqual(data['count'], 2)
        self.assertEqual(len(data['errors']), 3)
        binh = StudentProfile.objects.get(student_code='HS100')
        self.assertEqual(binh.school_class, self.class_6a)
        creds = {c['full_name']: c for c in data['credentials']}
        self.assertIsNotNone(creds['Trần Thị Bình']['initial_password'])
        self.assertIsNone(creds['Lê Văn Cường']['initial_password'])  # tự đặt trong file

    def test_teacher_reset_password_forces_change(self):
        sid = self.client.post('/api/v1/students/', {'full_name': 'C', 'student_code': 'HS3', 'password': 'MatKhau1', 'grade': 9}, format='json').json()['data']['id']
        user = User.objects.get(username='hs3')
        user.must_change_password = False
        user.save()
        self.client.patch(f'/api/v1/students/{sid}/', {'password': 'MoiDat99'}, format='json')
        user.refresh_from_db()
        self.assertTrue(user.must_change_password)
        self.assertTrue(user.check_password('MoiDat99'))

    # ------------------------------------------------------------------ phân quyền
    def test_student_role_cannot_manage_students(self):
        student = User.objects.create_user(username='hsx', email='', password='Password123!')
        student.roles.add(Role.objects.get(role_code='STUDENT'))
        self.client.force_authenticate(student)
        self.assertEqual(self.client.get('/api/v1/students/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/v1/classes/').status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_create_teacher(self):
        resp = self.client.post('/api/v1/teachers/', {'username': 'gv2', 'full_name': 'Thầy B'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_creates_teacher(self):
        self.client.force_authenticate(User.objects.get(username='admin'))
        resp = self.client.post('/api/v1/teachers/', {'username': 'GV2', 'full_name': 'Thầy B', 'subject': 'Vật lý'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertTrue(User.objects.get(username='gv2').roles.filter(role_code='TEACHER').exists())
