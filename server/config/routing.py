"""
Định tuyến WebSocket (tiền tố /ws/). Mỗi app nghiệp vụ khai báo `websocket_urlpatterns` trong routing.py của mình
rồi gộp vào đây.
"""
websocket_urlpatterns = [
    # [ws] path('ws/arena/', ArenaConsumer.as_asgi()) — thêm ở giai đoạn Đấu trường (P5)
]
