"""
Định tuyến WebSocket (tiền tố /ws/). Mỗi app nghiệp vụ khai báo `websocket_urlpatterns` trong routing.py của mình
rồi gộp vào đây.
"""
from apps.arena.routing import websocket_urlpatterns as arena_ws

websocket_urlpatterns = [
    *arena_ws,
]
