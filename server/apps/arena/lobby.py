"""
Trạng thái sảnh đấu trường dùng chung giữa các process (cache Redis khi production, bộ nhớ khi dev / test):
người đang online, hàng đợi ghép trận ngẫu nhiên, lời thách đấu đang chờ.

Thao tác đọc-sửa-ghi được khóa bằng `cache.add` (khóa ngắn hạn) để 2 người không cùng ghép với 1 đối thủ.
"""
import time
import uuid
from contextlib import contextmanager

from django.core.cache import cache

ONLINE_KEY = 'arena_online'
QUEUE_KEY = 'arena_queue'
CHALLENGE_PREFIX = 'arena_challenge_'
LOCK_KEY = 'arena_lobby_lock'
STATE_TTL = 6 * 60 * 60
CHALLENGE_TTL = 2 * 60
LOCK_TTL = 5


@contextmanager
def _locked():
    for _attempt in range(50):
        if cache.add(LOCK_KEY, 1, LOCK_TTL):
            break
        time.sleep(0.05)
    try:
        yield
    finally:
        cache.delete(LOCK_KEY)


def _get(key, default):
    value = cache.get(key)
    return default if value is None else value


# ------------------------------------------------------------------------------------------------ online
def set_online(user_id: int, info: dict):
    with _locked():
        online = _get(ONLINE_KEY, {})
        online[str(user_id)] = {**info, 'status': 'idle'}
        cache.set(ONLINE_KEY, online, STATE_TTL)


def set_status(user_id: int, status: str):
    with _locked():
        online = _get(ONLINE_KEY, {})
        if str(user_id) in online:
            online[str(user_id)]['status'] = status
            cache.set(ONLINE_KEY, online, STATE_TTL)


def set_offline(user_id: int):
    with _locked():
        online = _get(ONLINE_KEY, {})
        online.pop(str(user_id), None)
        cache.set(ONLINE_KEY, online, STATE_TTL)
        cache.set(QUEUE_KEY, [q for q in _get(QUEUE_KEY, []) if q['user_id'] != user_id], STATE_TTL)


def online_players(*, exclude_user_id: int, grade=None) -> list[dict]:
    players = [{'user_id': int(uid), **info} for uid, info in _get(ONLINE_KEY, {}).items() if int(uid) != exclude_user_id]
    if grade:
        players = [p for p in players if p.get('grade') == grade]
    return sorted(players, key=lambda p: p.get('name', ''))


def get_status(user_id: int) -> str | None:
    return (_get(ONLINE_KEY, {}).get(str(user_id)) or {}).get('status')


# ------------------------------------------------------------------------------------------------ hàng đợi
def join_queue(user_id: int, grade, same_grade: bool) -> int | None:
    """Vào hàng đợi; có người phù hợp đang chờ -> lấy họ ra và trả user_id đối thủ, ngược lại None."""
    with _locked():
        queue = [q for q in _get(QUEUE_KEY, []) if q['user_id'] != user_id]
        for i, waiting in enumerate(queue):
            if (not same_grade and not waiting['same_grade']) or waiting['grade'] == grade:
                queue.pop(i)
                cache.set(QUEUE_KEY, queue, STATE_TTL)
                return waiting['user_id']
        queue.append({'user_id': user_id, 'grade': grade, 'same_grade': same_grade})
        cache.set(QUEUE_KEY, queue, STATE_TTL)
        return None


def leave_queue(user_id: int):
    with _locked():
        cache.set(QUEUE_KEY, [q for q in _get(QUEUE_KEY, []) if q['user_id'] != user_id], STATE_TTL)


# ------------------------------------------------------------------------------------------------ thách đấu
def create_challenge(from_user_id: int, to_user_id: int, config: dict) -> str:
    challenge_id = uuid.uuid4().hex[:12]
    cache.set(f'{CHALLENGE_PREFIX}{challenge_id}', {'from': from_user_id, 'to': to_user_id, 'config': config}, CHALLENGE_TTL)
    return challenge_id


def pop_challenge(challenge_id: str) -> dict | None:
    key = f'{CHALLENGE_PREFIX}{challenge_id}'
    data = cache.get(key)
    cache.delete(key)
    return data


def peek_challenge(challenge_id: str) -> dict | None:
    return cache.get(f'{CHALLENGE_PREFIX}{challenge_id}')
