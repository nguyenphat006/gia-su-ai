"""
Ôn tập phía học sinh.

- Đề: lấy ngân hàng câu hỏi trước (ngẫu nhiên), thiếu thì AI sinh bù và lưu lại ngân hàng (origin AI) để dùng lại.
- Đề trả về KHÔNG kèm đáp án. Mỗi câu: học sinh gửi đáp án -> server chấm (tự luận: AI chấm, lưu kết quả 2 giờ).
- Nộp bài: server chấm lại toàn bộ (trắc nghiệm theo đáp án, tự luận theo kết quả AI đã chấm) -> XP = 10 / câu đúng.
- Kiểm tra flashcard: học sinh chọn mặt sau đúng cho từng thẻ, server chấm theo bộ thẻ.
"""
import random

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils.translation import gettext as _
from rest_framework.exceptions import NotFound, ValidationError

from apps.ai.client import AiUnavailable, generate_json
from apps.ai.prompts import essay_grading_prompt
from apps.analytics.models import EventType, record_event
from apps.gamification import services as gamification
from apps.gamification.models import TriggerAction, XpAction

from . import generation
from .models import FlashcardDeck, Mindmap, Origin, Question, QuestionStatus, QuestionType, QuizAttempt, QuizType

MAX_QUESTIONS = 20
ESSAY_RESULT_TTL = 2 * 60 * 60
GENERIC_TOPICS = ('', 'ôn tập khtn', 'tổng hợp')
DEFAULT_TOPIC = 'Ôn tập KHTN'  # dữ liệu lưu CSDL -> không dịch theo ngôn ngữ giao diện


def _visible_questions(user, grade, topic: str, question_type: str):
    qs = Question.objects.filter(is_active=True, status=QuestionStatus.APPROVED, question_type=question_type)
    if grade:
        qs = qs.filter(Q(grade=grade) | Q(grade__isnull=True))
    profile = getattr(user, 'student_profile', None)
    qs = qs.filter(Q(school_class__isnull=True) | Q(school_class_id=getattr(profile, 'school_class_id', None)))
    if topic.strip().lower() not in GENERIC_TOPICS:
        qs = qs.filter(topic__icontains=topic.strip())
    return qs


def pick_questions(user, *, grade, topic: str, count: int, question_type: str = QuestionType.MULTIPLE_CHOICE,
                   difficulties: list | None = None) -> list[Question]:
    """Câu hỏi cho 1 lượt (ôn tập / đấu trường): ngân hàng trước, AI bù phần thiếu."""
    count = max(1, min(count, MAX_QUESTIONS))
    qs = _visible_questions(user, grade, topic, question_type)
    if difficulties:
        qs = qs.filter(difficulty__in=difficulties)
    ids = list(qs.values_list('id', flat=True))
    chosen = list(Question.objects.filter(id__in=random.sample(ids, min(count, len(ids)))))
    missing = count - len(chosen)
    if missing > 0:
        try:
            drafts = generation.draft_questions(topic=topic or DEFAULT_TOPIC, grade=grade, count=missing,
                                                question_type=question_type, difficulties=difficulties or [])
        except AiUnavailable:
            if not chosen:
                raise
            drafts = []  # AI lỗi / hết lượt nhưng ngân hàng đã có câu -> vẫn cho làm bài với số câu hiện có
        with transaction.atomic():
            chosen += [
                Question.objects.create(grade=grade, topic=topic or DEFAULT_TOPIC, origin=Origin.AI,
                                        status=QuestionStatus.APPROVED, **d)
                for d in drafts
            ]
    random.shuffle(chosen)
    return chosen


def public_question(q: Question) -> dict:
    """Dạng gửi cho học sinh — không có đáp án / giải thích."""
    options = list(q.options or [])
    random.shuffle(options)
    return {'id': q.id, 'content': q.content, 'options': options or None, 'question_type': q.question_type,
            'difficulty': q.difficulty, 'topic': q.topic, 'hint': q.hint or ''}


def _essay_cache_key(user_id: int, question_id: int) -> str:
    return f'essay_result_{user_id}_{question_id}'


def check_answer(user, question_id: int, answer: str, image: dict | None = None) -> dict:
    question = Question.objects.filter(pk=question_id, is_active=True).first()
    if question is None:
        raise NotFound(_("Không tìm thấy câu hỏi."))
    if question.question_type == QuestionType.MULTIPLE_CHOICE:
        is_correct = (answer or '').strip() == question.correct_answer.strip()
        return {'is_correct': is_correct, 'correct_answer': question.correct_answer,
                'explanation': question.explanation or '', 'score': 10 if is_correct else 0, 'feedback': ''}

    if not (answer or '').strip() and not image:
        raise ValidationError({'answer': [_("Em hãy viết bài làm hoặc gửi ảnh bài làm.")]})
    result = generate_json(essay_grading_prompt(question=question.content, model_answer=question.correct_answer,
                                                answer=answer), image=image, temperature=0.2)
    score = max(0, min(10, int(float(result.get('score') or 0))))
    is_correct = bool(result.get('is_passing')) or score >= 5
    cache.set(_essay_cache_key(user.id, question.id), is_correct, ESSAY_RESULT_TTL)
    return {'is_correct': is_correct, 'correct_answer': question.correct_answer,
            'explanation': question.explanation or '', 'score': score, 'feedback': str(result.get('feedback') or '')}


