"""
Cấu hình AI mặc định (chuyển nguyên từ bản cũ `server/services/system.service.ts`, bỏ LOG_RETENTION_DAYS vì không
còn bảng ActivityLog). Đây là nguồn duy nhất cho khóa hệ thống: seeds.py tạo khi chưa có, services.py dùng làm dự phòng.
"""
TUTOR_PROMPT = """Bạn là một "Gia sư AI chuyên nghiệp" chuyên hỗ trợ học sinh học tập môn Khoa học tự nhiên (KHTN). Phong cách giao tiếp của bạn phải thân thiện, dễ hiểu, phù hợp với lứa tuổi học sinh trung học, nhưng vẫn đảm bảo tính chính xác khoa học tuyệt đối.

Nguồn dữ liệu duy nhất và ưu tiên của bạn là sách giáo khoa Khoa học tự nhiên 6, 7, 8, 9 - Chân trời sáng tạo (Nhà xuất bản Giáo dục Việt Nam, được Bộ Giáo dục và Đào tạo phê duyệt).
Bạn phải bám sát chương trình, thuật ngữ và cách giải thích trong bộ sách này để trả lời học sinh.

QUY TẮC TRÌNH BÀY:
- Sử dụng Markdown rõ ràng.
- Các biểu thức khoa học, công thức toán học bắt buộc phải đặt trong chuẩn LaTeX ($...$ hoặc $$...$$). KHÔNG dùng ngoặc đơn hay ngoặc vuông kiểu \\( \\) hay \\[ \\].
- Luôn kết thúc bằng một mục riêng biệt ghi "ĐÁP ÁN" để học sinh nắm rõ kết quả sau cùng.

Ngữ cảnh tài liệu đính kèm: {context}"""

GUARD_PROMPT = """Đánh giá nội dung tin nhắn sau của người dùng có vi phạm chuẩn mực đạo đức, thuần phong mỹ tục, chửi thề, thô tục, hoặc nội dung không phù hợp với môi trường giáo dục không?
Bạn phải trả lời duy nhất ở định dạng JSON:
{"violated": boolean, "reason": "lý do ngắn gọn nếu vi phạm"}

Nội dung cần đánh giá:
{message}"""

GUARD_BLOCK_MESSAGE = (
    "Tin nhắn của em chứa nội dung không phù hợp và đã bị hệ thống chặn. "
    "Hãy tập trung vào việc học tập môn KHTN nhé! Lần vi phạm này sẽ bị trừ XP."
)

DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview'

# key -> (label, value, value_type, description)
DEFAULT_SETTINGS = {
    'AI_SYSTEM_PROMPT': ('Prompt gia sư AI', TUTOR_PROMPT, 'PROMPT',
                         'Lời dặn hệ thống cho gia sư. {context} = các đoạn tài liệu RAG tìm được.'),
    'AI_MODEL': ('Model trả lời', DEFAULT_MODEL, 'TEXT', 'Tên model Gemini dùng cho chat và sinh nội dung.'),
    'AI_TEMPERATURE': ('Nhiệt độ', '0.7', 'NUMBER', '0 = trả lời ổn định, 1 = sáng tạo hơn.'),
    'AI_MAX_HISTORY_MESSAGES': ('Số tin nhắn ngữ cảnh', '10', 'NUMBER', 'Số tin nhắn gần nhất gửi kèm khi hỏi AI.'),
    'AI_GUARD_ENABLED': ('Bật bộ lọc nội dung', 'true', 'BOOLEAN', 'Kiểm tra tin nhắn học sinh trước khi gửi cho gia sư.'),
    'AI_GUARD_PROMPT': ('Prompt bộ lọc nội dung', GUARD_PROMPT, 'PROMPT',
                        '{message} = tin nhắn cần kiểm tra. Model phải trả JSON {"violated", "reason"}.'),
    'AI_GUARD_MODEL': ('Model bộ lọc', DEFAULT_MODEL, 'TEXT', 'Model nhỏ, nhanh dùng cho bộ lọc.'),
    'AI_GUARD_XP_PENALTY_BASE': ('XP phạt cơ bản', '20', 'NUMBER',
                                 'Mỗi lần vi phạm trong tháng trừ base × 2^n XP (n tối đa 4).'),
    'AI_GUARD_BLOCK_MESSAGE': ('Thông báo khi chặn', GUARD_BLOCK_MESSAGE, 'PROMPT', 'Gia sư trả lời câu này khi tin nhắn bị chặn.'),
    'RAG_TOP_K': ('Số đoạn tài liệu RAG', '5', 'NUMBER', 'Số đoạn tri thức gần nghĩa nhất đưa vào {context}.'),
}
