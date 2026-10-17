"""Test Tri thức RAG: cắt đoạn, nạp tài liệu (mock Gemini), tìm kiếm vector, phân quyền."""
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.ai.client import AiUnavailable
from apps.authentication.models import Role
from apps.core.permissions import invalidate_user_permissions
from apps.revision.models import Question, QuestionStatus

from .models import DocumentStatus, KnowledgeChunk, SourceDocument
from .rag import retrieve_context, split_text

User = get_user_model()
DIM = 768


def fake_embed(texts, task_type='RETRIEVAL_DOCUMENT'):
    """Vector giả: chiều 0 nếu nói về 'quang hợp', chiều 1 cho mọi thứ khác."""
    out = []
    for text in texts:
        v = [0.0] * DIM
        v[0 if 'quang hợp' in text.lower() else 1] = 1.0
        out.append(v)
    return out


LONG_DOC = ("Quang hợp là quá trình lá cây hấp thụ ánh sáng mặt trời để tổng hợp chất hữu cơ từ khí carbon dioxide và nước. " * 3
            + "\n\n" + "Lực là sự đẩy hoặc kéo của vật này lên vật khác, đơn vị đo lực là Newton, kí hiệu N trong hệ SI. " * 3)


@override_settings(DEBUG=True)
class KnowledgeTests(TestCase):
    def setUp(self):
        call_command('seed_core', stdout=StringIO())
        invalidate_user_permissions()
        self.teacher = User.objects.create_user(username='gv', email='', password='Password123!')
        self.teacher.roles.add(Role.objects.get(role_code='TEACHER'))
        self.client = APIClient()
        self.client.force_authenticate(self.teacher)

    def test_split_text_respects_max_size(self):
        chunks = split_text("đoạn một\n\n" + "x" * 5000 + "\n\nđoạn cuối", max_chars=3000)
        self.assertTrue(all(len(c) <= 3000 for c in chunks))
        self.assertIn("đoạn một", chunks[0])

    @mock.patch('apps.knowledge.rag.embed_texts', side_effect=fake_embed)
    @mock.patch('apps.knowledge.ingest.generate_json')
    def test_upload_txt_creates_chunks_embeddings_and_pending_questions(self, gen, _embed):
        gen.return_value = {'questions': [
            {'content': 'Quang hợp cần gì?', 'options': ['Ánh sáng', 'Bóng tối', 'Muối', 'Đá'], 'correct_answer': 'Ánh sáng'},
        ]}
        upload = SimpleUploadedFile('bai1.txt', LONG_DOC.encode('utf-8'), content_type='text/plain')
        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.post('/api/v1/source-documents/upload/', {'file': upload, 'grade': 6, 'topic': 'Sinh học'}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)
        doc = SourceDocument.objects.get(pk=resp.json()['data']['id'])
        self.assertEqual(doc.status, DocumentStatus.COMPLETED)
        self.assertGreaterEqual(doc.chunks.count(), 1)
        self.assertFalse(doc.chunks.filter(embedding__isnull=True).exists())
        self.assertTrue(Question.objects.filter(source_document=doc, status=QuestionStatus.PENDING).exists())

        review = self.client.post(f'/api/v1/source-documents/{doc.id}/review-questions/', {'action': 'APPROVE_ALL'}, format='json')
        self.assertGreater(review.json()['data']['count'], 0)
        self.assertFalse(Question.objects.filter(source_document=doc, status=QuestionStatus.PENDING).exists())

    @mock.patch('apps.knowledge.rag.embed_texts', side_effect=AiUnavailable())
    def test_upload_marks_failed_on_ai_error(self, _embed):
        upload = SimpleUploadedFile('bai2.txt', LONG_DOC.encode('utf-8'), content_type='text/plain')
        with self.captureOnCommitCallbacks(execute=True):
            doc_id = self.client.post('/api/v1/source-documents/upload/', {'file': upload, 'generate_questions': False}, format='multipart').json()['data']['id']
        doc = SourceDocument.objects.get(pk=doc_id)
        self.assertEqual(doc.status, DocumentStatus.FAILED)
        self.assertTrue(doc.error_message)

    def test_reject_unsupported_file(self):
        upload = SimpleUploadedFile('virus.exe', b'MZ', content_type='application/octet-stream')
        resp = self.client.post('/api/v1/source-documents/upload/', {'file': upload}, format='multipart')
        self.assertIn('file', resp.json()['errors'])

    @mock.patch('apps.knowledge.rag.embed_texts', side_effect=fake_embed)
    def test_retrieve_context_by_meaning_and_grade(self, _embed):
        from apps.knowledge.rag import embed_chunks
        photo = KnowledgeChunk.objects.create(title='Quang hợp', content='Quang hợp ở lá cây...', grade=6)
        force = KnowledgeChunk.objects.create(title='Lực', content='Lực là sự đẩy hoặc kéo', grade=6)
        other_grade = KnowledgeChunk.objects.create(title='Quang hợp nâng cao', content='quang hợp khối 9', grade=9)
        embed_chunks([photo, force, other_grade])

        context, ids = retrieve_context('Quang hợp là gì?', grade=6, limit=5)
        self.assertEqual(ids, [photo.id])
        self.assertIn('Quang hợp ở lá cây', context)

    def test_student_cannot_manage_knowledge(self):
        student = User.objects.create_user(username='hs', email='', password='Password123!')
        student.roles.add(Role.objects.get(role_code='STUDENT'))
        self.client.force_authenticate(student)
        self.assertEqual(self.client.get('/api/v1/knowledge-chunks/').status_code, status.HTTP_403_FORBIDDEN)
