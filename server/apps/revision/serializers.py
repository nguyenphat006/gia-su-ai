from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.academics.models import Grade

from .models import Difficulty, FlashcardDeck, Mindmap, Question, QuestionType

DT_FORMAT = "%d/%m/%Y %H:%M"
READ_AUDIT_FIELDS = ['description', 'is_active', 'created_by_name', 'updated_by_name', 'created_at', 'updated_at']


class _AuditReadMixin(serializers.Serializer):
    school_class_name = serializers.CharField(source='school_class.name', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)
    updated_at = serializers.DateTimeField(format=DT_FORMAT, read_only=True)


def _clean_topic(value: str) -> str:
    value = (value or '').strip()
    if not value:
        raise serializers.ValidationError(_("Chủ đề không được để trống."))
    return value


# ------------------------------------------------------------------------------ Câu hỏi
class QuestionSerializer(_AuditReadMixin, serializers.ModelSerializer):
    source_document_title = serializers.CharField(source='source_document.title', read_only=True, default='')

    class Meta:
        model = Question
        fields = ['id', 'grade', 'school_class', 'school_class_name', 'topic', 'question_type', 'difficulty', 'content',
                  'options', 'correct_answer', 'explanation', 'hint', 'status', 'origin', 'source_document',
                  'source_document_title', *READ_AUDIT_FIELDS]
        read_only_fields = fields


def validate_question_payload(attrs: dict) -> dict:
    """Trắc nghiệm: đúng 4 phương án khác nhau, đáp án nằm trong phương án. Tự luận: không có phương án."""
    if attrs.get('question_type') == QuestionType.ESSAY:
        attrs['options'] = None
        return attrs
    options = attrs.get('options')
    if not isinstance(options, list) or len(options) != 4:
        raise serializers.ValidationError({'options': [_("Câu trắc nghiệm phải có đúng 4 phương án.")]})
    options = [str(o).strip() for o in options]
    if any(not o for o in options) or len(set(options)) != 4:
        raise serializers.ValidationError({'options': [_("Các phương án không được trống hoặc trùng nhau.")]})
    answer = str(attrs.get('correct_answer') or '').strip()
    if answer not in options:
        raise serializers.ValidationError({'correct_answer': [_("Đáp án đúng phải là một trong 4 phương án.")]})
    attrs['options'], attrs['correct_answer'] = options, answer
    return attrs


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'grade', 'school_class', 'topic', 'question_type', 'difficulty', 'content', 'options',
                  'correct_answer', 'explanation', 'hint', 'status', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_topic(self, value):
        return _clean_topic(value)

    def validate(self, attrs):
        merged = {
            'question_type': attrs.get('question_type', getattr(self.instance, 'question_type', QuestionType.MULTIPLE_CHOICE)),
            'options': attrs.get('options', getattr(self.instance, 'options', None)),
            'correct_answer': attrs.get('correct_answer', getattr(self.instance, 'correct_answer', '')),
        }
        cleaned = validate_question_payload(merged)
        attrs.update({k: cleaned[k] for k in ('options', 'correct_answer')})
        return attrs


# ------------------------------------------------------------------------------ Flashcard
class FlashcardDeckSerializer(_AuditReadMixin, serializers.ModelSerializer):
    card_count = serializers.SerializerMethodField()

    class Meta:
        model = FlashcardDeck
        fields = ['id', 'grade', 'school_class', 'school_class_name', 'topic', 'title', 'cards', 'card_count', 'origin',
                  *READ_AUDIT_FIELDS]
        read_only_fields = fields

    def get_card_count(self, obj) -> int:
        return len(obj.cards or [])


class FlashcardDeckCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashcardDeck
        fields = ['id', 'grade', 'school_class', 'topic', 'title', 'cards', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_topic(self, value):
        return _clean_topic(value)

    def validate_cards(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError(_("Bộ thẻ phải có ít nhất 1 thẻ."))
        cards = []
        for card in value:
            front = str((card or {}).get('front') or '').strip()
            back = str((card or {}).get('back') or '').strip()
            if not front or not back:
                raise serializers.ValidationError(_("Mỗi thẻ phải có đủ mặt trước và mặt sau."))
            cards.append({'front': front, 'back': back})
        return cards


# ------------------------------------------------------------------------------ Sơ đồ tư duy
def validate_mindmap_nodes(value) -> list:
    """Đúng 1 gốc, id không trùng, parentId trỏ tới nút có thật, không có vòng lặp."""
    if not isinstance(value, list) or not value:
        raise serializers.ValidationError(_("Sơ đồ phải có ít nhất 1 nút."))
    nodes, ids = [], set()
    for node in value:
        node_id = str((node or {}).get('id') or '').strip()
        label = str((node or {}).get('label') or '').strip()
        parent = (node or {}).get('parentId')
        if not node_id or not label:
            raise serializers.ValidationError(_("Mỗi nút phải có id và nhãn."))
        if node_id in ids:
            raise serializers.ValidationError(_("Id nút '%(id)s' bị trùng.") % {"id": node_id})
        ids.add(node_id)
        nodes.append({'id': node_id, 'label': label, 'parentId': str(parent) if parent not in (None, '') else None})
    roots = [n for n in nodes if n['parentId'] is None]
    if len(roots) != 1:
        raise serializers.ValidationError(_("Sơ đồ phải có đúng 1 nút gốc."))
    parent_of = {n['id']: n['parentId'] for n in nodes}
    for node in nodes:
        if node['parentId'] is not None and node['parentId'] not in ids:
            raise serializers.ValidationError(_("Nút '%(label)s' trỏ tới nút cha không tồn tại.") % {"label": node['label']})
        seen, current = set(), node['id']
        while current is not None:
            if current in seen:
                raise serializers.ValidationError(_("Sơ đồ có vòng lặp tại nút '%(label)s'.") % {"label": node['label']})
            seen.add(current)
            current = parent_of.get(current)
    return nodes


class MindmapSerializer(_AuditReadMixin, serializers.ModelSerializer):
    node_count = serializers.SerializerMethodField()

    class Meta:
        model = Mindmap
        fields = ['id', 'grade', 'school_class', 'school_class_name', 'topic', 'title', 'nodes', 'node_count', 'origin',
                  *READ_AUDIT_FIELDS]
        read_only_fields = fields

    def get_node_count(self, obj) -> int:
        return len(obj.nodes or [])


class MindmapCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mindmap
        fields = ['id', 'grade', 'school_class', 'topic', 'title', 'nodes', 'description', 'is_active']
        read_only_fields = ['id']

    def validate_topic(self, value):
        return _clean_topic(value)

    def validate_nodes(self, value):
        return validate_mindmap_nodes(value)


# ------------------------------------------------------------------------------ AI soạn nháp
class AiDraftRequestSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_null=True)
    topic = serializers.CharField(max_length=255)
    count = serializers.IntegerField(min_value=1, max_value=20, default=5)
    question_type = serializers.ChoiceField(choices=QuestionType.choices, default=QuestionType.MULTIPLE_CHOICE)
    difficulties = serializers.ListField(child=serializers.ChoiceField(choices=Difficulty.choices), required=False, default=list)

    def validate_topic(self, value):
        return _clean_topic(value)


class QuestionDraftSerializer(serializers.Serializer):
    content = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField(), allow_null=True)
    correct_answer = serializers.CharField()
    explanation = serializers.CharField(allow_blank=True, allow_null=True)
    hint = serializers.CharField(allow_blank=True, allow_null=True)
    difficulty = serializers.CharField()
    question_type = serializers.CharField()


class FlashcardDraftSerializer(serializers.Serializer):
    title = serializers.CharField()
    cards = serializers.ListField(child=serializers.DictField())


class MindmapDraftSerializer(serializers.Serializer):
    title = serializers.CharField()
    nodes = serializers.ListField(child=serializers.DictField())
