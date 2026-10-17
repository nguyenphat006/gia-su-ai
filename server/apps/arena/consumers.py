"""
WebSocket đấu trường PvP: wss://<api>/ws/arena/?token=<access>

Client gửi {"type": ..., ...}:
    lobby.list {grade?}                         -> lobby.players
    challenge.send {target_user_id, config}     -> (đối thủ) challenge.received; (mình) challenge.sent
    challenge.respond {challenge_id, accept}    -> match.start (cả hai) | challenge.declined (người mời)
    challenge.cancel {challenge_id}             -> (đối thủ) challenge.cancelled
    queue.join {same_grade}                     -> queue.waiting | match.start (cả hai)
    queue.leave                                 -> queue.left
    match.answer {match_id, question_index, answer}
        -> (mình) match.answer_result; (cả hai, khi đủ 2 người trả lời câu đó) match.scores {question_index, scores};
           (cả hai, khi hết câu) match.finished
    match.leave {match_id}                      -> xử thua; đối thủ nhận match.finished
Server gửi lỗi: {"type": "error", "message": ...}. Mất kết nối giữa trận = bỏ cuộc.
config = {topic, count (≤20), difficulties[]}.
"""
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils.translation import gettext as _
from rest_framework.exceptions import APIException

from apps.core.permissions import get_user_permissions

from . import lobby, services
from .models import ArenaMatch, MatchMode, MatchStatus

DEFAULT_TOPIC = 'Ôn tập KHTN'
MAX_COUNT = 20


def user_group(user_id: int) -> str:
    return f'arena_user_{user_id}'


def _clean_config(raw) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    try:
        count = max(1, min(int(raw.get('count') or services.DEFAULT_COUNT), MAX_COUNT))
    except (TypeError, ValueError):
        count = services.DEFAULT_COUNT
    difficulties = [d for d in (raw.get('difficulties') or []) if d in ('NHAN_BIET', 'THONG_HIEU', 'VAN_DUNG')]
    return {'topic': str(raw.get('topic') or '').strip()[:255] or DEFAULT_TOPIC, 'count': count, 'difficulties': difficulties}


@database_sync_to_async
def _can_play(user) -> bool:
    perms = get_user_permissions(user)
    return '*' in perms or 'LEARN_USE' in perms


@database_sync_to_async
def _player_info(user) -> dict:
    profile = getattr(user, 'student_profile', None)
    return {
        'name': user.full_name or user.username,
        'grade': profile.grade if profile else None,
        'class_name': profile.school_class.name if profile and profile.school_class_id else None,
    }


@database_sync_to_async
def _create_pvp(user_ids: list[int], config: dict, grade):
    from django.contrib.auth import get_user_model
    users = list(get_user_model().objects.filter(id__in=user_ids).select_related('student_profile'))
    users.sort(key=lambda u: user_ids.index(u.id))
    match = services.create_match(mode=MatchMode.PVP, users=users, topic=config['topic'], grade=grade,
                                  count=config['count'], difficulties=config['difficulties'])
    names = {u.id: u.full_name or u.username for u in users}
    return match.id, services.public_questions(match), names


class ArenaConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        if not await _can_play(user):
            await self.close(code=4403)
            return
        self.user = user
        self.info = await _player_info(user)
        self.match_id = None
        await self.channel_layer.group_add(user_group(user.id), self.channel_name)
        await self.accept()
        await database_sync_to_async(lobby.set_online)(user.id, self.info)

    async def disconnect(self, code):
        user = getattr(self, 'user', None)
        if user is None:
            return
        await database_sync_to_async(lobby.set_offline)(user.id)
        await self.channel_layer.group_discard(user_group(user.id), self.channel_name)
        if self.match_id:
            await self._forfeit(self.match_id)

    # ------------------------------------------------------------------------------------------ dispatch
    async def receive_json(self, content, **kwargs):
        handlers = {
            'lobby.list': self.on_lobby_list,
            'challenge.send': self.on_challenge_send,
            'challenge.respond': self.on_challenge_respond,
            'challenge.cancel': self.on_challenge_cancel,
            'queue.join': self.on_queue_join,
            'queue.leave': self.on_queue_leave,
            'match.answer': self.on_match_answer,
            'match.leave': self.on_match_leave,
        }
        handler = handlers.get(content.get('type'))
        if handler is None:
            await self._error(_("Yêu cầu không hợp lệ."))
            return
        try:
            await handler(content)
        except APIException as exc:
            await self._error(_flatten(exc.detail))

    async def _error(self, message: str):
        await self.send_json({'type': 'error', 'message': message})

    async def _to_user(self, user_id: int, payload: dict):
        await self.channel_layer.group_send(user_group(user_id), {'type': 'arena.event', 'payload': payload})

    async def arena_event(self, event):
        payload = event['payload']
        if payload.get('type') == 'match.start':
            self.match_id = payload['match_id']
        elif payload.get('type') == 'match.finished':
            self.match_id = None
        await self.send_json(payload)

    # ------------------------------------------------------------------------------------------ sảnh
    async def on_lobby_list(self, content):
        grade = content.get('grade') if isinstance(content.get('grade'), int) else None
        players = await database_sync_to_async(lobby.online_players)(exclude_user_id=self.user.id, grade=grade)
        await self.send_json({'type': 'lobby.players', 'players': players})

    async def on_challenge_send(self, content):
        target = content.get('target_user_id')
        if not isinstance(target, int) or target == self.user.id:
            await self._error(_("Đối thủ không hợp lệ."))
            return
        if await database_sync_to_async(lobby.get_status)(target) != 'idle':
            await self._error(_("Bạn này đang bận hoặc đã rời sảnh."))
            return
        config = _clean_config(content.get('config'))
        challenge_id = await database_sync_to_async(lobby.create_challenge)(self.user.id, target, config)
        await self._to_user(target, {'type': 'challenge.received', 'challenge_id': challenge_id,
                                     'from': {'user_id': self.user.id, **self.info}, 'config': config})
        await self.send_json({'type': 'challenge.sent', 'challenge_id': challenge_id, 'target_user_id': target})

    async def on_challenge_respond(self, content):
        challenge = await database_sync_to_async(lobby.pop_challenge)(str(content.get('challenge_id')))
        if not challenge or challenge['to'] != self.user.id:
            await self._error(_("Lời thách đấu đã hết hạn."))
            return
        if not content.get('accept'):
            await self._to_user(challenge['from'], {'type': 'challenge.declined', 'challenge_id': content.get('challenge_id'),
                                                    'by': {'user_id': self.user.id, **self.info}})
            return
        await self._start_pvp([challenge['from'], self.user.id], challenge['config'], self.info.get('grade'))

    async def on_challenge_cancel(self, content):
        challenge = await database_sync_to_async(lobby.pop_challenge)(str(content.get('challenge_id')))
        if challenge and challenge['from'] == self.user.id:
            await self._to_user(challenge['to'], {'type': 'challenge.cancelled', 'challenge_id': content.get('challenge_id')})

    async def on_queue_join(self, content):
        same_grade = bool(content.get('same_grade', True))
        grade = self.info.get('grade')
        opponent = await database_sync_to_async(lobby.join_queue)(self.user.id, grade, same_grade)
        if opponent is None:
            await database_sync_to_async(lobby.set_status)(self.user.id, 'matching')
            await self.send_json({'type': 'queue.waiting'})
            return
        config = {'topic': DEFAULT_TOPIC, 'count': services.DEFAULT_COUNT, 'difficulties': []}
        await self._start_pvp([opponent, self.user.id], config, grade)

    async def on_queue_leave(self, content):
        await database_sync_to_async(lobby.leave_queue)(self.user.id)
        await database_sync_to_async(lobby.set_status)(self.user.id, 'idle')
        await self.send_json({'type': 'queue.left'})

    async def _start_pvp(self, user_ids: list[int], config: dict, grade):
        match_id, questions, names = await _create_pvp(user_ids, config, grade)
        for uid in user_ids:
            await database_sync_to_async(lobby.set_status)(uid, 'in-battle')
        for uid in user_ids:
            opponent_id = next(o for o in user_ids if o != uid)
            await self._to_user(uid, {
                'type': 'match.start', 'match_id': match_id, 'topic': config['topic'],
                'seconds_per_question': services.SECONDS_PER_QUESTION, 'questions': questions,
                'opponent': {'user_id': opponent_id, 'name': names.get(opponent_id, '')},
            })

    # ------------------------------------------------------------------------------------------ trong trận
    async def on_match_answer(self, content):
        match_id = content.get('match_id')
        if not isinstance(match_id, int) or match_id != self.match_id:
            await self._error(_("Bạn không ở trong trận này."))
            return
        outcome = await database_sync_to_async(services.submit_answer)(
            match_id, self.user, int(content.get('question_index', -1)), str(content.get('answer') or ''),
        )
        await self.send_json({'type': 'match.answer_result', 'match_id': match_id, **outcome['result']})
        player_ids = await self._player_ids(match_id)
        if outcome['scores'] is not None:
            for uid in player_ids:
                await self._to_user(uid, {'type': 'match.scores', 'match_id': match_id,
                                          'question_index': outcome['question_index'], 'scores': outcome['scores']})
        if await database_sync_to_async(_all_answered)(match_id):
            await self._finish(match_id, player_ids)

    async def on_match_leave(self, content):
        if self.match_id and content.get('match_id') == self.match_id:
            await self._forfeit(self.match_id)

    async def _forfeit(self, match_id: int):
        player_ids = await self._player_ids(match_id)
        await self._finish(match_id, player_ids, forfeit_user_id=self.user.id)

    async def _finish(self, match_id: int, player_ids: list[int], forfeit_user_id=None):
        result = await database_sync_to_async(_finish_and_result)(match_id, forfeit_user_id)
        if result is None:
            return
        for uid in player_ids:
            await database_sync_to_async(lobby.set_status)(uid, 'idle')
            await self._to_user(uid, {'type': 'match.finished', 'forfeit_user_id': forfeit_user_id, **result})
        self.match_id = None

    @database_sync_to_async
    def _player_ids(self, match_id: int) -> list[int]:
        return list(ArenaMatch.objects.get(pk=match_id).participants.exclude(user=None).values_list('user_id', flat=True))


def _all_answered(match_id: int) -> bool:
    match = ArenaMatch.objects.get(pk=match_id)
    return match.status == MatchStatus.IN_PROGRESS and services.all_answered(match)


def _finish_and_result(match_id: int, forfeit_user_id):
    match = ArenaMatch.objects.get(pk=match_id)
    if match.status != MatchStatus.IN_PROGRESS:
        return None
    match = services.finish_match(match_id, forfeit_user_id=forfeit_user_id)
    participants = [
        {'user_id': p.user_id, 'score': p.score, 'correct_count': p.correct_count, 'is_winner': p.is_winner,
         'xp_earned': p.xp_earned}
        for p in match.participants.order_by('id')
    ]
    return {'match_id': match.id, 'status': match.status, 'participants': participants}


def _flatten(detail) -> str:
    if isinstance(detail, dict):
        return '; '.join(_flatten(v) for v in detail.values())
    if isinstance(detail, list):
        return '; '.join(_flatten(v) for v in detail)
    return str(detail)
