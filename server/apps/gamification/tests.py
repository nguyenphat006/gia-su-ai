"""Test thành tích: XP không âm, thử thách theo kỳ (không hoàn thành sớm), chuỗi ngày, danh hiệu, bảng xếp hạng."""
from datetime import date, timedelta
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.academics.services import create_student
from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions

from . import services
from .models import UserChallenge, UserStats, XpAction, XpLog

User = get_user_model()


@override_settings(DEBUG=True)
class GamificationTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.student = create_student(full_name='Học sinh A', student_code='HSA', grade=6, password='MatKhau1').user
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def test_xp_never_negative(self):
        services.add_xp(self.student, 30, XpAction.CHAT_AI)
        applied = services.add_xp(self.student, -100, XpAction.GUARD_PENALTY)
        self.assertEqual(applied, -30)
        stats = UserStats.objects.get(user=self.student)
        self.assertEqual((stats.total_xp, stats.weekly_xp), (0, 0))

    def test_challenge_completes_exactly_at_goal_and_rewards_once(self):
        # S_GIA_CAU_HOI: 3 câu hỏi / ngày, thưởng 50 XP
        self.assertEqual(services.record_progress(self.student, 'CHAT_AI'), [])
        self.assertEqual(services.record_progress(self.student, 'CHAT_AI'), [])
        done = services.record_progress(self.student, 'CHAT_AI')
        self.assertEqual([c.code for c in done], ['S_GIA_CAU_HOI'])
        services.record_progress(self.student, 'CHAT_AI')  # vượt mục tiêu không thưởng thêm
        self.assertEqual(XpLog.objects.filter(user=self.student, action=XpAction.QUEST_COMPLETED).count(), 1)

    def test_daily_challenge_resets_next_day(self):
        for _ in range(3):
            services.record_progress(self.student, 'CHAT_AI')
        tomorrow = services.local_today() + timedelta(days=1)
        with mock.patch.object(services, 'local_today', return_value=tomorrow):
            services.record_progress(self.student, 'CHAT_AI')
            rows = UserChallenge.objects.filter(user=self.student, challenge__code='S_GIA_CAU_HOI')
            self.assertEqual(rows.count(), 2)
            current = self.client.get('/api/v1/learn/me/challenges/').json()['data']
            chat = next(c for c in current if c['code'] == 'S_GIA_CAU_HOI')
            self.assertEqual((chat['progress'], chat['completed']), (1, False))

    def test_check_in_streak(self):
        today = date(2026, 10, 17)
        with mock.patch.object(services, 'local_today', return_value=today - timedelta(days=1)):
            services.check_in(self.student)
        with mock.patch.object(services, 'local_today', return_value=today):
            first = self.client.post('/api/v1/learn/me/check-in/').json()['data']
            again = self.client.post('/api/v1/learn/me/check-in/').json()['data']
        self.assertEqual((first['checked_in'], first['current_streak']), (True, 2))
        self.assertFalse(again['checked_in'])
        stats = UserStats.objects.get(user=self.student)
        self.assertEqual(stats.points, 10)
        with mock.patch.object(services, 'local_today', return_value=today + timedelta(days=3)):
            self.assertEqual(services.check_in(self.student)['current_streak'], 1)  # bỏ ngày -> reset

    def test_level_info(self):
        info = services.level_info(300)
        self.assertEqual(info['title'], 'SỨ GIẢ CHÂN LÝ')
        self.assertEqual(info['next_title'], 'BẬC THẦY THỰC NGHIỆM')
        self.assertEqual(info['progress'], 20)
        self.assertEqual(services.level_info(9999)['progress'], 100)

    def test_guard_penalty_doubles_within_month(self):
        self.assertEqual(services.guard_penalty(self.student, 20), 20)
        services.add_xp(self.student, -20, XpAction.GUARD_PENALTY)
        self.assertEqual(services.guard_penalty(self.student, 20), 40)

    def test_my_stats_and_leaderboard(self):
        other = create_student(full_name='Học sinh B', student_code='HSB', grade=6, password='MatKhau1').user
        services.add_xp(self.student, 120, XpAction.CHAT_AI)
        services.add_xp(other, 300, XpAction.CHAT_AI)
        me = self.client.get('/api/v1/learn/me/stats/').json()['data']
        self.assertEqual((me['total_xp'], me['weekly_rank']), (120, 2))
        board = self.client.get('/api/v1/learn/leaderboard/?scope=weekly&grade=6').json()['data']
        self.assertEqual([r['full_name'] for r in board], ['Học sinh B', 'Học sinh A'])
        self.assertTrue(board[1]['is_me'])
        self.assertNotIn('username', board[0])

        services.reset_weekly_xp()
        self.assertEqual(self.client.get('/api/v1/learn/leaderboard/').json()['data'], [])
        self.assertEqual(len(self.client.get('/api/v1/learn/leaderboard/?scope=all').json()['data']), 2)

    def test_requires_learn_permission(self):
        nobody = User.objects.create_user(username='khach', email='', password='Password123!')
        self.client.force_authenticate(nobody)
        self.assertEqual(self.client.get('/api/v1/learn/me/stats/').status_code, status.HTTP_403_FORBIDDEN)
        teacher = User.objects.create_user(username='gv', email='', password='Password123!')
        teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client.force_authenticate(teacher)
        self.assertEqual(self.client.get('/api/v1/learn/me/stats/').status_code, status.HTTP_200_OK)
