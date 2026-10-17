"""
Nghiệp vụ đấu trường (dùng chung cho REST đấu AI và WebSocket PvP). Server giữ đáp án và đo thời gian.

Tính điểm (giữ như bản cũ):
- PvP: mỗi câu cộng khi CẢ HAI đã trả lời — cùng đúng: nhanh hơn 15, chậm hơn 10 (bằng thời gian: 10/10);
  chỉ một người đúng: 10.
- Đấu AI: người chơi đúng = 10 + số giây còn lại; AI "nghĩ" 3–7 giây, đúng 70%, đúng = 15 + (giây còn lại // 2).
- XP: AI 50 (thắng 100), PvP 20 (thắng 50). Hòa không ai thắng.
Mỗi câu 30 giây tính từ lúc người chơi nhận câu (câu đầu: lúc bắt đầu trận; câu sau: lúc trả lời câu trước).
"""
import random

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework.exceptions import NotFound, ValidationError

from apps.ai.client import generate_json
from apps.ai.prompts import performance_prompt
from apps.analytics.models import EventType, record_event
from apps.gamification import services as gamification
from apps.gamification.models import TriggerAction, XpAction
from apps.knowledge.rag import retrieve_context
from apps.revision.models import QuestionType
from apps.revision.practice import DEFAULT_TOPIC, pick_questions

from .models import ArenaMatch, ArenaParticipant, MatchMode, MatchStatus

SECONDS_PER_QUESTION = 30
DEFAULT_COUNT = 10
AI_ACCURACY = 0.7
AI_THINK_SECONDS = (3, 7)
PVP_FAST, PVP_SLOW = 15, 10
TIMER_TTL = 2 * 60 * 60


# ------------------------------------------------------------------------------------------------ tạo trận
def _snapshot(question) -> dict:
    options = list(question.options or [])
    random.shuffle(options)
    return {'id': question.id, 'content': question.content, 'options': options, 'correct_answer': question.correct_answer,
            'explanation': question.explanation or '', 'hint': question.hint or '', 'difficulty': question.difficulty}


def public_questions(match: ArenaMatch) -> list[dict]:
    return [{'index': i, 'content': q['content'], 'options': q['options'], 'hint': q['hint'], 'difficulty': q['difficulty']}
            for i, q in enumerate(match.questions)]


def _timer_key(match_id: int, user_id) -> str:
    return f'arena_timer_{match_id}_{user_id or "ai"}'


def _start_timer(match_id: int, user_id):
    cache.set(_timer_key(match_id, user_id), timezone.now().timestamp(), TIMER_TTL)


def create_match(*, mode: str, users: list, topic: str, grade=None, count: int = DEFAULT_COUNT,
                 difficulties: list | None = None) -> ArenaMatch:
    questions = pick_questions(users[0], grade=grade, topic=topic, count=count,
                               question_type=QuestionType.MULTIPLE_CHOICE, difficulties=difficulties)
    if not questions:
        raise ValidationError({'topic': [_("Chưa có câu hỏi cho chủ đề này, em chọn chủ đề khác nhé.")]})
    with transaction.atomic():
        match = ArenaMatch.objects.create(
            mode=mode, grade=grade, topic=topic or DEFAULT_TOPIC, questions=[_snapshot(q) for q in questions],
            created_by=users[0], updated_by=users[0],
        )
        players = [*users, None] if mode == MatchMode.AI else users
        for user in players:
            ArenaParticipant.objects.create(match=match, user=user, answers=[])
    for user in users:
        _start_timer(match.id, user.id)
    return match


def get_participant(match_id: int, user) -> ArenaParticipant:
    participant = ArenaParticipant.objects.select_related('match').filter(match_id=match_id, user=user).first()
    if participant is None:
        raise NotFound(_("Không tìm thấy trận đấu."))
    return participant


# ------------------------------------------------------------------------------------------------ trả lời
def _time_left(match_id: int, user_id) -> int:
    started = cache.get(_timer_key(match_id, user_id))
    if started is None:
        return 0
    return max(0, SECONDS_PER_QUESTION - int(timezone.now().timestamp() - started))


