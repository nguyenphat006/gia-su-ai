"""Test báo cáo học tập: tổng quan, heatmap, thống kê học sinh, nhật ký hỏi đáp, đấu trường, phân quyền."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.academics.models import SchoolClass
from apps.academics.services import create_student
from apps.arena.models import ArenaMatch, ArenaParticipant
from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions
from apps.gamification.services import add_xp
from apps.revision.models import QuizAttempt
from apps.tutor.models import ChatMessage, ChatSession

from .models import EventType, record_event

User = get_user_model()


@override_settings(DEBUG=True)
class ReportTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.class_a = SchoolClass.objects.create(code='6A', name='6A', grade=6, academic_year='2026-2027')
        self.an = create_student(full_name='An', student_code='HS1', grade=6, school_class=self.class_a, password='MatKhau1').user
        self.binh = create_student(full_name='Bình', student_code='HS2', grade=7, password='MatKhau1').user
        teacher = User.objects.create_user(username='gv', email='', password='Password123!')
        teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client = APIClient()
        self.client.force_authenticate(teacher)

        session = ChatSession.objects.create(user=self.an, title='Hỏi')
        q = ChatMessage.objects.create(session=session, role='USER', content='Quang hợp là gì?')
        ChatMessage.objects.create(session=session, role='MODEL', content='Là quá trình...')
        record_event(self.an, EventType.CHAT, source=('CHAT_MESSAGE', q.id))
        record_event(self.an, EventType.CHAT)
        QuizAttempt.objects.create(user=self.an, total_questions=4, correct_count=3)
        record_event(self.an, EventType.QUIZ)
        record_event(self.binh, EventType.LOGIN)
        add_xp(self.an, 80, 'CHAT_AI')

    def test_overview_scoped_by_grade(self):
        data = self.client.get('/api/v1/reports/overview/').json()['data']
        self.assertEqual((data['total_students'], data['active_students'], data['chat_questions']), (2, 2, 2))
        self.assertEqual(data['quiz_accuracy'], 75)
        self.assertEqual(len(data['daily']), 30)
        grade7 = self.client.get('/api/v1/reports/overview/?grade=7').json()['data']
        self.assertEqual((grade7['total_students'], grade7['chat_questions']), (1, 0))

    def test_heatmap(self):
        cells = self.client.get('/api/v1/reports/heatmap/').json()['data']
        self.assertEqual(sum(c['count'] for c in cells), 4)
        self.assertTrue(all(1 <= c['weekday'] <= 7 and 0 <= c['hour'] <= 23 for c in cells))

    def test_student_stats_list_and_detail(self):
        rows = self.client.get('/api/v1/reports/students/?ordering=-chat_count').json()['data']['results']
        self.assertEqual(rows[0]['full_name'], 'An')
        self.assertEqual((rows[0]['chat_count'], rows[0]['quiz_count'], rows[0]['total_xp']), (2, 1, 80))
        self.assertEqual(rows[0]['school_class_name'], '6A')
        sid = rows[0]['id']
        summary = self.client.get(f'/api/v1/reports/students/{sid}/summary/').json()['data']
        self.assertEqual((summary['total_xp'], summary['quiz_accuracy']), (80, 75))
        timeline = self.client.get(f'/api/v1/reports/students/{sid}/timeline/').json()['data']
        self.assertEqual(timeline['count'], 3)

    def test_chat_logs_pair_question_with_answer(self):
        rows = self.client.get('/api/v1/reports/chat-logs/?q=quang').json()['data']['results']
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]['question'], rows[0]['answer'], rows[0]['class_name']), ('Quang hợp là gì?', 'Là quá trình...', '6A'))

    def test_arena_report_detail_shows_answers(self):
        match = ArenaMatch.objects.create(mode='AI', topic='Lực', status='FINISHED', questions=[
            {'content': 'Đơn vị lực?', 'options': ['N', 'kg', 'm', 's'], 'correct_answer': 'N', 'explanation': '', 'hint': '', 'difficulty': 'NHAN_BIET'}])
        ArenaParticipant.objects.create(match=match, user=self.an, score=25, correct_count=1, is_winner=True,
                                        answers=[{'question_index': 0, 'answer': 'N', 'is_correct': True, 'time_left': 15, 'points': 25}])
        ArenaParticipant.objects.create(match=match, user=None, score=0, answers=[])
        listing = self.client.get('/api/v1/reports/arena-matches/?mode=AI').json()['data']['results']
        self.assertEqual(listing[0]['participants'][1]['name'], 'Gia sư AI')
        detail = self.client.get(f'/api/v1/reports/arena-matches/{match.id}/').json()['data']
        self.assertEqual(detail['answers'][0]['players'][0]['answer'], 'N')

    def test_xp_leaderboard(self):
        rows = self.client.get('/api/v1/reports/xp-leaderboard/').json()['data']
        self.assertEqual([r['full_name'] for r in rows], ['An'])

    def test_student_cannot_read_reports(self):
        self.client.force_authenticate(self.an)
        self.assertEqual(self.client.get('/api/v1/reports/overview/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/v1/reports/chat-logs/').status_code, status.HTTP_403_FORBIDDEN)
