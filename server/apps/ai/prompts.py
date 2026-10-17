"""
Prompt sinh nội dung (chuyển từ bản cũ gemini.service.ts / arena.service.ts, hợp nhất định dạng JSON).
Prompt gia sư và bộ lọc nội dung chỉnh được trên UI -> nằm ở AiSettings, không ở đây.
"""
import json

LATEX_RULE = "Trình bày công thức, ký hiệu khoa học bằng LaTeX $...$ (KHÔNG dùng \\( \\) hay \\[ \\])."
TEXTBOOK_RULE = 'Chỉ dùng kiến thức sách giáo khoa KHTN 6-9 bộ "Chân trời sáng tạo".'

DIFFICULTY_LABELS = {'NHAN_BIET': 'Nhận biết', 'THONG_HIEU': 'Thông hiểu', 'VAN_DUNG': 'Vận dụng'}


def _context_block(context: str) -> str:
    return f"\nNgữ cảnh tài liệu (bám sát nội dung này):\n{context}\n" if context else ""


def quiz_prompt(*, topic: str, grade, count: int, question_type: str, difficulties: list[str], context: str) -> str:
    essay = question_type == 'ESSAY'
    levels = ', '.join(DIFFICULTY_LABELS.get(d, d) for d in difficulties) or 'Nhận biết, Thông hiểu, Vận dụng'
    return f"""Bạn là chuyên gia soạn đề Khoa học tự nhiên THCS.
Tạo {count} câu hỏi {'tự luận' if essay else 'trắc nghiệm 4 phương án'}:
- Khối: {grade or 'chưa xác định'}
- Chủ đề: {topic}
- Mức độ: {levels}

QUY TẮC:
- {TEXTBOOK_RULE}
- {LATEX_RULE}
- Trắc nghiệm: đúng 4 phương án, chỉ 1 phương án đúng, không ghi "A." "B." ở đầu phương án.
- "correct_answer": trắc nghiệm = nguyên văn phương án đúng; tự luận = đáp án mẫu ngắn gọn.
- "difficulty" là một trong: NHAN_BIET, THONG_HIEU, VAN_DUNG.
{_context_block(context)}
Trả về DUY NHẤT JSON:
{{"questions": [{{"content": "...", "options": {'null' if essay else '["...", "...", "...", "..."]'}, "correct_answer": "...", "hint": "...", "explanation": "...", "difficulty": "NHAN_BIET"}}]}}"""


def flashcard_prompt(*, topic: str, grade, context: str) -> str:
    return f"""Tạo 5-8 thẻ flashcard ôn tập KHTN cho chủ đề "{topic}", khối {grade or 'THCS'}.
Mặt trước: khái niệm / câu hỏi ngắn. Mặt sau: định nghĩa / đáp án súc tích.
- {TEXTBOOK_RULE}
- {LATEX_RULE}
{_context_block(context)}
Trả về DUY NHẤT JSON: {{"title": "...", "cards": [{{"front": "...", "back": "..."}}]}}"""


def mindmap_prompt(*, topic: str, grade, context: str) -> str:
    return f"""Phân tích chủ đề "{topic}" (KHTN khối {grade or 'THCS'}) thành sơ đồ tư duy 3 tầng, 10-25 nút.
- Nút gốc có "parentId": null; mọi nút khác trỏ "parentId" về id nút cha; id là chuỗi ngắn không trùng.
- Nhãn ngắn gọn (tối đa 12 từ). {LATEX_RULE}
- {TEXTBOOK_RULE}
{_context_block(context)}
Trả về DUY NHẤT JSON: {{"title": "...", "nodes": [{{"id": "root", "label": "...", "parentId": null}}]}}"""


def essay_grading_prompt(*, question: str, model_answer: str, answer: str) -> str:
    return f"""Bạn là giáo viên KHTN THCS chấm bài tự luận, giọng văn khích lệ, sư phạm.
Câu hỏi: {question}
Đáp án mẫu: {model_answer or '(không có)'}
Bài làm của học sinh: {answer or '(học sinh gửi ảnh bài làm)'}

Chấm thang 10. Đạt khi từ 5 điểm. Nhận xét ngắn: đúng gì, thiếu gì, sửa thế nào. {LATEX_RULE}
Trả về DUY NHẤT JSON: {{"score": 0, "is_passing": false, "feedback": "..."}}"""


def performance_prompt(*, topic: str, results: list, context: str) -> str:
    return f"""Bạn là cô Trang, giáo viên KHTN. Phân tích kết quả trận đấu trí của học sinh, chủ đề: {topic}.

Dữ liệu bài làm (từng câu: câu hỏi, đáp án học sinh, đúng/sai):
{json.dumps(results, ensure_ascii=False)}
{_context_block(context)}
YÊU CẦU:
1. Chấm thang 10.
2. Chỉ ra cụ thể phần kiến thức còn yếu.
3. Lời khuyên ôn tập cụ thể. Giọng thân thiện, khích lệ.
4. {LATEX_RULE}

Trả về DUY NHẤT JSON: {{"score": 0, "analysis": "...", "advice": "..."}}"""
