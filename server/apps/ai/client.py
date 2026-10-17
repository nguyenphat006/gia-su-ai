"""
Client Gemini dùng chung cho mọi tính năng AI (gia sư, bộ lọc, sinh câu hỏi, chấm tự luận, embedding).

- Model / nhiệt độ mặc định đọc từ Cấu hình AI (AiSettings), API key từ biến môi trường GEMINI_API_KEY.
- Lỗi hết hạn mức (429) -> `AiQuotaExceeded`; lỗi khác -> `AiUnavailable` (thông điệp tiếng Việt cho học sinh).
- Test: mock `apps.ai.client.get_client` hoặc các hàm `generate_text` / `generate_json` / `embed_texts`.
"""
import json
import logging
import re
import time
from functools import lru_cache

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

RETRIES = 3
RETRY_DELAY_SECONDS = 2


class AiUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = _("Gia sư AI đang bận, em thử lại sau ít phút nhé.")
    default_code = 'ai_unavailable'


class AiQuotaExceeded(AiUnavailable):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = _("Hệ thống AI đang quá tải (hết lượt gọi), em thử lại sau ít phút nhé.")
    default_code = 'ai_quota_exceeded'


@lru_cache(maxsize=1)
def get_client():
    if not settings.GEMINI_API_KEY:
        raise AiUnavailable(_("Chưa cấu hình GEMINI_API_KEY trên máy chủ."))
    from google import genai
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _default_model() -> str:
    from apps.ai_settings.services import get_setting
    return get_setting('AI_MODEL', settings.GEMINI_MODEL) or settings.GEMINI_MODEL


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc)
    return '429' in text or 'RESOURCE_EXHAUSTED' in text


def _call(fn):
    """Gọi API có thử lại (lỗi mạng / 5xx); 429 báo ngay để không đốt thêm hạn mức."""
    last_exc = None
    for attempt in range(RETRIES):
        try:
            return fn()
        except APIException:
            raise
        except Exception as exc:  # SDK ném nhiều loại lỗi khác nhau
            if _is_quota_error(exc):
                logger.warning("Gemini quota exceeded: %s", exc)
                raise AiQuotaExceeded() from exc
            last_exc = exc
            logger.warning("Gemini call failed (attempt %s/%s): %s", attempt + 1, RETRIES, exc)
            if attempt < RETRIES - 1:
                time.sleep(RETRY_DELAY_SECONDS)
    raise AiUnavailable() from last_exc


def _image_part(image: dict | None):
    if not image:
        return None
    from google.genai import types
    return types.Part.from_bytes(data=image['data'], mime_type=image['mime_type'])


def generate_text(prompt, *, system_instruction: str | None = None, history: list | None = None, image: dict | None = None,
                  model: str | None = None, temperature: float | None = None, json_mode: bool = False) -> str:
    """
    Sinh văn bản. `history` = [{'role': 'user'|'model', 'text': ...}] (cũ -> mới), `image` = {'data': bytes, 'mime_type'}.
    """
    from google.genai import types

    contents = [
        types.Content(role=item['role'], parts=[types.Part.from_text(text=item['text'])])
        for item in (history or [])
    ]
    parts = [types.Part.from_text(text=prompt)]
    image_part = _image_part(image)
    if image_part is not None:
        parts.append(image_part)
    contents.append(types.Content(role='user', parts=parts))

    config = types.GenerateContentConfig(
        system_instruction=system_instruction or None,
        temperature=temperature,
        response_mime_type='application/json' if json_mode else None,
    )
    response = _call(lambda: get_client().models.generate_content(
        model=model or _default_model(), contents=contents, config=config,
    ))
    return (response.text or '').strip()


# JSON từ Gemini hay chứa LaTeX chưa escape: "\frac", "\beta", "\times"... -> JSON hiểu nhầm \f \b \t là ký tự điều
# khiển. Nhân đôi mọi "\" trừ: "\\" sẵn có, \" \/ \uXXXX, \t \r đứng trước ký tự không phải chữ cái, và \n — riêng \n
# chỉ coi là LaTeX khi ghép thành lệnh có thật (\neq, \nu, \nabla...), vì tiếng Việt hay có chữ ngay sau xuống dòng.
_NOT_LETTER = r'(?![^\W\d_])'
_LATEX_N = rf'n(?:eq|e|u|abla|ewline|ot|i|eg|exists|leq|geq|parallel){_NOT_LETTER}'
_LATEX_BACKSLASH = re.compile(rf'\\\\|\\(?!["/]|u[0-9a-fA-F]{{4}}|[rt]{_NOT_LETTER}|n(?!{_LATEX_N[1:]}))')


def safe_json_loads(text: str):
    text = (text or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text)
    sanitized = _LATEX_BACKSLASH.sub(lambda m: m.group(0) if m.group(0) == '\\\\' else '\\\\', text)
    try:
        return json.loads(sanitized)
    except json.JSONDecodeError:
        logger.warning("Gemini trả JSON không hợp lệ: %s", text[:500])
        raise AiUnavailable(_("AI trả về dữ liệu không hợp lệ, em thử lại nhé."))


def generate_json(prompt, **kwargs):
    """Sinh và parse JSON (response_mime_type=application/json)."""
    return safe_json_loads(generate_text(prompt, json_mode=True, **kwargs))


def embed_texts(texts: list[str], *, task_type: str = 'RETRIEVAL_DOCUMENT') -> list[list[float]]:
    """Vector nhúng (768 chiều) cho từng đoạn. task_type: RETRIEVAL_DOCUMENT khi nạp, RETRIEVAL_QUERY khi tìm."""
    if not texts:
        return []
    from google.genai import types
    response = _call(lambda: get_client().models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type=task_type, output_dimensionality=settings.GEMINI_EMBEDDING_DIMENSIONS,
        ),
    ))
    return [list(e.values) for e in response.embeddings]
