"""Test đấu trường: chấm điểm PvP / AI ở server, XP, xử thua khi rời trận, WebSocket thách đấu end-to-end."""
from io import StringIO
from unittest import mock

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.academics.services import create_student
from apps.core.permissions import invalidate_user_permissions
from apps.gamification.models import UserStats
from apps.revision.models import Question

from . import services
from .models import ArenaMatch, MatchMode, MatchStatus

User = get_user_model()


def seed_questions(n=3):
    for i in range(n):
        Question.objects.create(grade=6, topic='Ôn tập KHTN', content=f'Câu {i}', options=['A', 'B', 'C', 'D'],
                                correct_answer='B', explanation='vì B')


@override_settings(DEBUG=True)
class ArenaServiceTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        cache.clear()
        seed_questions()
        self.a = create_student(full_name='An', student_code='HSA', grade=6, password='MatKhau1').user
        self.b = create_student(full_name='Bình', student_code='HSB', grade=6, password='MatKhau1').user

    def test_pvp_scoring_waits_for_both_and_rewards_speed(self):
        match = services.create_match(mode=MatchMode.PVP, users=[self.a, self.b], topic='Ôn tập KHTN', grade=6, count=1)
        with mock.patch.object(services, '_time_left', return_value=20):
            first = services.submit_answer(match.id, self.a, 0, 'B')
        self.assertIsNone(first['scores'])  # đối thủ chưa trả lời -> chưa chia điểm
        with mock.patch.object(services, '_time_left', return_value=10):
            second = services.submit_answer(match.id, self.b, 0, 'B')
        self.assertEqual(second['scores'], {str(self.a.id): 15, str(self.b.id): 10})

        finished = services.finish_match(match.id)
        winner = finished.participants.get(is_winner=True)
        self.assertEqual(winner.user, self.a)
        self.assertEqual((winner.xp_earned, finished.participants.get(user=self.b).xp_earned), (50, 20))

    def test_cannot_skip_or_repeat_question(self):
        match = services.create_match(mode=MatchMode.PVP, users=[self.a, self.b], topic='', grade=6, count=2)
        with self.assertRaises(Exception):
            services.submit_answer(match.id, self.a, 1, 'B')
        services.submit_answer(match.id, self.a, 0, 'B')
        with self.assertRaises(Exception):
            services.submit_answer(match.id, self.a, 0, 'B')

    def test_timeout_answer_is_wrong(self):
        match = services.create_match(mode=MatchMode.PVP, users=[self.a, self.b], topic='', grade=6, count=1)
        with mock.patch.object(services, '_time_left', return_value=0):
            self.assertFalse(services.submit_answer(match.id, self.a, 0, 'B')['result']['is_correct'])

    def test_forfeit_gives_opponent_win(self):
        match = services.create_match(mode=MatchMode.PVP, users=[self.a, self.b], topic='', grade=6, count=2)
        finished = services.finish_match(match.id, forfeit_user_id=self.a.id)
        self.assertEqual(finished.status, MatchStatus.ABANDONED)
        self.assertTrue(finished.participants.get(user=self.b).is_winner)
        self.assertEqual(services.finish_match(match.id).status, MatchStatus.ABANDONED)  # idempotent

    def test_ai_match_rest_flow(self):
        client = APIClient()
        client.force_authenticate(self.a)
        start = client.post('/api/v1/learn/arena/ai/start/', {'count': 2}, format='json').json()['data']
        self.assertTrue(all('correct_answer' not in q for q in start['questions']))
        mid = start['match_id']
        with mock.patch('apps.arena.services.random.random', return_value=0.99):  # AI trả lời sai
            for q in start['questions']:
                out = client.post(f'/api/v1/learn/arena/matches/{mid}/answer/', {'question_index': q['index'], 'answer': 'B'},
                                  format='json').json()['data']
                self.assertTrue(out['result']['is_correct'])
                self.assertFalse(out['opponent_move']['is_correct'])
        self.assertTrue(out['done'])
        result = client.post(f'/api/v1/learn/arena/matches/{mid}/finish/').json()['data']
        me = next(p for p in result['participants'] if p['is_me'])
        self.assertTrue(me['is_winner'])
        self.assertEqual(me['xp_earned'], 100)
        ai = next(p for p in result['participants'] if not p['is_me'])
        self.assertEqual((ai['name'], ai['score']), ('Gia sư AI', 0))  # điểm AI thật, không bịa

        stats = client.get('/api/v1/learn/arena/me/stats/').json()['data']
        self.assertEqual((stats['total_matches'], stats['wins'], stats['win_rate']), (1, 1, 100))
        board = client.get('/api/v1/learn/arena/leaderboard/').json()['data']
        self.assertEqual(board[0]['user_id'], self.a.id)

        with mock.patch('apps.arena.services.generate_json', return_value={'score': 9, 'analysis': 'Tốt', 'advice': 'Ôn lại'}), \
                mock.patch('apps.arena.services.retrieve_context', return_value=('', [])):
            analysis = client.post(f'/api/v1/learn/arena/matches/{mid}/analysis/').json()['data']
        self.assertEqual(analysis['advice'], 'Ôn lại')
        self.assertIn(str(self.a.id), ArenaMatch.objects.get(pk=mid).ai_analysis)

    def test_other_student_cannot_answer_my_match(self):
        match = services.create_match(mode=MatchMode.AI, users=[self.a], topic='', grade=6, count=1)
        client = APIClient()
        client.force_authenticate(self.b)
        resp = client.post(f'/api/v1/learn/arena/matches/{match.id}/answer/', {'question_index': 0, 'answer': 'B'}, format='json')
        self.assertEqual(resp.status_code, 404)


