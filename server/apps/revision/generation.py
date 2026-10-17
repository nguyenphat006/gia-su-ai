"""
Sinh nội dung ôn tập bằng AI (dùng chung cho màn quản trị "AI soạn nháp", phần ôn tập của học sinh và đấu trường).
Mọi kết quả đều qua cùng bộ kiểm tra hợp lệ như form nhập tay -> câu AI sai định dạng bị loại, không lưu rác.
"""
import logging

from rest_framework import serializers

from apps.ai.client import generate_json
from apps.ai.prompts import flashcard_prompt, mindmap_prompt, quiz_prompt
from apps.knowledge.rag import retrieve_context

from .models import Difficulty, QuestionType
from .serializers import validate_mindmap_nodes, validate_question_payload

logger = logging.getLogger(__name__)


def draft_questions(*, topic: str, grade=None, count: int = 5, question_type: str = QuestionType.MULTIPLE_CHOICE,
                    difficulties: list | None = None) -> list[dict]:
    context, _ids = retrieve_context(topic, grade=grade)
    data = generate_json(quiz_prompt(topic=topic, grade=grade, count=count, question_type=question_type,
                                     difficulties=difficulties or [], context=context))
    drafts = []
    for item in (data.get('questions') or [])[:count]:
        content = str(item.get('content') or '').strip()
        if not content:
            continue
        try:
            cleaned = validate_question_payload({
                'question_type': question_type, 'options': item.get('options'),
                'correct_answer': item.get('correct_answer'),
            })
        except serializers.ValidationError:
            logger.info("Bỏ câu AI sai định dạng: %s", content[:80])
            continue
        difficulty = item.get('difficulty')
        drafts.append({
            'content': content,
            'options': cleaned['options'],
            'correct_answer': str(cleaned['correct_answer'] or item.get('correct_answer') or '').strip(),
            'explanation': item.get('explanation') or '',
            'hint': item.get('hint') or '',
            'difficulty': difficulty if difficulty in Difficulty.values else Difficulty.NHAN_BIET,
            'question_type': question_type,
        })
    return drafts


def draft_flashcards(*, topic: str, grade=None) -> dict:
    context, _ids = retrieve_context(topic, grade=grade)
    data = generate_json(flashcard_prompt(topic=topic, grade=grade, context=context))
    cards = [
        {'front': str(c.get('front') or '').strip(), 'back': str(c.get('back') or '').strip()}
        for c in (data.get('cards') or []) if isinstance(c, dict)
    ]
    cards = [c for c in cards if c['front'] and c['back']]
    return {'title': str(data.get('title') or topic).strip(), 'cards': cards}


def draft_mindmap(*, topic: str, grade=None) -> dict:
    context, _ids = retrieve_context(topic, grade=grade)
    data = generate_json(mindmap_prompt(topic=topic, grade=grade, context=context))
    try:
        nodes = validate_mindmap_nodes(data.get('nodes') or [])
    except serializers.ValidationError:
        logger.info("AI trả sơ đồ sai cấu trúc cho chủ đề %s", topic)
        nodes = [{'id': 'root', 'label': topic, 'parentId': None}]
    return {'title': str(data.get('title') or topic).strip(), 'nodes': nodes}
