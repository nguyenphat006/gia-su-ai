"""Test hợp đồng API cho khách hàng (sinh bởi startmodule — bổ sung test cho mọi quy tắc nghiệp vụ)."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import Permission, Role, RolePermission
from apps.core.permissions import invalidate_user_permissions

from .models import Customer

User = get_user_model()
URL = '/api/v1/customers/'


class CustomerApiTests(TestCase):
    def setUp(self):
        invalidate_user_permissions()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin_customers', email='a_customers@example.com', password='Password123!')
        self.client.force_authenticate(self.admin)

    def test_create_list_update_delete(self):
        resp = self.client.post(URL, {'customer_code': 'ikea', 'customer_name': 'IKEA', 'country': ' se '}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        body = resp.json()
        self.assertTrue(body['success'])
        self.assertEqual(body['data']['customer_code'], 'IKEA')
        self.assertEqual(body['data']['country'], 'SE')
        item_id = body['data']['id']

        listing = self.client.get(URL).json()
        self.assertEqual(listing['data']['count'], 1)

        resp = self.client.patch(f'{URL}{item_id}/', {'customer_name': 'IKEA Supply AG'}, format='json')
        self.assertEqual(resp.json()['data']['customer_name'], 'IKEA Supply AG')

        self.assertEqual(self.client.delete(f'{URL}{item_id}/').status_code, status.HTTP_200_OK)
        self.assertTrue(Customer.all_objects.filter(id=item_id, deleted_at__isnull=False).exists())

    def test_duplicate_code_is_validation_error(self):
        Customer.objects.create(customer_code='DUP', customer_name='Có sẵn')
        body = self.client.post(URL, {'customer_code': 'dup', 'customer_name': 'Trùng'}, format='json').json()
        self.assertEqual(body['code'], 'validation_error')
        self.assertIn('customer_code', body['errors'])

    def test_deleted_code_cannot_be_reused(self):
        old = Customer.objects.create(customer_code='OLD', customer_name='Đã xóa')
        old.soft_delete()
        body = self.client.post(URL, {'customer_code': 'OLD', 'customer_name': 'Mới'}, format='json').json()
        self.assertIn('customer_code', body['errors'])

    def test_country_must_be_iso_code_and_filterable(self):
        body = self.client.post(URL, {'customer_code': 'X1', 'customer_name': 'Sai', 'country': 'Thụy Điển'}, format='json').json()
        self.assertIn('country', body['errors'])
        Customer.objects.create(customer_code='US1', customer_name='Mỹ', country='US')
        Customer.objects.create(customer_code='JP1', customer_name='Nhật', country='JP')
        Customer.objects.create(customer_code='VN1', customer_name='Nội địa', country='VN')
        codes = {r['customer_code'] for r in self.client.get(URL, {'country__in': 'US,JP'}).json()['data']['results']}
        self.assertEqual(codes, {'US1', 'JP1'})

    def test_code_must_fit_sku_format(self):
        # "-" là dấu phân cách trong SKU (1-IKEA-0001-A) nên không được nằm trong mã khách hàng
        for bad in ('IK-EA', 'ÁNH DƯƠNG', 'A B'):
            body = self.client.post(URL, {'customer_code': bad, 'customer_name': 'Sai mã'}, format='json').json()
            self.assertEqual(body['code'], 'validation_error', bad)
            self.assertIn('customer_code', body['errors'])

    def test_requires_module_permission(self):
        role = Role.objects.create(role_code='VIEWER_CUSTOMER', role_name='Viewer')
        perm = Permission.objects.create(permission_code='CUSTOMER_READ', permission_name='Read', module='CUSTOMER')
        RolePermission.objects.create(role=role, permission=perm)
        viewer = User.objects.create_user(username='viewer_customers', email='v_customers@example.com', password='Password123!')
        viewer.roles.add(role)
        self.client.force_authenticate(viewer)

        self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)
        resp = self.client.post(URL, {'customer_code': 'NO', 'customer_name': 'Không quyền'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(f'{URL}upload-logo/', {}, format='multipart').status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_logo_rejects_non_image(self):
        bad = SimpleUploadedFile('logo.svg', b'<svg onload="alert(1)"/>', content_type='image/svg+xml')
        body = self.client.post(f'{URL}upload-logo/', {'file': bad}, format='multipart').json()
        self.assertEqual(body['code'], 'validation_error')
        self.assertIn('file', body['errors'])
