"""Test Cấu hình AI: seed mặc định, kiểm tra kiểu giá trị, bảo vệ khóa hệ thống, cache."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

from . import services
from .defaults import DEFAULT_SETTINGS
from .models import AiSetting

User = get_user_model()
URL = '/api/v1/ai-settings/'


@override_settings(DEBUG=True)
class AiSettingApiTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.client = APIClient()
        self.client.force_authenticate(User.objects.get(username='admin'))

    def test_seed_creates_defaults_without_overwrite(self):
        self.assertEqual(AiSetting.objects.count(), len(DEFAULT_SETTINGS))
        AiSetting.objects.filter(key='AI_TEMPERATURE').update(value='0.2')
        call_command('seed_core', stdout=StringIO())
        self.assertEqual(AiSetting.objects.get(key='AI_TEMPERATURE').value, '0.2')

    def test_update_invalidates_cache(self):
        self.assertEqual(services.get_float('AI_TEMPERATURE', 0), 0.7)
        item = AiSetting.objects.get(key='AI_TEMPERATURE')
        resp = self.client.patch(f'{URL}{item.id}/', {'value': '0.3'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual(services.get_float('AI_TEMPERATURE', 0), 0.3)

    def test_value_type_validation(self):
        item = AiSetting.objects.get(key='AI_TEMPERATURE')
        body = self.client.patch(f'{URL}{item.id}/', {'value': 'nóng'}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')
        flag = AiSetting.objects.get(key='AI_GUARD_ENABLED')
        resp = self.client.patch(f'{URL}{flag.id}/', {'value': 'TRUE'}, format='json')
        self.assertEqual(resp.json()['data']['value'], 'true')

    def test_system_key_protected(self):
        item = AiSetting.objects.get(key='AI_MODEL')
        self.assertEqual(self.client.delete(f'{URL}{item.id}/').json()['code'], 'business_rule')
        body = self.client.patch(f'{URL}{item.id}/', {'key': 'OTHER'}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')

    def test_teacher_read_only(self):
        teacher = User.objects.create_user(username='gv', email='', password='Password123!')
        teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client.force_authenticate(teacher)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)
        item = AiSetting.objects.get(key='AI_MODEL')
        resp = self.client.patch(f'{URL}{item.id}/', {'value': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
