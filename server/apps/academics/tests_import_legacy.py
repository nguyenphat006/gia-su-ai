"""Test lệnh import_legacy trên bộ dữ liệu cũ thu nhỏ (định dạng dump JSON của bản cũ)."""
import json
import tempfile
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.analytics.models import LearningEvent
from apps.arena.models import ArenaMatch
from apps.authentication.tests_legacy import LEGACY_PASSWORD, NODE_SCRYPT_HASH
from apps.gamification.models import XpLog
from apps.revision.models import Question
from apps.tutor.models import ChatMessage

User = get_user_model()
T = '2026-06-01T10:00:00.000Z'


def legacy_dump() -> dict:
    user = lambda uid, name, role='STUDENT': {  # noqa: E731
        'id': uid, 'username': name, 'email': None, 'displayName': name.upper(), 'passwordHash': NODE_SCRYPT_HASH,
        'role': role, 'status': 'ACTIVE', 'mustChangePassword': False, 'lastLoginAt': T, 'classId': None,
        'createdAt': T, 'updatedAt': T,
    }
    return {
        'class': [],
        'user': [user('u1', 'hs_a'), user('u2', 'hs_b'), user('u0', 'admin', 'ADMIN')],
        'studentProfile': [
            {'id': 's1', 'userId': 'u1', 'studentCode': 'hs001', 'grade': 6, 'createdAt': T, 'updatedAt': T},
            {'id': 's2', 'userId': 'u2', 'studentCode': 'HS002', 'grade': 6, 'createdAt': T, 'updatedAt': T},
        ],
        'teacherProfile': [],
        'userStats': [{'id': 'x', 'userId': 'u1', 'totalXp': 120, 'weeklyXp': 20, 'points': 5, 'currentStreak': 2,
                       'longestStreak': 4, 'lastStudyDate': T, 'updatedAt': T}],
        'xpLog': [
            {'id': 'l1', 'userId': 'u1', 'amount': 10, 'action': 'CHAT_AI', 'createdAt': T},
            {'id': 'l2', 'userId': 'u1', 'amount': -20, 'action': 'CHAT_AI', 'createdAt': T},
            {'id': 'l3', 'userId': 'u1', 'amount': 0, 'action': 'DAILY_LOGIN', 'createdAt': T},
        ],
        'challenge': [], 'userChallenge': [],
        'systemConfig': [{'key': 'AI_TEMPERATURE', 'value': '0.4'}, {'key': 'LOG_RETENTION_DAYS', 'value': '90'}],
        'knowledgeDocument': [{'id': 'k1', 'title': 'Tế bào', 'content': 'Tế bào là đơn vị...', 'tags': ['Sinh học', 'Khối 6', 'Hệ thống'],
                               'isActive': True, 'createdAt': T}],
        'sourceDocument': [],
        'questionBank': [
            {'id': 'q1', 'grade': 6, 'classId': None, 'topic': 'Tế bào', 'type': 'MULTIPLE_CHOICE', 'difficulty': 'Biết',
             'content': 'Câu 1', 'options': ['A', 'B', 'C', 'D'], 'correctAnswer': 'B', 'explanation': None,
             'isActive': True, 'status': 'APPROVED', 'sourceDocumentId': None, 'createdAt': T},
            {'id': 'q2', 'grade': 6, 'classId': None, 'topic': 'Tế bào', 'type': 'MULTIPLE_CHOICE', 'difficulty': 'Hiểu',
             'content': 'Câu thiếu phương án', 'options': [], 'correctAnswer': 'X', 'explanation': None,
             'isActive': True, 'status': 'APPROVED', 'sourceDocumentId': None, 'createdAt': T},
        ],
        'flashcardDeck': [], 'mindmapData': [
            {'id': 'm1', 'grade': 6, 'classId': None, 'topic': 'Vật thể', 'title': 'Vật thể',
             'markdown': json.dumps([{'id': 'root', 'label': 'Vật thể', 'parentId': None}]), 'isActive': True, 'createdAt': T}],
        'quizHistory': [],
        'arenaResult': [
            {'id': 'a1', 'userId': 'u1', 'score': 120, 'mode': 'PVP', 'winner': True, 'opponent': 'HS_B', 'topic': 'Lực',
             'xpEarned': 50, 'createdAt': '2026-06-01T10:00:00.000Z'},
            {'id': 'a2', 'userId': 'u2', 'score': 80, 'mode': 'PVP', 'winner': False, 'opponent': 'HS_A', 'topic': 'Lực',
             'xpEarned': 20, 'createdAt': '2026-06-01T10:00:05.000Z'},
            {'id': 'a3', 'userId': 'u1', 'score': 90, 'mode': 'AI', 'winner': True, 'opponent': 'AI', 'topic': 'Lực',
             'xpEarned': 100, 'createdAt': '2026-06-02T10:00:00.000Z'},
        ],
        'activityLog': [{'id': 'v1', 'userId': 'u1', 'action': 'Xem bộ Flashcard', 'createdAt': T},
                        {'id': 'v2', 'userId': 'u1', 'action': 'GET /me', 'createdAt': T}],
        'chatSession': [{'id': 'c1', 'userId': 'u1', 'title': 'Hỏi', 'createdAt': T, 'updatedAt': T}],
        'chatMessage': [
            {'id': 'cm1', 'sessionId': 'c1', 'role': 'USER', 'content': 'Hỏi gì', 'attachments': None, 'createdAt': T},
            {'id': 'cm2', 'sessionId': 'c1', 'role': 'MODEL', 'content': 'Trả lời', 'attachments': None, 'createdAt': T},
        ],
    }