@override_settings(DEBUG=True, CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class ArenaWebsocketTests(TransactionTestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        cache.clear()
        seed_questions(2)
        self.a = create_student(full_name='An', student_code='HSA', grade=6, password='MatKhau1').user
        self.b = create_student(full_name='Bình', student_code='HSB', grade=6, password='MatKhau1').user

    def _ws(self, user):
        from config.asgi import application
        token = str(AccessToken.for_user(user)) if user else 'sai'
        return WebsocketCommunicator(application, f'/ws/arena/?token={token}', headers=[(b'origin', b'http://localhost')])

    async def _receive_type(self, ws, wanted):
        while True:
            msg = await ws.receive_json_from(timeout=5)
            if msg['type'] == wanted:
                return msg

    def test_rejects_invalid_token(self):
        async def run():
            ws = self._ws(None)
            connected, code = await ws.connect()
            self.assertFalse(connected)
            self.assertEqual(code, 4401)
        async_to_sync(run)()

    def test_challenge_and_full_match(self):
        async def run():
            ws_a, ws_b = self._ws(self.a), self._ws(self.b)
            self.assertTrue((await ws_a.connect())[0])
            self.assertTrue((await ws_b.connect())[0])

            await ws_a.send_json_to({'type': 'lobby.list'})
            lobby = await self._receive_type(ws_a, 'lobby.players')
            self.assertEqual([p['user_id'] for p in lobby['players']], [self.b.id])

            await ws_a.send_json_to({'type': 'challenge.send', 'target_user_id': self.b.id, 'config': {'count': 2}})
            received = await self._receive_type(ws_b, 'challenge.received')
            self.assertEqual(received['from']['name'], 'An')

            await ws_b.send_json_to({'type': 'challenge.respond', 'challenge_id': received['challenge_id'], 'accept': True})
            start_a = await self._receive_type(ws_a, 'match.start')
            start_b = await self._receive_type(ws_b, 'match.start')
            self.assertEqual(start_a['match_id'], start_b['match_id'])
            self.assertNotIn('correct_answer', start_a['questions'][0])
            mid = start_a['match_id']

            for idx in range(2):
                await ws_a.send_json_to({'type': 'match.answer', 'match_id': mid, 'question_index': idx, 'answer': 'B'})
                self.assertTrue((await self._receive_type(ws_a, 'match.answer_result'))['is_correct'])
                await ws_b.send_json_to({'type': 'match.answer', 'match_id': mid, 'question_index': idx, 'answer': 'A'})
                self.assertFalse((await self._receive_type(ws_b, 'match.answer_result'))['is_correct'])

            finished = await self._receive_type(ws_a, 'match.finished')
            winners = [p['user_id'] for p in finished['participants'] if p['is_winner']]
            self.assertEqual(winners, [self.a.id])
            await self._receive_type(ws_b, 'match.finished')
            await ws_a.disconnect()
            await ws_b.disconnect()
        async_to_sync(run)()
        self.assertEqual(UserStats.objects.get(user=self.a).total_xp, 50)
        self.assertEqual(UserStats.objects.get(user=self.b).total_xp, 20)

    def test_disconnect_mid_match_forfeits(self):
        async def run():
            ws_a, ws_b = self._ws(self.a), self._ws(self.b)
            await ws_a.connect()
            await ws_b.connect()
            await ws_a.send_json_to({'type': 'queue.join', 'same_grade': True})
            await self._receive_type(ws_a, 'queue.waiting')
            await ws_b.send_json_to({'type': 'queue.join', 'same_grade': True})
            start = await self._receive_type(ws_b, 'match.start')
            await self._receive_type(ws_a, 'match.start')
            await ws_a.disconnect(timeout=10)  # disconnect() ghi DB (xử thua) -> mặc định 1s là chưa đủ
            finished = await self._receive_type(ws_b, 'match.finished')
            self.assertEqual(finished['forfeit_user_id'], self.a.id)
            self.assertEqual(finished['match_id'], start['match_id'])
            await ws_b.disconnect()
        async_to_sync(run)()
