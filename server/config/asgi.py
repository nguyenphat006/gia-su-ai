"""
ASGI: HTTP (Django) + WebSocket (Channels) trên cùng một process.

Production: gunicorn -k uvicorn.workers.UvicornWorker config.asgi:application
Dev: `python manage.py runserver` (app `daphne` trong INSTALLED_APPS -> runserver phục vụ cả WebSocket).
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Khởi tạo Django trước khi import mã dùng model (routing / consumer)
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.core.ws_auth import JWTAuthMiddleware  # noqa: E402
from config.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(JWTAuthMiddleware(URLRouter(websocket_urlpatterns))),
})
