"""Test chuyển đổi tài khoản từ bản cũ: mật khẩu scrypt (Node.js) và cờ bắt đổi mật khẩu."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.hashers import LegacyScryptPasswordHasher
from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

User = get_user_model()

# Sinh bằng Node: crypto.scryptSync("HocSinh@2026", salt, 64) — đúng cách bản cũ (server/utils/password.ts) băm
NODE_SCRYPT_HASH = (
    '0f5dd3464012d7b824df06d8a121e96b:'
    '5b43526789f08a47f08a759de914acb042c2b1cb0fcb60ebb6edca8f06569df3'
    '91ee59063a1360e3383bd88265fed750507074238951fc5ba074138a04ae57b2'
)
LEGACY_PASSWORD = 'HocSinh@2026'


@override_settings(DEBUG=True)
class LegacyPasswordTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='hs_cu', email='', password='x')
        self.user.password = LegacyScryptPasswordHasher.from_legacy(NODE_SCRYPT_HASH)
        self.user.save(update_fields=['password'])

    def test_node_hash_verifies(self):
        self.assertTrue(self.user.check_password(LEGACY_PASSWORD))
        self.assertFalse(User.objects.get(pk=self.user.pk).check_password('sai-mat-khau'))

    def test_login_upgrades_hash_to_pbkdf2(self):
        resp = APIClient().post('/api/v1/auth/login/', {'username': 'hs_cu', 'password': LEGACY_PASSWORD}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.password.startswith('pbkdf2_sha256$'))
        self.assertTrue(self.user.check_password(LEGACY_PASSWORD))

    def test_wrong_password_keeps_legacy_hash(self):
        resp = APIClient().post('/api/v1/auth/login/', {'username': 'hs_cu', 'password': 'sai-mat-khau'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.user.refresh_from_db()
        self.assertTrue(self.user.password.startswith('legacy_scrypt$'))


@override_settings(DEBUG=True)
class MustChangePasswordTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.teacher = User.objects.create_user(username='gv', email='gv@x.vn', password='Password123!')
        self.teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client = APIClient()
        self.client.force_authenticate(self.teacher)

    def test_created_account_must_change_password(self):
        resp = self.client.post('/api/v1/users/', {'username': 'hs1', 'full_name': 'Học sinh 1', 'password': 'Password123!'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertTrue(User.objects.get(username='hs1').must_change_password)

    def test_password_reset_by_other_sets_flag_and_change_clears_it(self):
        student = User.objects.create_user(username='hs2', email='', password='Password123!')
        resp = self.client.patch(f'/api/v1/users/{student.id}/', {'password': 'Reset@2026x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        student.refresh_from_db()
        self.assertTrue(student.must_change_password)

        login = APIClient().post('/api/v1/auth/login/', {'username': 'hs2', 'password': 'Reset@2026x'}, format='json')
        self.assertTrue(login.json()['data']['user']['must_change_password'])

        own = APIClient()
        own.force_authenticate(student)
        resp = own.post('/api/v1/auth/change-password/', {
            'old_password': 'Reset@2026x', 'new_password': 'MoiDoi@2026', 'confirm_password': 'MoiDoi@2026',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        student.refresh_from_db()
        self.assertFalse(student.must_change_password)

    def test_seed_core_creates_school_roles(self):
        self.assertEqual(
            set(Role.objects.values_list('role_code', flat=True)),
            {'ADMIN', 'TEACHER', 'STUDENT'},
        )