def _award_pvp(question_index: int, me: ArenaParticipant, other: ArenaParticipant):
    """Cả hai đã trả lời câu `question_index` -> chia điểm câu đó."""
    mine = next(a for a in me.answers if a['question_index'] == question_index)
    theirs = next(a for a in other.answers if a['question_index'] == question_index)
    if mine.get('points') is not None:
        return
    if mine['is_correct'] and theirs['is_correct']:
        if mine['time_left'] == theirs['time_left']:
            mine['points'] = theirs['points'] = PVP_SLOW
        elif mine['time_left'] > theirs['time_left']:
            mine['points'], theirs['points'] = PVP_FAST, PVP_SLOW
        else:
            mine['points'], theirs['points'] = PVP_SLOW, PVP_FAST
    else:
        mine['points'] = PVP_SLOW if mine['is_correct'] else 0
        theirs['points'] = PVP_SLOW if theirs['is_correct'] else 0
    for p in (me, other):
        p.score = sum(a.get('points') or 0 for a in p.answers)
        p.save(update_fields=['answers', 'score', 'updated_at'])


def _ai_move(match: ArenaMatch, ai: ArenaParticipant, question_index: int) -> dict:
    question = match.questions[question_index]
    time_left = SECONDS_PER_QUESTION - random.randint(*AI_THINK_SECONDS)
    correct = random.random() < AI_ACCURACY
    wrong_options = [o for o in question['options'] if o != question['correct_answer']] or [question['correct_answer']]
    entry = {'question_index': question_index, 'answer': question['correct_answer'] if correct else random.choice(wrong_options),
             'is_correct': correct, 'time_left': time_left, 'points': 15 + time_left // 2 if correct else 0}
    ai.answers.append(entry)
    ai.correct_count += int(correct)
    ai.score += entry['points']
    ai.save(update_fields=['answers', 'correct_count', 'score', 'updated_at'])
    return entry


def submit_answer(match_id: int, user, question_index: int, answer: str) -> dict:
    """Chấm 1 câu. Trả {result, opponent_move (đấu AI), scores (khi PvP đủ 2 người trả lời câu đó), done}."""
    with transaction.atomic():
        match = ArenaMatch.objects.select_for_update().get(pk=match_id)
        participants = list(match.participants.select_for_update())
        me = next((p for p in participants if p.user_id == user.id), None)
        if me is None:
            raise NotFound(_("Không tìm thấy trận đấu."))
        if match.status != MatchStatus.IN_PROGRESS:
            raise ValidationError({'match': [_("Trận đấu đã kết thúc.")]})
        if question_index != len(me.answers) or question_index >= len(match.questions):
            raise ValidationError({'question_index': [_("Câu hỏi không hợp lệ.")]})

        question = match.questions[question_index]
        time_left = _time_left(match.id, user.id)
        is_correct = time_left > 0 and (answer or '').strip() == question['correct_answer'].strip()
        entry = {'question_index': question_index, 'answer': answer or '', 'is_correct': is_correct,
                 'time_left': time_left, 'points': None}
        if match.mode == MatchMode.AI:
            entry['points'] = 10 + time_left if is_correct else 0
        me.answers.append(entry)
        me.correct_count += int(is_correct)
        me.score = sum(a.get('points') or 0 for a in me.answers)
        me.save(update_fields=['answers', 'correct_count', 'score', 'updated_at'])

        other = next(p for p in participants if p.pk != me.pk)
        opponent_move, scores = None, None
        if match.mode == MatchMode.AI:
            opponent_move = _ai_move(match, other, question_index)
        elif len(other.answers) > question_index:
            _award_pvp(question_index, me, other)
            scores = {str(p.user_id): p.score for p in (me, other)}
        _start_timer(match.id, user.id)
        done = len(me.answers) >= len(match.questions)

    return {
        'result': {'question_index': question_index, 'is_correct': is_correct, 'correct_answer': question['correct_answer'],
                   'explanation': question['explanation'], 'time_left': time_left, 'points': entry['points']},
        'opponent_move': opponent_move, 'scores': scores, 'done': done,
        'my_score': me.score, 'opponent_score': other.score,
    }


# ------------------------------------------------------------------------------------------------ kết thúc
def _xp_for(mode: str, won: bool) -> int:
    return gamification.XP_ARENA[(mode, won)]


def all_answered(match: ArenaMatch) -> bool:
    return all(len(p.answers) >= len(match.questions) for p in match.participants.all())


def finish_match(match_id: int, *, forfeit_user_id=None) -> ArenaMatch:
    """Chốt kết quả (idempotent). `forfeit_user_id`: người rời trận -> đối thủ thắng."""
    with transaction.atomic():
        match = ArenaMatch.objects.select_for_update().get(pk=match_id)
        if match.status != MatchStatus.IN_PROGRESS:
            return match
        participants = list(match.participants.select_related('user'))
        if forfeit_user_id is None and not all(len(p.answers) >= len(match.questions) for p in participants):
            raise ValidationError({'match': [_("Trận đấu chưa trả lời hết câu hỏi.")]})
        if forfeit_user_id is not None:
            winners = [p for p in participants if p.user_id != forfeit_user_id]
        else:
            top = max(p.score for p in participants)
            leaders = [p for p in participants if p.score == top]
            winners = leaders if len(leaders) == 1 else []  # hòa: không ai thắng
        for p in participants:
            p.is_winner = p in winners
            if p.user is not None:
                p.xp_earned = gamification.add_xp(p.user, _xp_for(match.mode, p.is_winner), XpAction.ARENA,
                                                  source=('ARENA_MATCH', match.id))
            p.save(update_fields=['is_winner', 'xp_earned', 'updated_at'])
        match.status = MatchStatus.ABANDONED if forfeit_user_id else MatchStatus.FINISHED
        match.ended_at = timezone.now()
        match.save(update_fields=['status', 'ended_at', 'updated_at'])

    for p in participants:
        if p.user is not None:
            gamification.record_progress(p.user, TriggerAction.ARENA)
            record_event(p.user, EventType.ARENA, source=('ARENA_MATCH', match.id),
                         metadata={'mode': match.mode, 'topic': match.topic, 'winner': p.is_winner})
    return match


def match_result(match: ArenaMatch, user) -> dict:
    rows = []
    for p in match.participants.select_related('user').order_by('id'):
        rows.append({'user_id': p.user_id, 'name': p.user.full_name if p.user else _("Gia sư AI"),
                     'score': p.score, 'correct_count': p.correct_count, 'is_winner': p.is_winner,
                     'xp_earned': p.xp_earned, 'is_me': p.user_id == user.id})
    return {'match_id': match.id, 'mode': match.mode, 'topic': match.topic, 'status': match.status,
            'total_questions': len(match.questions), 'participants': rows}


def analyze(match: ArenaMatch, user) -> dict:
    """Nhận xét AI cho bài làm của `user` (tạo 1 lần, lưu vào ai_analysis theo user)."""
    analysis = match.ai_analysis or {}
    key = str(user.id)
    if key in analysis:
        return analysis[key]
    me = get_participant(match.id, user)
    results = [
        {'question': match.questions[a['question_index']]['content'], 'student_answer': a['answer'],
         'correct_answer': match.questions[a['question_index']]['correct_answer'], 'is_correct': a['is_correct']}
        for a in me.answers
    ]
    context, _ids = retrieve_context(match.topic, grade=match.grade)
    data = generate_json(performance_prompt(topic=match.topic, results=results, context=context))
    analysis[key] = {'score': data.get('score'), 'analysis': str(data.get('analysis') or ''),
                     'advice': str(data.get('advice') or '')}
    ArenaMatch.objects.filter(pk=match.pk).update(ai_analysis=analysis)
    return analysis[key]
