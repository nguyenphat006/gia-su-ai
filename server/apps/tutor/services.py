"""
Xử lý 1 tin nhắn học sinh gửi gia sư AI:
lưu tin nhắn (+ ảnh) -> bộ lọc nội dung -> XP / thử thách -> RAG -> Gemini -> lưu câu trả lời.
"""
import logging

from django.db import transaction
from django.utils import timezone

from apps.ai.client import AiUnavailable, generate_json, generate_text
from apps.ai_settings.services import get_bool, get_int, get_setting
from apps.analytics.models import EventType, record_event
from apps.core.models import Attachment
from apps.gamification import services as gamification
from apps.gamification.models import TriggerAction, XpAction
from apps.knowledge.rag import retrieve_context

from .models import ChatMessage, ChatRole, ChatSession

logger = logging.getLogger(__name__)

ATTACHMENT_ENTITY = 'CHAT_MESSAGE'
# Prompt gửi AI / nội dung lưu CSDL -> luôn tiếng Việt, không dịch theo ngôn ngữ giao diện
IMAGE_ONLY_QUERY = 'Giải bài tập trong ảnh'
IMAGE_ONLY_PROMPT = 'Hãy giúp em giải bài tập trong ảnh.'
NO_CONTEXT = '(không có tài liệu liên quan)'
EMPTY_ANSWER = '(Gia sư chưa có câu trả lời)'
TITLE_MAX = 60


def check_content(message: str) -> tuple[bool, str]:
    """Bộ lọc nội dung (bật / tắt + prompt + model trên màn Cấu hình AI). Lỗi gọi AI -> cho qua (fail-open như bản cũ)."""
    if not get_bool('AI_GUARD_ENABLED', True) or not message.strip():
        return False, ''
    prompt = get_setting('AI_GUARD_PROMPT').replace('{message}', message)
    try:
        result = generate_json(prompt, model=get_setting('AI_GUARD_MODEL') or None, temperature=0.1)
    except AiUnavailable:
        logger.warning("Bộ lọc nội dung lỗi, cho qua tin nhắn")
        return False, ''
    return bool(result.get('violated')), str(result.get('reason') or '')[:500]


def _history(session: ChatSession, before_id: int) -> list[dict]:
    limit = get_int('AI_MAX_HISTORY_MESSAGES', 10)
    rows = list(
        session.messages.filter(id__lt=before_id, is_blocked=False, role__in=[ChatRole.USER, ChatRole.MODEL])
        .order_by('-id')[:limit]
    )
    return [{'role': 'user' if m.role == ChatRole.USER else 'model', 'text': m.content} for m in reversed(rows)]


def _student_grade(user):
    profile = getattr(user, 'student_profile', None)
    return profile.grade if profile else None


def _save_image(user, message: ChatMessage, image_file) -> Attachment:
    return Attachment.objects.create(
        entity_type=ATTACHMENT_ENTITY, entity_id=message.id, file=image_file, file_name=image_file.name,
        file_size=image_file.size, mime_type=getattr(image_file, 'content_type', None), file_category='IMAGE',
        created_by=user, updated_by=user,
    )


def process_message(session: ChatSession, content: str, image_file=None) -> dict:
    user = session.user
    with transaction.atomic():
        user_msg = ChatMessage.objects.create(session=session, role=ChatRole.USER, content=content)
        image_bytes = None
        if image_file is not None:
            image_bytes = image_file.read()
            image_file.seek(0)
            _save_image(user, user_msg, image_file)
        if not session.title and content.strip():  # phiên mới: lấy tiêu đề từ câu hỏi đầu tiên
            session.title = content.strip()[:TITLE_MAX]

    violated, reason = check_content(content)
    if violated:
        penalty = gamification.guard_penalty(user, get_int('AI_GUARD_XP_PENALTY_BASE', 20))
        applied = gamification.add_xp(user, -penalty, XpAction.GUARD_PENALTY, source=('CHAT_MESSAGE', user_msg.id))
        user_msg.is_blocked, user_msg.block_reason = True, reason
        user_msg.save(update_fields=['is_blocked', 'block_reason'])
        ai_msg = ChatMessage.objects.create(session=session, role=ChatRole.SYSTEM, content=get_setting('AI_GUARD_BLOCK_MESSAGE'))
        _touch(session)
        return {'user_message': user_msg, 'ai_message': ai_msg, 'xp_delta': applied, 'blocked': True,
                'completed_challenges': []}

    grade = _student_grade(user)
    context, chunk_ids = retrieve_context(content or IMAGE_ONLY_QUERY, grade=grade)
    system_prompt = get_setting('AI_SYSTEM_PROMPT').replace('{context}', context or NO_CONTEXT)
    image = {'data': image_bytes, 'mime_type': image_file.content_type} if image_bytes else None
    try:
        answer = generate_text(
            content or IMAGE_ONLY_PROMPT, system_instruction=system_prompt,
            history=_history(session, user_msg.id), image=image, temperature=_temperature(),
        )
    except AiUnavailable as exc:
        # Không trả lời được: giữ tin nhắn học sinh, báo lỗi rõ ràng, không cộng XP
        ChatMessage.objects.create(session=session, role=ChatRole.SYSTEM, content=str(exc.detail))
        _touch(session)
        raise

    ai_msg = ChatMessage.objects.create(session=session, role=ChatRole.MODEL, content=answer or EMPTY_ANSWER,
                                        context_chunk_ids=chunk_ids or None)
    xp = gamification.add_xp(user, gamification.XP_CHAT, XpAction.CHAT_AI, source=('CHAT_MESSAGE', user_msg.id))
    completed = gamification.record_progress(user, TriggerAction.CHAT_AI)
    record_event(user, EventType.CHAT, source=('CHAT_MESSAGE', user_msg.id), metadata={'grade': grade})
    _touch(session)
    return {'user_message': user_msg, 'ai_message': ai_msg, 'xp_delta': xp, 'blocked': False,
            'completed_challenges': [c.name for c in completed]}


def _temperature() -> float:
    from apps.ai_settings.services import get_float
    return get_float('AI_TEMPERATURE', 0.7)


def _touch(session: ChatSession):
    session.last_message_at = timezone.now()
    session.save(update_fields=['title', 'last_message_at', 'updated_at'])
