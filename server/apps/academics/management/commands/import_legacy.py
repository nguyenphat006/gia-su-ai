"""
Chuyển dữ liệu từ hệ thống cũ (gia-su-ai-khtn: Express + Prisma) sang CSDL mới.

    python manage.py import_legacy --source-url "postgresql://...neon.tech/neondb?sslmode=require"
    python manage.py import_legacy --from-json ../../gia-su-ai-khtn/server/scratch/prod_db_dump.json
    python manage.py import_legacy --from-json dump.json --dry-run      # chạy thử, không ghi

- Chạy trong 1 giao dịch: lỗi giữa chừng -> không ghi gì. Chạy 1 lần trên CSDL mới (đã có học sinh -> từ chối,
  trừ khi --allow-existing).
- Mật khẩu: giữ hash scrypt cũ (legacy_scrypt) -> học sinh đăng nhập bằng mật khẩu cũ, tự nâng cấp PBKDF2.
- Tài khoản trùng tên đăng nhập đã có (vd. admin do seed_core tạo) -> giữ tài khoản mới, chỉ ánh xạ id.
- Trận đấu PvP cũ (mỗi người 1 dòng) ghép cặp theo cùng chủ đề, khác người, lệch ≤10 giây; đấu AI cũ không lưu
  điểm AI -> nhập 1 người chơi, ghi chú trong mô tả trận.
- LearningEvents dựng từ dữ liệu gốc: tin nhắn (CHAT), XP điểm danh (LOGIN), XP ôn tập (QUIZ), kết quả đấu (ARENA),
  ActivityLog "Xem bộ Flashcard" / "Xem sơ đồ tư duy". Phần còn lại của ActivityLog (nhật ký request) không chuyển.
"""
import json
import re
from contextlib import contextmanager
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.academics.models import SchoolClass, StudentProfile, TeacherProfile
from apps.ai_settings.models import AiSetting
from apps.analytics.models import EventType, LearningEvent
from apps.arena.models import ArenaMatch, ArenaParticipant, MatchMode, MatchStatus
from apps.authentication.hashers import LegacyScryptPasswordHasher
from apps.authentication.models import Role
from apps.gamification.models import Challenge, UserChallenge, UserStats, XpAction, XpLog
from apps.knowledge.models import DocumentStatus, KnowledgeChunk, SourceDocument
from apps.revision.models import Difficulty, FlashcardDeck, Mindmap, Question, QuestionStatus, QuizAttempt
from apps.tutor.models import ChatMessage, ChatSession

User = get_user_model()

TABLES = {  # khóa trong file dump JSON -> tên bảng Prisma
    'class': 'Class', 'user': 'User', 'studentProfile': 'StudentProfile', 'teacherProfile': 'TeacherProfile',
    'userStats': 'UserStats', 'xpLog': 'XpLog', 'challenge': 'Challenge', 'userChallenge': 'UserChallenge',
    'systemConfig': 'SystemConfig', 'knowledgeDocument': 'KnowledgeDocument', 'sourceDocument': 'SourceDocument',
    'questionBank': 'QuestionBank', 'flashcardDeck': 'FlashcardDeck', 'mindmapData': 'MindmapData',
    'quizHistory': 'QuizHistory', 'arenaResult': 'ArenaResult', 'activityLog': 'ActivityLog',
    'chatSession': 'ChatSession', 'chatMessage': 'ChatMessage',
}
DIFFICULTY_MAP = {'biết': Difficulty.NHAN_BIET, 'nhận biết': Difficulty.NHAN_BIET, 'hiểu': Difficulty.THONG_HIEU,
                  'thông hiểu': Difficulty.THONG_HIEU, 'vận dụng': Difficulty.VAN_DUNG}
VIEW_EVENTS = {'Xem bộ Flashcard': EventType.FLASHCARD_VIEW, 'Xem sơ đồ tư duy': EventType.MINDMAP_VIEW}
PVP_PAIR_SECONDS = 10
SKIP_CONFIG_KEYS = {'LOG_RETENTION_DAYS'}


def _dt(value):
    if value in (None, ''):
        return None
    if isinstance(value, datetime):
        return value if timezone.is_aware(value) else timezone.make_aware(value, timezone.utc)
    parsed = parse_datetime(str(value))
    return parsed if parsed is None or timezone.is_aware(parsed) else timezone.make_aware(parsed, timezone.utc)


def _json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return value


