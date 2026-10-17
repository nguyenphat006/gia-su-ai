from django.urls import path

from .consumers import ArenaConsumer

websocket_urlpatterns = [
    path('ws/arena/', ArenaConsumer.as_asgi()),
]
