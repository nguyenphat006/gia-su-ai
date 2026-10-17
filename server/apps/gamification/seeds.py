"""Thử thách + bậc danh hiệu mặc định (chuyển từ bản cũ). Chỉ tạo khi chưa có — không ghi đè chỉnh sửa."""
from .models import Challenge, LevelTier

CHALLENGES = [
    {'code': 'S_GIA_CAU_HOI', 'name': 'Sứ Giả Câu Hỏi', 'description': 'Hỏi gia sư AI 3 câu trong ngày',
     'trigger_action': 'CHAT_AI', 'goal': 3, 'period': 'DAILY', 'xp_reward': 50},
    {'code': 'CHIEN_BINH_TRI_TUE', 'name': 'Chiến Binh Trí Tuệ', 'description': 'Hoàn thành 1 bài ôn tập trong ngày',
     'trigger_action': 'COMPLETE_QUIZ', 'goal': 1, 'period': 'DAILY', 'xp_reward': 50},
    {'code': 'CHIEN_BINH_DA_TAI', 'name': 'Chiến Binh Đa Tài', 'description': 'Hoàn thành 1 bài kiểm tra flashcard trong ngày',
     'trigger_action': 'FLASHCARD_QUIZ', 'goal': 1, 'period': 'DAILY', 'xp_reward': 100},
]

LEVEL_TIERS = [
    ('NHÀ KHOA HỌC NHÍ', 0), ('SỨ GIẢ CHÂN LÝ', 250), ('BẬC THẦY THỰC NGHIỆM', 500), ('HÀN LÂM HỌC SĨ', 1000),
    ('NHÀ KIẾN TẠO TINH HOA', 1500), ('HỌC GIẢ TINH ANH', 2000), ('VỊ THẦN TRI THỨC', 2500),
]


def seed() -> str:
    new_challenges = sum(
        int(Challenge.all_objects.get_or_create(code=c['code'], defaults={k: v for k, v in c.items() if k != 'code'})[1])
        for c in CHALLENGES
    )
    new_tiers = sum(
        int(LevelTier.all_objects.get_or_create(min_xp=min_xp, defaults={'title': title, 'sort_order': i})[1])
        for i, (title, min_xp) in enumerate(LEVEL_TIERS)
    )
    return f"tao moi {new_challenges} thu thach, {new_tiers} bac danh hieu"
