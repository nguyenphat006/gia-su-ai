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

from urllib.parse import urlparse  # noqa: E402

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import OriginValidator  # noqa: E402
from django.conf import settings  # noqa: E402

from apps.core.ws_auth import JWTAuthMiddleware  # noqa: E402
from config.routing import websocket_urlpatterns  # noqa: E402

# Frontend (Vercel) khác domain với API (Render) -> kiểm tra Origin theo CORS_ALLOWED_ORIGINS, không theo ALLOWED_HOSTS
WS_ALLOWED_ORIGINS = ['*'] if settings.DEBUG else [
    *(urlparse(origin).netloc for origin in settings.CORS_ALLOWED_ORIGINS),
    *settings.ALLOWED_HOSTS,
]

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': OriginValidator(JWTAuthMiddleware(URLRouter(websocket_urlpatterns)), WS_ALLOWED_ORIGINS),
})
