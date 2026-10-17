"""
Sinh mã Nguyên vật liệu `[TIỀN TỐ]-[5 số]` (KL-00001, GO-00012...).

Tiền tố lấy theo nhóm gốc (root) của MaterialCategory. Việc cấp mã khi tạo mới phải chạy trong
`transaction.atomic()` và khóa dòng nhóm gốc (`select_for_update`) để tuần tự hóa các request cùng nhóm;
`create_material_with_code` bổ sung vòng retry khi gặp IntegrityError.
"""
import re

from django.db import IntegrityError, transaction

from ..models import Material, MaterialCategory

# Từ khóa trong mã nhóm gốc -> tiền tố 2 chữ cái (xem .claude/rules/manufacturing-domain.md)
PREFIX_RULES = [
    (('METAL', 'KL'), 'KL'),
    (('WOOD', 'GO'), 'GO'),
    (('PAINT', 'CHEM', 'SN'), 'SN'),
    (('HARDWARE', 'PK'), 'PK'),
    (('PACKAGING', 'BB'), 'BB'),
    (('FABRIC', 'FOAM', 'VA'), 'VA'),
    (('WEAVING', 'DD'), 'DD'),
]
MAX_RETRIES = 5


def get_root_category(category: MaterialCategory) -> MaterialCategory:
    curr = category
    while curr.parent_id:
        curr = curr.parent
    return curr


def get_category_prefix(category: MaterialCategory) -> str:
    """Tiền tố mã NVL theo nhóm gốc. Khớp chính xác (vd. 'KL') hoặc chứa từ khóa (vd. 'METAL_PIPE')."""
    code_upper = get_root_category(category).code.upper()
    for keywords, prefix in PREFIX_RULES:
        if code_upper in keywords or any(k in code_upper for k in keywords if len(k) > 2):
            return prefix
    return code_upper[:2] or 'NVL'


def calculate_next_code(prefix: str) -> str:
    """Mã kế tiếp = số lớn nhất hiện có của tiền tố + 1 (tính cả bản ghi đã xóa mềm để không tái sử dụng mã)."""
    pattern = re.compile(rf'^{re.escape(prefix)}-(\d+)$')
    max_num = 0
    for code in Material.all_objects.filter(material_code__startswith=f"{prefix}-").values_list('material_code', flat=True):
        match = pattern.match(code)
        if match:
            max_num = max(max_num, int(match.group(1)))
    return f"{prefix}-{max_num + 1:05d}"


def create_material_with_code(serializer, **save_kwargs) -> Material:
    """
    Lưu serializer tạo NVL với mã do hệ thống cấp, chống race condition khi nhiều người tạo cùng lúc.
    Mã người dùng gửi lên chỉ được dùng nếu còn trống; ngược lại cấp mã kế tiếp.
    """
    category = serializer.validated_data['category']
    requested_code = (serializer.validated_data.get('material_code') or '').strip().upper()

    with transaction.atomic():
        root = MaterialCategory.objects.select_for_update().get(pk=get_root_category(category).pk)
        prefix = get_category_prefix(root)

        code = requested_code
        if not code or Material.all_objects.filter(material_code=code).exists():
            code = calculate_next_code(prefix)

        for _ in range(MAX_RETRIES):
            try:
                with transaction.atomic():
                    return serializer.save(material_code=code, **save_kwargs)
            except IntegrityError:
                code = calculate_next_code(prefix)
        raise IntegrityError(f"Không thể cấp mã NVL duy nhất cho tiền tố {prefix} sau {MAX_RETRIES} lần thử.")
