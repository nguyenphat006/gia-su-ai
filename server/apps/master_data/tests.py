"""
Test hợp đồng API chuẩn (envelope, phân quyền, action hàng loạt) + nghiệp vụ master data.
Đây cũng là bộ test mẫu khi thêm module mới từ template.
"""
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import Permission, Role, RolePermission
from apps.core.permissions import invalidate_user_permissions
from apps.master_data.models import Material, MaterialCategory, UnitOfMeasure

User = get_user_model()

UNITS_URL = '/api/v1/units/'
CATEGORIES_URL = '/api/v1/material-categories/'
MATERIALS_URL = '/api/v1/materials/'
PAGINATION_KEYS = {'count', 'total_pages', 'current_page', 'page_size', 'next', 'previous', 'results'}


class ApiTestMixin:
    def setUp(self):
        invalidate_user_permissions()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin_md', email='admin_md@example.com', password='Password123!')
        self.client.force_authenticate(self.admin)

    def make_user_with_perms(self, username, *perm_codes):
        role = Role.objects.create(role_code=f'ROLE_{username.upper()}', role_name=username)
        for code in perm_codes:
            perm, _ = Permission.objects.get_or_create(
                permission_code=code, defaults={'permission_name': code, 'module': code.rsplit('_', 1)[0]}
            )
            RolePermission.objects.create(role=role, permission=perm)
        user = User.objects.create_user(username=username, email=f'{username}@example.com', password='Password123!')
        user.roles.add(role)
        return user

    def assertEnvelope(self, response, success=True):
        body = response.json()
        self.assertEqual(set(body), {'success', 'message', 'data', 'errors', 'code'})
        self.assertIs(body['success'], success)
        self.assertIsInstance(body['message'], str)
        return body