@override_settings(DEBUG=True)
class ImportLegacyTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        self.path = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8').name
        with open(self.path, 'w', encoding='utf-8') as fh:
            json.dump(legacy_dump(), fh, ensure_ascii=False)

    def test_import_and_login_with_old_password(self):
        call_command('import_legacy', from_json=self.path, stdout=StringIO())
        student = User.objects.get(username='hs_a')
        self.assertTrue(student.roles.filter(role_code='STUDENT').exists())
        self.assertEqual(student.student_profile.student_code, 'HS001')
        admin = User.objects.get(username='admin')  # trùng tên -> giữ tài khoản mới, không ghi đè hash cũ
        self.assertFalse(admin.password.startswith('legacy_scrypt$'))

        # Đăng nhập bằng MÃ HỌC SINH + mật khẩu cũ -> hash tự nâng cấp
        resp = APIClient().post('/api/v1/auth/login/', {'username': 'HS001', 'password': LEGACY_PASSWORD}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        student.refresh_from_db()
        self.assertTrue(student.password.startswith('pbkdf2_sha256$'))

        self.assertEqual(student.stats.total_xp, 120)
        self.assertTrue(XpLog.objects.filter(user=student, action='GUARD_PENALTY', amount=-20).exists())
        self.assertFalse(Question.objects.get(content='Câu thiếu phương án').is_active)
        self.assertEqual(Question.objects.get(content='Câu 1').difficulty, 'NHAN_BIET')
        self.assertEqual(ChatMessage.objects.count(), 2)

        pvp = ArenaMatch.objects.get(mode='PVP')
        self.assertEqual(pvp.participants.count(), 2)  # 2 dòng cũ lệch 5 giây -> 1 trận
        self.assertEqual(ArenaMatch.objects.filter(mode='AI').count(), 1)
        kinds = sorted(LearningEvent.objects.filter(user=student).values_list('event_type', flat=True))
        self.assertEqual(kinds, ['ARENA', 'ARENA', 'CHAT', 'FLASHCARD_VIEW', 'LOGIN'])

        from apps.ai_settings.services import get_float, invalidate
        invalidate()
        self.assertEqual(get_float('AI_TEMPERATURE', 0), 0.4)

    def test_refuses_second_run(self):
        call_command('import_legacy', from_json=self.path, stdout=StringIO())
        with self.assertRaises(CommandError):
            call_command('import_legacy', from_json=self.path, stdout=StringIO())

    def test_dry_run_writes_nothing(self):
        call_command('import_legacy', from_json=self.path, dry_run=True, stdout=StringIO())
        self.assertFalse(User.objects.filter(username='hs_a').exists())
