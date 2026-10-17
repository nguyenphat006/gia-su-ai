"""Test Ôn tập (quản trị): kiểm tra hợp lệ câu hỏi / flashcard / sơ đồ, AI soạn nháp (mock Gemini), phân quyền."""
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.ai.client import safe_json_loads
from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

User = get_user_model()

MC = {'grade': 6, 'topic': 'Tế bào', 'question_type': 'MULTIPLE_CHOICE', 'difficulty': 'NHAN_BIET',
      'content': 'Đơn vị cấu tạo cơ bản của sự sống là gì?', 'options': ['Tế bào', 'Mô', 'Cơ quan', 'Hệ cơ quan'],
      'correct_answer': 'Tế bào'}


@override_settings(DEBUG=True)
class RevisionAdminApiTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.teacher = User.objects.create_user(username='gv', email='', password='Password123!')
        self.teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client = APIClient()
        self.client.force_authenticate(self.teacher)

    def test_create_multiple_choice_question(self):
        resp = self.client.post('/api/v1/questions/', MC, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertEqual(resp.json()['data']['status'], 'APPROVED')

    def test_multiple_choice_rules(self):
        bad = {**MC, 'options': ['A', 'B', 'C']}
        self.assertIn('options', self.client.post('/api/v1/questions/', bad, format='json').json()['errors'])
        bad = {**MC, 'correct_answer': 'Phân tử'}
        self.assertIn('correct_answer', self.client.post('/api/v1/questions/', bad, format='json').json()['errors'])
        bad = {**MC, 'options': ['A', 'A', 'B', 'C'], 'correct_answer': 'A'}
        self.assertIn('options', self.client.post('/api/v1/questions/', bad, format='json').json()['errors'])

    def test_essay_drops_options(self):
        resp = self.client.post('/api/v1/questions/', {**MC, 'question_type': 'ESSAY', 'correct_answer': 'Tế bào là...'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        self.assertIsNone(resp.json()['data']['options'])

    def test_flashcard_validation(self):
        ok = {'topic': 'Lực', 'title': 'Lực cơ bản', 'cards': [{'front': 'Đơn vị lực?', 'back': 'Newton (N)'}]}
        self.assertEqual(self.client.post('/api/v1/flashcard-decks/', ok, format='json').status_code, status.HTTP_201_CREATED)
        bad = {**ok, 'cards': [{'front': 'Thiếu mặt sau'}]}
        self.assertIn('cards', self.client.post('/api/v1/flashcard-decks/', bad, format='json').json()['errors'])

    def test_mindmap_structure_validation(self):
        nodes = [{'id': 'root', 'label': 'Năng lượng', 'parentId': None}, {'id': 'a', 'label': 'Động năng', 'parentId': 'root'}]
        resp = self.client.post('/api/v1/mindmaps/', {'topic': 'Năng lượng', 'title': 'NL', 'nodes': nodes}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        two_roots = [*nodes, {'id': 'b', 'label': 'Gốc 2', 'parentId': None}]
        self.assertIn('nodes', self.client.post('/api/v1/mindmaps/', {'topic': 'x', 'title': 'x', 'nodes': two_roots}, format='json').json()['errors'])
        cycle = [{'id': 'root', 'label': 'R', 'parentId': None}, {'id': 'a', 'label': 'A', 'parentId': 'b'}, {'id': 'b', 'label': 'B', 'parentId': 'a'}]
        self.assertIn('nodes', self.client.post('/api/v1/mindmaps/', {'topic': 'x', 'title': 'x', 'nodes': cycle}, format='json').json()['errors'])

    @mock.patch('apps.revision.generation.retrieve_context', return_value=('', []))
    @mock.patch('apps.revision.generation.generate_json')
    def test_ai_draft_filters_invalid_questions(self, gen, _ctx):
        gen.return_value = {'questions': [
            {'content': 'Câu đúng định dạng', 'options': ['a', 'b', 'c', 'd'], 'correct_answer': 'b', 'difficulty': 'THONG_HIEU'},
            {'content': 'Đáp án không thuộc phương án', 'options': ['a', 'b', 'c', 'd'], 'correct_answer': 'z'},
            {'content': 'Thiếu phương án', 'options': ['a'], 'correct_answer': 'a'},
        ]}
        resp = self.client.post('/api/v1/questions/ai-draft/', {'topic': 'Tế bào', 'grade': 6, 'count': 3}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.assertEqual([d['content'] for d in resp.json()['data']], ['Câu đúng định dạng'])

    def test_student_cannot_access_admin_revision(self):
        student = User.objects.create_user(username='hs', email='', password='Password123!')
        student.roles.add(Role.objects.get(role_code='STUDENT'))
        self.client.force_authenticate(student)
        self.assertEqual(self.client.get('/api/v1/questions/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post('/api/v1/questions/ai-draft/', {'topic': 'x'}, format='json').status_code, status.HTTP_403_FORBIDDEN)


class SafeJsonTests(TestCase):
    def test_latex_backslashes_survive(self):
        raw = '{"a": "$\\frac{1}{2}$ và $\\beta$, $\\neq$, xuống dòng\\nmới, \\\\alpha"}'
        self.assertEqual(safe_json_loads(raw)['a'], '$\\frac{1}{2}$ và $\\beta$, $\\neq$, xuống dòng\nmới, \\alpha')

    def test_code_fence_stripped(self):
        self.assertEqual(safe_json_loads('```json\n{"x": 1}\n```'), {'x': 1})
