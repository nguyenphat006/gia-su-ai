"""Test gia sư AI (mock Gemini): trả lời + XP + thử thách, bộ lọc nội dung, ảnh, lỗi AI, chỉ thấy phiên của mình."""
import io
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.academics.services import create_student
from apps.ai.client import AiUnavailable
from apps.analytics.models import LearningEvent
from apps.core.permissions import invalidate_user_permissions
from apps.gamification.models import UserStats, XpLog

from .models import ChatMessage

User = get_user_model()
BASE = '/api/v1/learn/chat/sessions/'


def png_bytes() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new('RGB', (2, 2), 'white').save(buf, 'PNG')
    return buf.getvalue()


@override_settings(DEBUG=True)
@mock.patch('apps.tutor.services.retrieve_context', return_value=('[Quang hợp]\nLá cây...', [7]))
class TutorChatTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.student = create_student(full_name='An', student_code='HS1', grade=6, password='MatKhau1').user
        self.client = APIClient()
        self.client.force_authenticate(self.student)
        self.session_id = self.client.post(BASE, {}, format='json').json()['data']['id']

    @mock.patch('apps.tutor.services.generate_text', return_value='Quang hợp là... **ĐÁP ÁN**')
    @mock.patch('apps.tutor.services.generate_json', return_value={'violated': False})
    def test_answer_awards_xp_and_uses_rag(self, _guard, gen, _ctx):
        resp = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': 'Quang hợp là gì?'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        data = resp.json()['data']
        self.assertEqual(data['ai_message']['role'], 'MODEL')
        self.assertEqual(data['xp_delta'], 10)
        self.assertEqual(data['session']['title'], 'Quang hợp là gì?')
        system_prompt = gen.call_args.kwargs['system_instruction']
        self.assertIn('Lá cây...', system_prompt)
        self.assertNotIn('{context}', system_prompt)
        self.assertEqual(ChatMessage.objects.get(id=data['ai_message']['id']).context_chunk_ids, [7])
        self.assertTrue(LearningEvent.objects.filter(user=self.student, event_type='CHAT').exists())

        msgs = self.client.get(f'{BASE}{self.session_id}/messages/').json()['data']
        self.assertEqual([m['role'] for m in msgs], ['USER', 'MODEL'])

    @mock.patch('apps.tutor.services.generate_text')
    @mock.patch('apps.tutor.services.generate_json', return_value={'violated': True, 'reason': 'thô tục'})
    def test_guard_blocks_and_penalizes(self, _guard, gen, _ctx):
        from apps.gamification.services import add_xp
        add_xp(self.student, 100, 'CHAT_AI')
        data = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': 'nội dung xấu'}, format='json').json()['data']
        self.assertTrue(data['blocked'])
        self.assertEqual(data['xp_delta'], -20)
        self.assertEqual(data['ai_message']['role'], 'SYSTEM')
        gen.assert_not_called()
        second = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': 'lần 2'}, format='json').json()['data']
        self.assertEqual(second['xp_delta'], -40)  # lần thứ 2 trong tháng: x2
        self.assertEqual(UserStats.objects.get(user=self.student).total_xp, 40)

    @mock.patch('apps.tutor.services.generate_text', return_value='Bài này giải như sau...')
    @mock.patch('apps.tutor.services.generate_json', return_value={'violated': False})
    def test_image_question(self, _guard, gen, _ctx):
        img = SimpleUploadedFile('bai.png', png_bytes(), content_type='image/png')
        data = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': '', 'image': img}, format='multipart').json()['data']
        self.assertEqual(len(data['user_message']['image_urls']), 1)
        self.assertEqual(gen.call_args.kwargs['image']['mime_type'], 'image/png')

    def test_empty_message_rejected(self, _ctx):
        body = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': '  '}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')

    @mock.patch('apps.tutor.services.generate_text', side_effect=AiUnavailable())
    @mock.patch('apps.tutor.services.generate_json', return_value={'violated': False})
    def test_ai_error_no_xp(self, _guard, _gen, _ctx):
        resp = self.client.post(f'{BASE}{self.session_id}/messages/', {'content': 'Lực là gì?'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(XpLog.objects.filter(user=self.student, action='CHAT_AI').exists())
        roles = list(ChatMessage.objects.filter(session_id=self.session_id).values_list('role', flat=True))
        self.assertEqual(roles, ['USER', 'SYSTEM'])

    def test_cannot_see_other_students_session(self, _ctx):
        other = create_student(full_name='Bình', student_code='HS2', grade=6, password='MatKhau1').user
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(f'{BASE}{self.session_id}/messages/').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(BASE).json()['data']['count'], 0)

    def test_delete_session(self, _ctx):
        self.assertEqual(self.client.delete(f'{BASE}{self.session_id}/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(BASE).json()['data']['count'], 0)