class ResponseContractTests(ApiTestMixin, TestCase):
    def test_list_is_paginated_envelope(self):
        UnitOfMeasure.objects.create(code='PCS', name='Cái')
        body = self.assertEnvelope(self.client.get(UNITS_URL))
        self.assertEqual(set(body['data']), PAGINATION_KEYS)
        self.assertEqual(body['data']['count'], 1)

    def test_create_returns_201_with_read_serializer(self):
        resp = self.client.post(UNITS_URL, {'code': 'kg', 'name': 'Kilogram'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        body = self.assertEnvelope(resp)
        self.assertEqual(body['data']['code'], 'KG')
        self.assertIn('created_by_name', body['data'])  # field chỉ có ở serializer đọc
        self.assertIn('thành công', body['message'])

    def test_validation_error_has_field_errors(self):
        UnitOfMeasure.objects.create(code='M3', name='Mét khối')
        resp = self.client.post(UNITS_URL, {'code': 'M3', 'name': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        body = self.assertEnvelope(resp, success=False)
        self.assertEqual(body['code'], 'validation_error')
        self.assertIsInstance(body['errors'], dict)
        self.assertTrue(all(isinstance(v, list) for v in body['errors'].values()))

    def test_not_found_and_unauthenticated(self):
        body = self.assertEnvelope(self.client.get(f'{UNITS_URL}999999/'), success=False)
        self.assertEqual(body['code'], 'not_found')

        anon = APIClient()
        resp = anon.get(UNITS_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEnvelope(resp, success=False)

    def test_destroy_is_soft_delete(self):
        unit = UnitOfMeasure.objects.create(code='SET', name='Bộ')
        self.assertEnvelope(self.client.delete(f'{UNITS_URL}{unit.id}/'))
        self.assertFalse(UnitOfMeasure.objects.filter(id=unit.id).exists())
        self.assertTrue(UnitOfMeasure.all_objects.filter(id=unit.id, deleted_at__isnull=False).exists())


class PermissionTests(ApiTestMixin, TestCase):
    def test_default_action_permission_mapping(self):
        reader = self.make_user_with_perms('reader', 'UNIT_READ')
        self.client.force_authenticate(reader)
        self.assertEqual(self.client.get(UNITS_URL).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f'{UNITS_URL}statistics/').status_code, status.HTTP_200_OK)

        resp = self.client.post(UNITS_URL, {'code': 'X', 'name': 'X'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEnvelope(resp, success=False)
        # export-excel -> UNIT_EXPORT (không phải UNIT_EXPORT_EXCEL)
        self.assertEqual(self.client.get(f'{UNITS_URL}export-excel/').status_code, status.HTTP_403_FORBIDDEN)

        exporter = self.make_user_with_perms('exporter', 'UNIT_EXPORT')
        self.client.force_authenticate(exporter)
        self.assertEqual(self.client.get(f'{UNITS_URL}export-excel/').status_code, status.HTTP_200_OK)

    def test_audit_logs_require_permission(self):
        nobody = self.make_user_with_perms('nobody')
        self.client.force_authenticate(nobody)
        self.assertEqual(self.client.get('/api/v1/audit-logs/').status_code, status.HTTP_403_FORBIDDEN)


class BatchActionTests(ApiTestMixin, TestCase):
    def test_batch_status_and_delete_use_ids(self):
        u1 = UnitOfMeasure.objects.create(code='A1', name='A1')
        u2 = UnitOfMeasure.objects.create(code='A2', name='A2')

        body = self.assertEnvelope(self.client.post(
            f'{UNITS_URL}batch-status/', {'ids': [u1.id, u2.id], 'is_active': False}, format='json'))
        self.assertEqual(body['data']['count'], 2)
        u1.refresh_from_db()
        self.assertFalse(u1.is_active)
        self.assertEqual(u1.updated_by, self.admin)

        body = self.assertEnvelope(self.client.post(f'{UNITS_URL}batch-delete/', {'ids': [u1.id, u2.id]}, format='json'))
        self.assertEqual(body['data']['count'], 2)

    def test_batch_requires_valid_ids(self):
        resp = self.client.post(f'{UNITS_URL}batch-delete/', {'unit_ids': [1]}, format='json')
        body = self.assertEnvelope(resp, success=False)
        self.assertIn('ids', body['errors'])

    def test_protected_records_are_skipped(self):
        parent = MaterialCategory.objects.create(code='METAL', name='Kim loại')
        MaterialCategory.objects.create(code='METAL_PIPE', name='Ống', parent=parent)
        lonely = MaterialCategory.objects.create(code='WOOD', name='Gỗ')

        body = self.assertEnvelope(self.client.post(
            f'{CATEGORIES_URL}batch-delete/', {'ids': [parent.id, lonely.id]}, format='json'))
        self.assertEqual(body['data']['count'], 1)
        self.assertEqual([s['id'] for s in body['data']['skipped']], [parent.id])

        resp = self.client.delete(f'{CATEGORIES_URL}{parent.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.assertEnvelope(resp, success=False)['code'], 'business_rule')


class MaterialCodeTests(ApiTestMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.metal = MaterialCategory.objects.create(code='METAL', name='Kim loại')
        self.pipe = MaterialCategory.objects.create(code='METAL_PIPE', name='Ống nhôm', parent=self.metal)
        self.uom = UnitOfMeasure.objects.create(code='CAY', name='Cây')

    def create_material(self, name):
        return self.client.post(MATERIALS_URL, {
            'material_code': 'AUTO', 'material_name': name,
            'category': self.pipe.id, 'base_uom': self.uom.id,
        }, format='json')

    def test_code_uses_root_prefix_and_increments(self):
        first = self.assertEnvelope(self.create_material('Ống 1'))['data']['material_code']
        second = self.assertEnvelope(self.create_material('Ống 2'))['data']['material_code']
        self.assertEqual(first, 'AUTO')  # mã người dùng gửi còn trống thì được giữ
        self.assertEqual(second, 'KL-00001')

    def test_soft_deleted_code_is_not_reused(self):
        Material.objects.create(material_code='KL-00007', material_name='Cũ', category=self.pipe, base_uom=self.uom).soft_delete()
        self.create_material('Ống A')  # 'AUTO'
        code = self.assertEnvelope(self.create_material('Ống B'))['data']['material_code']
        self.assertEqual(code, 'KL-00008')

    def test_next_code_endpoint(self):
        body = self.assertEnvelope(self.client.get(f'{MATERIALS_URL}next-code/', {'category_id': self.pipe.id}))
        self.assertEqual(body['data']['prefix'], 'KL')
        self.assertEqual(body['data']['next_code'], 'KL-00001')


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class MaterialImageUploadTests(ApiTestMixin, TestCase):
    """Ảnh NVL dùng helper chung apps/core/image_upload.py: nhận ảnh raster + SVG (bản vẽ mặt cắt), từ chối định dạng khác."""

    def upload(self, name, content=b'img', content_type='image/png'):
        return self.client.post(f'{MATERIALS_URL}upload-image/', {'file': SimpleUploadedFile(name, content, content_type=content_type)}, format='multipart')

    def test_accepts_image_and_returns_media_url(self):
        resp = self.upload('mat.PNG')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertRegex(self.assertEnvelope(resp)['data']['image_url'], r'materials/mat_[0-9a-f]{10}\.png$')
        self.assertEqual(self.upload('section.svg', b'<svg/>', 'image/svg+xml').status_code, status.HTTP_201_CREATED)

    def test_rejects_other_file_types(self):
        body = self.assertEnvelope(self.upload('note.txt', b'x', 'text/plain'), success=False)
        self.assertIn('file', body['errors'])


class SampleModuleSeedTests(TestCase):
    """Dữ liệu mẫu + phân quyền của module mẫu (tự gom qua apps/master_data/rbac.py)."""

    def test_seed_demo_is_idempotent(self):
        from io import StringIO
        from django.core.management import call_command

        call_command('seed_demo', stdout=StringIO())
        counts = (UnitOfMeasure.objects.count(), Material.objects.count())
        self.assertGreater(counts[1], 0)
        call_command('seed_demo', stdout=StringIO())
        self.assertEqual(counts, (UnitOfMeasure.objects.count(), Material.objects.count()))

    def test_seed_core_collects_sample_module_rbac(self):
        from io import StringIO
        from django.core.management import call_command
        from django.test import override_settings

        with override_settings(DEBUG=True):
            call_command('seed_core', stdout=StringIO())
        from apps.authentication.models import ModuleRegistry
        self.assertTrue(ModuleRegistry.objects.filter(module_code='MATERIAL', parent_code='MASTER_DATA').exists())
        admin = Role.objects.get(role_code='ADMIN')
        # ADMIN nhận toàn bộ quyền, gồm quyền của module mẫu
        self.assertEqual(RolePermission.objects.filter(role=admin).count(), Permission.objects.count())
        staff = Role.objects.get(role_code='STAFF')
        self.assertTrue(RolePermission.objects.filter(role=staff, permission__permission_code='MATERIAL_READ').exists())
        self.assertFalse(RolePermission.objects.filter(role=staff, permission__permission_code='MATERIAL_DELETE').exists())
