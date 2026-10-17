"""
Xác thực WebSocket bằng JWT (SimpleJWT) cho Django Channels.

Trình duyệt không gửi được header Authorization khi mở WebSocket, nên access token đi qua query string:
    wss://<api>/ws/arena/?token=<access>
Token sai / hết hạn / tài khoản bị khóa -> scope['user'] = AnonymousUser; consumer tự đóng kết nối.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user(token: str):
    try:
        user_id = AccessToken(token)['user_id']
    except (TokenError, KeyError):
        return AnonymousUser()
    user = get_user_model().objects.filter(pk=user_id, is_active=True, deleted_at__isnull=True).first()
    return user or AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get('query_string', b'').decode())
        token = (query.get('token') or [None])[0]
        scope['user'] = await _get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
