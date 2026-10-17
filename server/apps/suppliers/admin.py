from django.contrib import admin

from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('supplier_code', 'supplier_name', 'tax_code', 'phone', 'is_active', 'updated_at')
    search_fields = ('supplier_code', 'supplier_name', 'tax_code')
    list_filter = ('is_active',)
