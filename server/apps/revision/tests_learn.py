"""Test ôn tập phía học sinh: đề không lộ đáp án, AI bù câu thiếu, chấm ở server, XP, flashcard quiz, tự luận AI chấm."""
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.academics.services import create_student
from apps.core.permissions import invalidate_user_permissions
from apps.gamification.models import UserChallenge, UserStats

from .models import FlashcardDeck, Origin, Question, QuestionStatus, QuizAttempt

User = get_user_model()
P = '/api/v1/learn/practice/'


def make_mc(i, topic='Tế bào', grade=6, **kw):
    return Question.objects.create(grade=grade, topic=topic, content=f'Câu {i}?', options=['A', 'B', 'C', 'D'],
                                   correct_answer='B', explanation=f'Giải thích {i}', **kw)


@override_settings(DEBUG=True)
@mock.patch('apps.revision.generation.retrieve_context', return_value=('', []))
class LearnPracticeTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.student = create_student(full_name='An', student_code='HS1', grade=6, password='MatKhau1').user
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def test_start_hides_answers_and_fills_gap_with_ai(self, _ctx):
        for i in range(2):
            make_mc(i)
        make_mc(9, status=QuestionStatus.PENDING)  # chưa duyệt -> không dùng
        ai_items = {'questions': [{'content': 'Câu AI?', 'options': ['x', 'y', 'z', 't'], 'correct_answer': 'y'}]}
        with mock.patch('apps.revision.generation.generate_json', return_value=ai_items):
            data = self.client.post(f'{P}quiz/start/', {'topic': 'Tế bào', 'count': 3}, format='json').json()['data']
        self.assertEqual(len(data), 3)
        self.assertTrue(all('correct_answer' not in q and 'explanation' not in q for q in data))
        self.assertTrue(Question.objects.filter(content='Câu AI?', origin=Origin.AI, status=QuestionStatus.APPROVED).exists())

    def test_check_and_submit_graded_on_server(self, _ctx):
        q1, q2 = make_mc(1), make_mc(2)
        check = self.client.post(f'{P}quiz/check/', {'question_id': q1.id, 'answer': 'B'}, format='json').json()['data']
        self.assertTrue(check['is_correct'])
        self.assertEqual(check['explanation'], 'Giải thích 1')

        resp = self.client.post(f'{P}quiz/submit/', {'topic': 'Tế bào', 'answers': [
            {'question_id': q1.id, 'answer': 'B'}, {'question_id': q2.id, 'answer': 'A'},
        ]}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        data = resp.json()['data']
        self.assertEqual((data['correct_count'], data['total_questions']), (1, 2))
        # 10 XP câu đúng + 50 XP thử thách "Chiến Binh Trí Tuệ"
        self.assertEqual(data['xp_earned'], 10)
        self.assertEqual(data['completed_challenges'], ['Chiến Binh Trí Tuệ'])
        self.assertEqual(UserStats.objects.get(user=self.student).total_xp, 60)
        self.assertEqual(QuizAttempt.objects.get(pk=data['attempt_id']).grade, 6)

        history = self.client.get(f'{P}quiz/history/').json()['data']
        self.assertEqual(len(history), 1)

    def test_submit_rejects_duplicates(self, _ctx):
        q = make_mc(1)
        body = self.client.post(f'{P}quiz/submit/', {'answers': [{'question_id': q.id, 'answer': 'B'}] * 2}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')

    @mock.patch('apps.revision.practice.generate_json', return_value={'score': 7, 'is_passing': True, 'feedback': 'Tốt'})
    def test_essay_graded_by_ai_then_counted_on_submit(self, _gen, _ctx):
        q = Question.objects.create(grade=6, topic='Lực', question_type='ESSAY', content='Lực là gì?', correct_answer='Lực là...')
        check = self.client.post(f'{P}quiz/check/', {'question_id': q.id, 'answer': 'Lực là sự đẩy hoặc kéo'}, format='json').json()['data']
        self.assertEqual((check['score'], check['is_correct'], check['feedback']), (7, True, 'Tốt'))
        data = self.client.post(f'{P}quiz/submit/', {'answers': [{'question_id': q.id, 'answer': 'x'}]}, format='json').json()['data']
        self.assertEqual(data['correct_count'], 1)

    def test_flashcard_quiz_completes_da_tai_challenge(self, _ctx):
        deck = FlashcardDeck.objects.create(grade=6, topic='Lực', title='Lực', cards=[
            {'front': 'Đơn vị lực', 'back': 'Newton'}, {'front': 'Dụng cụ đo lực', 'back': 'Lực kế'}])
        data = self.client.post(f'{P}flashcards/submit/', {'deck_id': deck.id, 'answers': [
            {'card_index': 0, 'answer': 'Newton'}, {'card_index': 1, 'answer': 'Newton'}]}, format='json').json()['data']
        self.assertEqual(data['correct_count'], 1)
        self.assertIn('Chiến Binh Đa Tài', data['completed_challenges'])
        self.assertTrue(UserChallenge.objects.filter(user=self.student, challenge__code='CHIEN_BINH_DA_TAI', completed_at__isnull=False).exists())

    def test_flashcards_and_mindmap_reuse_or_generate(self, _ctx):
        FlashcardDeck.objects.create(grade=6, topic='Năng lượng', title='Có sẵn', cards=[{'front': 'a', 'back': 'b'}])
        data = self.client.post(f'{P}flashcards/', {'topic': 'năng lượng'}, format='json').json()['data']
        self.assertEqual(data['title'], 'Có sẵn')
        draft = {'title': 'Sơ đồ AI', 'nodes': [{'id': 'root', 'label': 'Ánh sáng', 'parentId': None}]}
        with mock.patch('apps.revision.generation.generate_json', return_value=draft):
            mm = self.client.post(f'{P}mindmap/', {'topic': 'Ánh sáng'}, format='json').json()['data']
        self.assertEqual(mm['title'], 'Sơ đồ AI')
        with mock.patch('apps.revision.generation.generate_json') as gen:
            self.client.post(f'{P}mindmap/', {'topic': 'Ánh sáng'}, format='json')
            gen.assert_not_called()  # lần 2 dùng lại

    def test_class_specific_question_hidden_from_other_class(self, _ctx):
        from apps.academics.models import SchoolClass
        other = SchoolClass.objects.create(code='6B', name='6B', grade=6, academic_year='2026-2027')
        make_mc(1, school_class=other)
        with mock.patch('apps.revision.generation.generate_json', return_value={'questions': []}):
            data = self.client.post(f'{P}quiz/start/', {'topic': 'Tế bào', 'count': 1}, format='json').json()['data']
        self.assertEqual(data, [])
