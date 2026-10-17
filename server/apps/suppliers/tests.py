"""Test hợp đồng API cho nhà cung cấp (sinh bởi startmodule — bổ sung test cho mọi quy tắc nghiệp vụ)."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import Permission, Role, RolePermission
from apps.core.permissions import invalidate_user_permissions

from .models import Supplier

User = get_user_model()
URL = '/api/v1/suppliers/'


class SupplierApiTests(TestCase):
    def setUp(self):
        invalidate_user_permissions()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin_suppliers', email='a_suppliers@example.com', password='Password123!')
        self.client.force_authenticate(self.admin)

    def test_create_list_update_delete(self):
        resp = self.client.post(URL, {'supplier_code': 'x01', 'supplier_name': 'Mẫu 1'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        body = resp.json()
        self.assertTrue(body['success'])
        self.assertEqual(body['data']['supplier_code'], 'X01')
        item_id = body['data']['id']

        listing = self.client.get(URL).json()
        self.assertEqual(listing['data']['count'], 1)

        resp = self.client.patch(f'{URL}{item_id}/', {'supplier_name': 'Mẫu 1 (sửa)'}, format='json')
        self.assertEqual(resp.json()['data']['supplier_name'], 'Mẫu 1 (sửa)')

        self.assertEqual(self.client.delete(f'{URL}{item_id}/').status_code, status.HTTP_200_OK)
        self.assertTrue(Supplier.all_objects.filter(id=item_id, deleted_at__isnull=False).exists())

    def test_duplicate_code_is_validation_error(self):
        Supplier.objects.create(supplier_code='DUP', supplier_name='Có sẵn')
        body = self.client.post(URL, {'supplier_code': 'dup', 'supplier_name': 'Trùng'}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')
        self.assertIn('supplier_code', body['errors'])

    def test_contact_fields_trim_to_null_and_validate_email(self):
        body = self.client.post(URL, {'supplier_code': 'akzo', 'supplier_name': 'AkzoNobel', 'tax_code': ' 0301234567 ', 'phone': '  ', 'email': ''}, format='json').json()
        self.assertEqual((body['data']['tax_code'], body['data']['phone'], body['data']['email']), ('0301234567', None, None))
        bad = self.client.post(URL, {'supplier_code': 'B1', 'supplier_name': 'Sai email', 'email': 'khong-phai-email'}, format='json').json()
        self.assertIn('email', bad['errors'])

    def test_requires_module_permission(self):
        role = Role.objects.create(role_code='VIEWER_SUPPLIER', role_name='Viewer')
        perm = Permission.objects.create(permission_code='SUPPLIER_READ', permission_name='Read', module='SUPPLIER')
        RolePermission.objects.create(role=role, permission=perm)
        viewer = User.objects.create_user(username='viewer_suppliers', email='v_suppliers@example.com', password='Password123!')
        viewer.roles.add(role)
        self.client.force_authenticate(viewer)

        self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)
        resp = self.client.post(URL, {'supplier_code': 'NO', 'supplier_name': 'Không quyền'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