def _finish(user, *, quiz_type: str, grade, topic, total: int, correct: int, answers: list) -> dict:
    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            user=user, quiz_type=quiz_type, grade=grade, topic=topic, total_questions=total, correct_count=correct,
            answers=answers, created_by=user, updated_by=user,
        )
        xp = gamification.add_xp(user, correct * gamification.XP_PER_CORRECT_ANSWER, XpAction.COMPLETE_QUIZ,
                                 source=('QUIZ_ATTEMPT', attempt.id)) if correct else 0
        attempt.xp_earned = xp
        attempt.save(update_fields=['xp_earned'])
    trigger = TriggerAction.FLASHCARD_QUIZ if quiz_type == QuizType.FLASHCARD_QUIZ else TriggerAction.COMPLETE_QUIZ
    completed = gamification.record_progress(user, trigger)
    record_event(user, EventType.QUIZ, source=('QUIZ_ATTEMPT', attempt.id), metadata={'grade': grade, 'topic': topic})
    return {'attempt_id': attempt.id, 'total_questions': total, 'correct_count': correct, 'xp_earned': xp,
            'completed_challenges': [c.name for c in completed], 'results': answers}


def submit_quiz(user, *, grade, topic: str, answers: list[dict]) -> dict:
    if not answers or len(answers) > MAX_QUESTIONS:
        raise ValidationError({'answers': [_("Bài nộp phải có từ 1 đến %(max)s câu.") % {"max": MAX_QUESTIONS}]})
    ids = [int(a['question_id']) for a in answers]
    if len(set(ids)) != len(ids):
        raise ValidationError({'answers': [_("Mỗi câu chỉ được nộp một lần.")]})
    questions = Question.objects.in_bulk(ids)
    graded = []
    for item in answers:
        q = questions.get(int(item['question_id']))
        if q is None:
            raise ValidationError({'answers': [_("Câu hỏi %(id)s không tồn tại.") % {"id": item['question_id']}]})
        if q.question_type == QuestionType.MULTIPLE_CHOICE:
            ok = (item.get('answer') or '').strip() == q.correct_answer.strip()
        else:
            ok = bool(cache.get(_essay_cache_key(user.id, q.id)))
        graded.append({'question_id': q.id, 'answer': item.get('answer') or '', 'is_correct': ok,
                       'correct_answer': q.correct_answer, 'explanation': q.explanation or ''})
    correct = sum(1 for g in graded if g['is_correct'])
    return _finish(user, quiz_type=QuizType.CHINH_PHUC, grade=grade, topic=topic, total=len(graded),
                   correct=correct, answers=graded)


def submit_flashcard_quiz(user, *, deck_id: int, answers: list[dict]) -> dict:
    deck = FlashcardDeck.objects.filter(pk=deck_id, is_active=True).first()
    if deck is None:
        raise NotFound(_("Không tìm thấy bộ thẻ."))
    cards = deck.cards or []
    graded = []
    for item in answers:
        idx = int(item.get('card_index', -1))
        if not 0 <= idx < len(cards):
            raise ValidationError({'answers': [_("Thẻ số %(idx)s không có trong bộ.") % {"idx": idx}]})
        ok = (item.get('answer') or '').strip() == cards[idx]['back'].strip()
        graded.append({'card_index': idx, 'answer': item.get('answer') or '', 'is_correct': ok,
                       'correct_answer': cards[idx]['back']})
    if not graded:
        raise ValidationError({'answers': [_("Bài nộp chưa có câu trả lời nào.")]})
    correct = sum(1 for g in graded if g['is_correct'])
    return _finish(user, quiz_type=QuizType.FLASHCARD_QUIZ, grade=deck.grade, topic=deck.topic, total=len(graded),
                   correct=correct, answers=graded)


def _find_or_generate(model, user, *, grade, topic: str, draft_fn, event_type: str, payload_field: str):
    qs = model.objects.filter(is_active=True, topic__icontains=topic.strip())
    if grade:
        qs = qs.filter(Q(grade=grade) | Q(grade__isnull=True))
    item = qs.order_by('-updated_at').first()
    if item is None:
        draft = draft_fn(topic=topic, grade=grade)
        if not draft[payload_field]:
            raise ValidationError({'topic': [_("Chưa tạo được nội dung cho chủ đề này, em thử chủ đề khác nhé.")]})
        item = model.objects.create(grade=grade, topic=topic, title=draft['title'], origin=Origin.AI,
                                    **{payload_field: draft[payload_field]})
    record_event(user, event_type, source=(model.__name__.upper(), item.id), metadata={'grade': grade, 'topic': topic})
    return item


def get_flashcards(user, *, grade, topic: str) -> FlashcardDeck:
    return _find_or_generate(FlashcardDeck, user, grade=grade, topic=topic, draft_fn=generation.draft_flashcards,
                             event_type=EventType.FLASHCARD_VIEW, payload_field='cards')


def get_mindmap(user, *, grade, topic: str) -> Mindmap:
    return _find_or_generate(Mindmap, user, grade=grade, topic=topic, draft_fn=generation.draft_mindmap,
                             event_type=EventType.MINDMAP_VIEW, payload_field='nodes')


def available_topics(grade=None) -> list[str]:
    qs = Question.objects.filter(is_active=True, status=QuestionStatus.APPROVED)
    if grade:
        qs = qs.filter(Q(grade=grade) | Q(grade__isnull=True))
    return sorted(set(qs.values_list('topic', flat=True)))[:200]