@contextmanager
def keep_timestamps(*models):
    """Tắt auto_now / auto_now_add để giữ nguyên thời điểm gốc của dữ liệu cũ."""
    saved = []
    for model in models:
        for field in model._meta.concrete_fields:
            if getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
                saved.append((field, field.auto_now, field.auto_now_add))
                field.auto_now = field.auto_now_add = False
    try:
        yield
    finally:
        for field, auto_now, auto_now_add in saved:
            field.auto_now, field.auto_now_add = auto_now, auto_now_add


class DryRun(Exception):
    pass


class Command(BaseCommand):
    help = "Chuyen du lieu tu he thong cu (Prisma / Postgres hoac file dump JSON) sang CSDL moi"

    def add_arguments(self, parser):
        source = parser.add_mutually_exclusive_group(required=True)
        source.add_argument('--source-url', help='DATABASE_URL Postgres cua he thong cu')
        source.add_argument('--from-json', help='File dump JSON (scratch/prod-db-dump.ts cua ban cu)')
        parser.add_argument('--dry-run', action='store_true', help='Chay thu roi rollback')
        parser.add_argument('--allow-existing', action='store_true', help='Cho phep khi CSDL moi da co hoc sinh')

    # ---------------------------------------------------------------------------------------------- nguồn
    def load(self, options) -> dict:
        if options['from_json']:
            with open(options['from_json'], encoding='utf-8') as fh:
                raw = json.load(fh)
            return {key: raw.get(key) or [] for key in TABLES}
        import psycopg2
        import psycopg2.extras
        data = {}
        with psycopg2.connect(options['source_url']) as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for key, table in TABLES.items():
                cur.execute('SELECT to_regclass(%s)', (f'"{table}"',))
                if cur.fetchone()['to_regclass'] is None:
                    data[key] = []
                    continue
                cur.execute(f'SELECT * FROM "{table}"')
                data[key] = [dict(r) for r in cur.fetchall()]
        return data

    # ---------------------------------------------------------------------------------------------- chạy
    def handle(self, *args, **options):
        if set(Role.objects.values_list('role_code', flat=True)) < {'ADMIN', 'TEACHER', 'STUDENT'} or not Challenge.objects.exists():
            raise CommandError("Chua co vai tro / thu thach mac dinh. Chay `python manage.py bootstrap` truoc.")
        if StudentProfile.all_objects.exists() and not options['allow_existing']:
            raise CommandError("CSDL moi da co hoc sinh. Dung --allow-existing neu chac chan muon nhap them.")
        data = self.load(options)
        self.report = {}
        try:
            with transaction.atomic(), keep_timestamps(
                User, SchoolClass, StudentProfile, TeacherProfile, UserStats, XpLog, UserChallenge, KnowledgeChunk,
                SourceDocument, Question, FlashcardDeck, Mindmap, QuizAttempt, ChatSession, ChatMessage, ArenaMatch,
                ArenaParticipant,
            ):
                self.run(data)
                if options['dry_run']:
                    raise DryRun()
        except DryRun:
            self.stdout.write(self.style.WARNING("DRY RUN: da rollback, khong ghi du lieu."))
        for name, (source, created) in self.report.items():
            self.stdout.write(f"  {name:<22} nguon {source:>6}  ->  tao {created:>6}")
        if not options['dry_run']:
            self.stdout.write(self.style.SUCCESS("Hoan tat. Chay `python manage.py shell -c \"from apps.knowledge.tasks "
                                                 "import embed_pending_chunks; embed_pending_chunks()\"` de nhung vector."))

    def track(self, name, source, created):
        self.report[name] = (source, created)

    def run(self, d):
        self.classes = self.import_classes(d['class'])
        self.users = self.import_users(d['user'], d['studentProfile'], d['teacherProfile'])
        self.import_stats(d['userStats'], d['xpLog'])
        self.import_challenges(d['challenge'], d['userChallenge'])
        self.import_settings(d['systemConfig'])
        self.sources = self.import_sources(d['sourceDocument'])
        self.import_knowledge(d['knowledgeDocument'])
        self.import_revision(d['questionBank'], d['flashcardDeck'], d['mindmapData'], d['quizHistory'])
        self.import_chat(d['chatSession'], d['chatMessage'])
        self.import_arena(d['arenaResult'])
        self.import_view_events(d['activityLog'])

    # ---------------------------------------------------------------------------------------------- học vụ
    def import_classes(self, rows) -> dict:
        mapping = {}
        for r in rows:
            obj, _ = SchoolClass.all_objects.get_or_create(code=r['code'].strip().upper(), defaults={
                'name': r['name'], 'grade': r['grade'], 'academic_year': r['academicYear'],
                'created_at': _dt(r['createdAt']), 'updated_at': _dt(r['updatedAt']),
            })
            mapping[r['id']] = obj
        self.track('Classes', len(rows), len(mapping))
        return mapping

    def import_users(self, rows, students, teachers) -> dict:
        roles = {r.role_code: r for r in Role.objects.all()}
        mapping, created = {}, 0
        for r in rows:
            username = r['username'].strip().lower()
            existing = User.objects.filter(username__iexact=username).first()
            if existing:
                mapping[r['id']] = existing
                continue
            status = r['status']
            user = User(
                username=username, email=r['email'] or '', full_name=r['displayName'] or username,
                password=LegacyScryptPasswordHasher.from_legacy(r['passwordHash']),
                is_active=status == 'ACTIVE', must_change_password=bool(r['mustChangePassword']),
                last_login=_dt(r['lastLoginAt']), created_at=_dt(r['createdAt']), updated_at=_dt(r['updatedAt']),
                deleted_at=_dt(r['updatedAt']) if status == 'ARCHIVED' else None,
            )
            user.save()
            if roles.get(r['role']):
                user.roles.add(roles[r['role']])
            mapping[r['id']] = user
            created += 1
        self.track('Users', len(rows), created)

        user_class = {r['id']: r.get('classId') for r in rows}
        n = 0
        for s in students:
            user = mapping.get(s['userId'])
            if user is None or StudentProfile.all_objects.filter(user=user).exists():
                continue
            StudentProfile.objects.create(
                user=user, student_code=s['studentCode'].strip().upper(), grade=s['grade'] if s['grade'] in (6, 7, 8, 9) else 6,
                school_class=self.classes.get(user_class.get(s['userId'])), is_active=user.is_active,
                deleted_at=user.deleted_at, created_at=_dt(s['createdAt']), updated_at=_dt(s['updatedAt']),
            )
            n += 1
        self.track('StudentProfiles', len(students), n)
        n = 0
        for t in teachers:
            user = mapping.get(t['userId'])
            if user is None or TeacherProfile.all_objects.filter(user=user).exists():
                continue
            TeacherProfile.objects.create(
                user=user, employee_code=(t.get('employeeCode') or '').strip().upper() or None, subject=t.get('subject'),
                is_active=user.is_active, created_at=_dt(t['createdAt']), updated_at=_dt(t['updatedAt']),
            )
            n += 1
        self.track('TeacherProfiles', len(teachers), n)
        return mapping

    # ---------------------------------------------------------------------------------------------- thành tích
    def import_stats(self, stats, logs):
        n = 0
        for s in stats:
            user = self.users.get(s['userId'])
            if user is None:
                continue
            last = _dt(s['lastStudyDate'])
            UserStats.objects.update_or_create(user=user, defaults={
                'total_xp': max(s['totalXp'], 0), 'weekly_xp': max(s['weeklyXp'], 0), 'points': max(s['points'], 0),
                'current_streak': s['currentStreak'], 'longest_streak': s['longestStreak'],
                'last_study_date': timezone.localtime(last).date() if last else None, 'updated_at': _dt(s['updatedAt']),
            })
            n += 1
        self.track('UserStats', len(stats), n)

        xp_rows, events = [], []
        for r in logs:
            user = self.users.get(r['userId'])
            if user is None:
                continue
            action = r['action']
            if action == 'WIN_ARENA':
                action = XpAction.ARENA
            elif action == 'CHAT_AI' and r['amount'] < 0:
                action = XpAction.GUARD_PENALTY  # bản cũ ghi phạt vi phạm dưới tên CHAT_AI
            created = _dt(r['createdAt'])
            xp_rows.append(XpLog(user=user, amount=r['amount'], action=action, created_at=created))
            if action == XpAction.DAILY_LOGIN:
                events.append(LearningEvent(user=user, event_type=EventType.LOGIN, occurred_at=created))
            elif action == XpAction.COMPLETE_QUIZ:
                events.append(LearningEvent(user=user, event_type=EventType.QUIZ, occurred_at=created,
                                            metadata={'imported': True, 'correct_count': r['amount'] // 10}))
        XpLog.objects.bulk_create(xp_rows, batch_size=500)
        LearningEvent.objects.bulk_create(events, batch_size=500)
        self.track('XpLogs', len(logs), len(xp_rows))
        self.track('LearningEvents (XP)', len(logs), len(events))

    def import_challenges(self, challenges, progress):
        by_key = {c['id']: Challenge.all_objects.filter(code=c['key']).first() for c in challenges}
        n = 0
        for p in progress:
            user, challenge = self.users.get(p['userId']), by_key.get(p['challengeId'])
            if user is None or challenge is None:
                continue
            when = _dt(p['lastCompletedAt']) or _dt(p['updatedAt'])
            UserChallenge.objects.get_or_create(
                user=user, challenge=challenge, period_key=timezone.localtime(when).date().isoformat(),
                defaults={'progress': min(p['progress'], challenge.goal),
                          'completed_at': _dt(p['lastCompletedAt']) if p['isCompleted'] else None,
                          'created_at': _dt(p['createdAt']), 'updated_at': _dt(p['updatedAt'])},
            )
            n += 1
        self.track('UserChallenges', len(progress), n)

    def import_settings(self, rows):
        n = 0
        for r in rows:
            if r['key'] in SKIP_CONFIG_KEYS:
                continue
            updated = AiSetting.all_objects.filter(key=r['key']).update(value=r['value'])
            if not updated:
                AiSetting.objects.create(key=r['key'], label=r['key'], value=r['value'])
            n += 1
        self.track('AiSettings', len(rows), n)

    # ---------------------------------------------------------------------------------------------- tri thức
    def import_sources(self, rows) -> dict:
        mapping = {}
        for r in rows:
            mapping[r['id']] = SourceDocument.objects.create(
                title=r['filename'], grade=r['grade'] if r['grade'] in (6, 7, 8, 9) else None, topic=r['topic'],
                status=r['status'] if r['status'] in DocumentStatus.values else DocumentStatus.COMPLETED,
                total_chunks=r['totalChunks'], processed_chunks=r['parsedChunks'], raw_text=r['rawText'],
                generate_questions=True, created_at=_dt(r['createdAt']), updated_at=_dt(r['createdAt']),
            )
        self.track('SourceDocuments', len(rows), len(mapping))
        return mapping

    def import_knowledge(self, rows):
        objs = []
        for r in rows:
            tags = list(r['tags'] or [])
            grade = next((int(m.group(1)) for t in tags if (m := re.match(r'Khối (\d)', t))), None)
            topic = next((t for t in tags if not re.match(r'Khối ', t) and t not in ('Hệ thống', 'Chung', 'Tri thức nạp')), None)
            created = _dt(r['createdAt'])
            objs.append(KnowledgeChunk(title=r['title'][:255], content=r['content'], grade=grade if grade in (6, 7, 8, 9) else None,
                                       topic=topic, is_active=r['isActive'], created_at=created, updated_at=created))
        KnowledgeChunk.objects.bulk_create(objs)
        self.track('KnowledgeChunks', len(rows), len(objs))

    # ---------------------------------------------------------------------------------------------- ôn tập
    def import_revision(self, questions, decks, mindmaps, quizzes):
        n = 0
        for r in questions:
            options = _json(r['options'])
            is_mc = r['type'] == 'MULTIPLE_CHOICE'
            broken = is_mc and (not isinstance(options, list) or len(options) != 4 or r['correctAnswer'] not in options)
            created = _dt(r['createdAt'])
            Question.objects.create(
                grade=r['grade'], school_class=self.classes.get(r['classId']), topic=r['topic'],
                question_type=r['type'], difficulty=DIFFICULTY_MAP.get((r['difficulty'] or '').strip().lower(), Difficulty.NHAN_BIET),
                content=r['content'], options=options if is_mc else None, correct_answer=r['correctAnswer'],
                explanation=r['explanation'], status=r['status'] if r['status'] in QuestionStatus.values else QuestionStatus.APPROVED,
                origin='DOCUMENT' if r['sourceDocumentId'] else 'MANUAL', source_document=self.sources.get(r['sourceDocumentId']),
                is_active=bool(r['isActive']) and not broken,
                description='Nhập từ bản cũ: thiếu / sai phương án trắc nghiệm — cần sửa trước khi dùng' if broken else None,
                created_at=created, updated_at=created,
            )
            n += 1
        self.track('Questions', len(questions), n)

        for r in decks:
            created = _dt(r['createdAt'])
            FlashcardDeck.objects.create(grade=r['grade'], school_class=self.classes.get(r['classId']), topic=r['topic'],
                                         title=r['title'], cards=_json(r['cards']) or [], is_active=r['isActive'],
                                         created_at=created, updated_at=created)
        self.track('FlashcardDecks', len(decks), len(decks))
        for r in mindmaps:
            created = _dt(r['createdAt'])
            Mindmap.objects.create(grade=r['grade'], school_class=self.classes.get(r['classId']), topic=r['topic'],
                                   title=r['title'], nodes=_json(r['markdown']) or [], is_active=r['isActive'],
                                   created_at=created, updated_at=created)
        self.track('Mindmaps', len(mindmaps), len(mindmaps))

        n = 0
        for r in quizzes:
            user = self.users.get(r['userId'])
            if user is None:
                continue
            created = _dt(r['createdAt'])
            QuizAttempt.objects.create(user=user, quiz_type=r['quizType'], total_questions=r['totalQuestions'],
                                       correct_count=r['correctCount'], xp_earned=r['xpEarned'],
                                       created_at=created, updated_at=created)
            n += 1
        self.track('QuizAttempts', len(quizzes), n)

    # ---------------------------------------------------------------------------------------------- chat
    def import_chat(self, sessions, messages):
        session_map = {}
        for r in sessions:
            user = self.users.get(r['userId'])
            if user is None:
                continue
            session_map[r['id']] = ChatSession.objects.create(
                user=user, title=r['title'][:255], created_at=_dt(r['createdAt']), updated_at=_dt(r['updatedAt']),
                last_message_at=_dt(r['updatedAt']),
            )
        self.track('ChatSessions', len(sessions), len(session_map))

        msgs, events = [], []
        for r in sorted(messages, key=lambda m: str(m['createdAt'])):
            session = session_map.get(r['sessionId'])
            if session is None:
                continue
            created = _dt(r['createdAt'])
            msgs.append(ChatMessage(session=session, role=r['role'], content=r['content'] or '', created_at=created))
            if r['role'] == 'USER':
                events.append(LearningEvent(user=session.user, event_type=EventType.CHAT, occurred_at=created,
                                            metadata={'imported': True}))
        ChatMessage.objects.bulk_create(msgs, batch_size=500)
        LearningEvent.objects.bulk_create(events, batch_size=500)
        self.track('ChatMessages', len(messages), len(msgs))
        self.track('LearningEvents (CHAT)', len(messages), len(events))

    # ---------------------------------------------------------------------------------------------- đấu trường
    def import_arena(self, rows):
        rows = [r for r in rows if self.users.get(r['userId'])]
        rows.sort(key=lambda r: str(r['createdAt']))
        used, matches, events = set(), 0, []
        for i, r in enumerate(rows):
            if r['id'] in used:
                continue
            used.add(r['id'])
            created = _dt(r['createdAt'])
            partner = None
            if r['mode'] == 'PVP':
                for other in rows[i + 1:]:
                    gap = (_dt(other['createdAt']) - created).total_seconds()
                    if gap > PVP_PAIR_SECONDS:
                        break
                    if other['id'] not in used and other['mode'] == 'PVP' and other['topic'] == r['topic'] and other['userId'] != r['userId']:
                        partner = other
                        used.add(other['id'])
                        break
            mode = MatchMode.PVP if r['mode'] == 'PVP' else MatchMode.AI
            note = None if partner else ('Nhập từ bản cũ — không có điểm đối thủ AI' if mode == MatchMode.AI
                                         else f"Nhập từ bản cũ — đối thủ: {r['opponent']}")
            match = ArenaMatch.objects.create(mode=mode, topic=r['topic'] or 'Ôn tập KHTN', questions=[],
                                              status=MatchStatus.FINISHED, started_at=created, ended_at=created,
                                              description=note, created_at=created, updated_at=created)
            for row in filter(None, [r, partner]):
                user = self.users[row['userId']]
                ArenaParticipant.objects.create(match=match, user=user, score=row['score'], is_winner=bool(row['winner']),
                                                xp_earned=row['xpEarned'], answers=[], created_at=_dt(row['createdAt']),
                                                updated_at=_dt(row['createdAt']))
                events.append(LearningEvent(user=user, event_type=EventType.ARENA, occurred_at=_dt(row['createdAt']),
                                            source_type='ARENA_MATCH', source_id=match.id,
                                            metadata={'mode': mode, 'topic': match.topic, 'winner': bool(row['winner'])}))
            matches += 1
        LearningEvent.objects.bulk_create(events, batch_size=500)
        self.track('ArenaMatches', len(rows), matches)

    def import_view_events(self, logs):
        events = []
        for r in logs:
            kind = VIEW_EVENTS.get(r['action'])
            user = self.users.get(r['userId'])
            if kind and user:
                events.append(LearningEvent(user=user, event_type=kind, occurred_at=_dt(r['createdAt']),
                                            metadata={'imported': True}))
        LearningEvent.objects.bulk_create(events, batch_size=500)
        self.track('LearningEvents (xem)', len(logs), len(events))

