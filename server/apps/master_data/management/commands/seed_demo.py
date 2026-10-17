"""
seed_demo — dữ liệu MẪU cho module ví dụ master-data (ĐVT, nhóm NVL, NVL kim loại).
Không bắt buộc; dùng để demo / phát triển. Dự án clone từ template có thể xóa cùng module master_data.
Idempotent: chạy lại chỉ cập nhật theo mã.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.master_data.models import Material, MaterialCategory, MetalMaterialSpec, ProfileShape, UnitOfMeasure

DEFAULT_MATERIAL_CATEGORIES = [
    # 1. Gỗ xẻ sấy & Phôi gỗ (WOOD)
    {'code': 'WOOD', 'name': 'Gỗ xẻ sấy & Phôi gỗ', 'parent_code': None, 'sort_order': 10, 'description': 'Nhóm gốc: Gỗ tự nhiên, Gỗ công nghiệp, Ván ép, Veneer...'},
    {'code': 'WOOD_SOLID', 'name': 'Gỗ tự nhiên xẻ sấy', 'parent_code': 'WOOD', 'sort_order': 10, 'description': 'Gỗ Teak, Gỗ Sồi, Gỗ Tràm, Gỗ Ash, Gỗ Cao su, Gỗ Óc chó...'},
    {'code': 'WOOD_ENGINEERED', 'name': 'Gỗ công nghiệp & Ván nhân tạo', 'parent_code': 'WOOD', 'sort_order': 20, 'description': 'Ván MDF, HDF kháng ẩm, Plywood phủ keo, Gỗ ghép thanh finger joint...'},
    {'code': 'WOOD_VENEER', 'name': 'Veneer & Bề mặt phủ', 'parent_code': 'WOOD', 'sort_order': 30, 'description': 'Veneer Teak, Veneer Sồi, Melamine, Laminate ép nhiệt, Chỉ nẹp dán cạnh...'},

    # 2. Kim loại hộp & Ống định hình (METAL)
    {'code': 'METAL', 'name': 'Kim loại hộp & Ống định hình', 'parent_code': None, 'sort_order': 20, 'description': 'Nhóm gốc: Khung kim loại, Ống, Hộp, La phẳng, Tấm...'},
    {'code': 'METAL_STEEL', 'name': 'Sắt thép hộp & Ống định hình', 'parent_code': 'METAL', 'sort_order': 10, 'description': 'Ống thép tròn, Thép hộp vuông/chữ nhật, Thép mạ kẽm, Thép V, La phẳng...'},
    {'code': 'METAL_ALUMINUM', 'name': 'Nhôm định hình & Nhôm tấm', 'parent_code': 'METAL', 'sort_order': 20, 'description': 'Ống nhôm tròn, Hộp nhôm, Nhôm định hình hệ 6063-T5, Nhôm tấm dập lỗ...'},
    {'code': 'METAL_STAINLESS', 'name': 'Inox & Thép không gỉ', 'parent_code': 'METAL', 'sort_order': 30, 'description': 'Hộp Inox 304, Ống Inox 201, Tấm Inox hairline xước mờ...'},

    # 3. Hóa chất, Sơn & Hoàn thiện (CHEMICAL_PAINT)
    {'code': 'CHEMICAL_PAINT', 'name': 'Hóa chất, Sơn & Hoàn thiện', 'parent_code': None, 'sort_order': 30, 'description': 'Nhóm gốc: Sơn lót, Sơn bóng, Màu lau, Tinh màu, Xăng pha...'},
    {'code': 'PAINT_PRIMER', 'name': 'Sơn lót & Bột bả trám trét', 'parent_code': 'CHEMICAL_PAINT', 'sort_order': 10, 'description': 'Sơn lót PU 1K/2K, Lót NC, Bột trét gỗ mastic, Keo trám khuyết tật phôi...'},
    {'code': 'PAINT_TOPCOAT', 'name': 'Sơn bóng & Mờ hoàn thiện bề mặt', 'parent_code': 'CHEMICAL_PAINT', 'sort_order': 20, 'description': 'Sơn bóng 50%, 70%, 100%, Sơn mờ chống trầy, Men màu PU ngoài trời...'},
    {'code': 'PAINT_STAIN', 'name': 'Tinh màu & Màu lau Stain', 'parent_code': 'CHEMICAL_PAINT', 'sort_order': 30, 'description': 'Tinh màu đậm đặc, Màu lau gỗ gốc dầu/gốc nước glaze...'},
    {'code': 'PAINT_SOLVENT', 'name': 'Dung môi & Hóa chất xử lý', 'parent_code': 'CHEMICAL_PAINT', 'sort_order': 40, 'description': 'Xăng PU chậm khô, Thinner pha sơn, Chất làm cứng Hardener...'},

    # 4. Dây đan & Mây nhựa (WEAVING)
    {'code': 'WEAVING', 'name': 'Dây đan & Mây nhựa', 'parent_code': None, 'sort_order': 40, 'description': 'Nhóm gốc: Dây thừng rope, Mây PE, Dây đan ngoài trời...'},
    {'code': 'WEAVING_ROPE', 'name': 'Dây thừng & Dây đan Poly', 'parent_code': 'WEAVING', 'sort_order': 10, 'description': 'Dây thừng dẹt, Dây tròn có lõi cao su, Dây đan Polyester chống UV...'},
    {'code': 'WEAVING_RATTAN', 'name': 'Mây nhựa nhân tạo PE', 'parent_code': 'WEAVING', 'sort_order': 20, 'description': 'Dây mây nhựa dẹp, Dây bán nguyệt, Dây mây tròn PE ngoài trời...'},
    {'code': 'WEAVING_NATURAL', 'name': 'Mây tre & Dây đan tự nhiên', 'parent_code': 'WEAVING', 'sort_order': 30, 'description': 'Mây mắt cáo tự nhiên, Dây cói, Dây lục bình phơi khô xử lý lưu huỳnh...'},

    # 5. Vải nệm & Mút xốp (FABRIC_FOAM)
    {'code': 'FABRIC_FOAM', 'name': 'Vải nệm & Mút xốp', 'parent_code': None, 'sort_order': 50, 'description': 'Nhóm gốc: Vải bọc sofa, Nệm mút, Gòn cuộn...'},
    {'code': 'FABRIC_OUTDOOR', 'name': 'Vải bọc ngoài trời chuyên dụng', 'parent_code': 'FABRIC_FOAM', 'sort_order': 10, 'description': 'Vải trượt nước chống tia cực tím Sunbrella, Olefin, Polyester 250gsm...'},
    {'code': 'FABRIC_INDOOR', 'name': 'Vải bọc trong nhà & Da nhân tạo', 'parent_code': 'FABRIC_FOAM', 'sort_order': 20, 'description': 'Vải bố canvas, Vải nỉ nhung cao cấp, Da nhân tạo Microfiber/PU...'},
    {'code': 'FOAM_CORE', 'name': 'Mút xốp & Gòn lót ruột nệm', 'parent_code': 'FABRIC_FOAM', 'sort_order': 30, 'description': 'Mút thoát nước ngoài trời QuickDry Foam, Mút D25, Mút D30, Gòn tơ cuốn...'},

    # 6. Phụ kiện & Ngũ kim (HARDWARE)
    {'code': 'HARDWARE', 'name': 'Phụ kiện & Ngũ kim', 'parent_code': None, 'sort_order': 60, 'description': 'Nhóm gốc: Ốc vít, Bu lông, Bản lề, Chân tăng đơ, Ray trượt...'},
    {'code': 'HARDWARE_FASTENER', 'name': 'Ốc vít, Bu lông & Tán cấy', 'parent_code': 'HARDWARE', 'sort_order': 10, 'description': 'Bu lông lục giác chìm, Vít bắn gỗ Inox 304, Tán cấy mộng, Tán chấu...'},
    {'code': 'HARDWARE_FITTING', 'name': 'Bản lề, Ray trượt & Khóa liên kết', 'parent_code': 'HARDWARE', 'sort_order': 20, 'description': 'Bản lề giảm chấn, Ray trượt bi 3 tầng, Tay nâng thủy lực, Pát liên kết...'},
    {'code': 'HARDWARE_GLIDE', 'name': 'Nút chân đế & Tăng đơ cân bằng', 'parent_code': 'HARDWARE', 'sort_order': 30, 'description': 'Nút chân đế cao su chống trượt, Tăng đơ xoay điều chỉnh cốt sàn...'},

    # 7. Bao bì & Đóng gói (PACKAGING)
    {'code': 'PACKAGING', 'name': 'Bao bì & Đóng gói', 'parent_code': None, 'sort_order': 70, 'description': 'Nhóm gốc: Thùng carton, Màng xốp quấn, Dây đai nẹp...'},
    {'code': 'PACKAGING_CARTON', 'name': 'Thùng Carton & Tấm lót', 'parent_code': 'PACKAGING', 'sort_order': 10, 'description': 'Thùng Carton 5 lớp sóng BC, Thùng 7 lớp xuất khẩu, Tấm đệm sóng...'},
    {'code': 'PACKAGING_WRAP', 'name': 'Màng bảo vệ & Xốp bọc góc', 'parent_code': 'PACKAGING', 'sort_order': 20, 'description': 'Màng PE quấn pallet, Xốp nổ bóng khí Bubble, Thanh nẹp góc xốp EPE...'},
    {'code': 'PACKAGING_TAPE', 'name': 'Băng keo & Dây đai nẹp thùng', 'parent_code': 'PACKAGING', 'sort_order': 30, 'description': 'Băng keo trong/vàng dán thùng, Dây đai nhựa PP nẹp kiện, Bọ sắt khóa đai...'},
]

DEFAULT_UNITS = [
    {'code': 'PCS', 'name': 'Cái (Chiếc)', 'description': 'Đơn vị tính thành phẩm, chi tiết phụ kiện rời'},
    {'code': 'SET', 'name': 'Bộ', 'description': 'Bộ bàn ghế, combo phòng khách / phòng ngủ'},
    {'code': 'PACK', 'name': 'Gói / Thùng', 'description': 'Quy cách đóng gói vật tư, ngũ kim đóng gói'},
    {'code': 'BAR', 'name': 'Cây (Thanh)', 'description': 'Cây nhôm, thanh sắt hộp tiêu chuẩn 6m, cây la'},
    {'code': 'SHEET', 'name': 'Tấm', 'description': 'Tấm nhôm dập, tấm sắt, tấm ván MDF/Plywood'},
    {'code': 'M3', 'name': 'Mét khối (m³)', 'description': 'Khối lượng gỗ xẻ phôi thô (Gỗ Tràm, Cao Su, Tần Bì, Sồi)'},
    {'code': 'M2', 'name': 'Mét vuông (m²)', 'description': 'Diện tích bề mặt tính sơn lót, sơn phủ, bóng hoàn thiện hoặc ván ép MDF/Plywood'},
    {'code': 'M', 'name': 'Mét dài (m)', 'description': 'Chỉ dán cạnh veneer, nẹp viền, băng dính'},
    {'code': 'KG', 'name': 'Kilogram (kg)', 'description': 'Keo ghép mộng, bột bả mastic, sơn thô đóng phuy'},
    {'code': 'LITER', 'name': 'Lít (L)', 'description': 'Dung môi pha sơn xăng thinner, sơn lót, chất làm cứng cứng NC/PU'},
    {'code': 'ROLL', 'name': 'Cuộn', 'description': 'Giấy ráp nhám thùng, màng PE bọc bảo vệ đóng gói'},
    {'code': 'PAIR', 'name': 'Đôi (Cặp)', 'description': 'Ray trượt ngăn kéo, bản lề mở cánh tủ'},
]

DEFAULT_MATERIALS = [
    {
        'material_code': 'KL-00001',
        'material_name': 'Nhôm hộp chữ nhật 20x30 dày 1.2 cây 6m',
        'category_code': 'METAL_ALUMINUM',
        'base_uom_code': 'BAR',
        'image_url': 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=400&q=80',
        'description': 'Nhôm định hình hệ 6063-T5 cho khung ghế sofa outdoor',
        'metal_spec': {
            'profile_shape': ProfileShape.RECT_TUBE,
            'outer_dimension_1': 20.00,
            'outer_dimension_2': 30.00,
            'thickness': 1.20,
            'standard_bar_length': 6000.00,
            'end_trim_loss': 50.00,
            'saw_kerf_loss': 3.00,
            'weight_per_meter_kg': 0.3080,
            'mold_code': 'AM-1203',
            'features': '',
        }
    },
    {
        'material_code': 'KL-00002',
        'material_name': 'Ống nhôm tròn Phi 29 dày 1.5 cây 6m',
        'category_code': 'METAL_ALUMINUM',
        'base_uom_code': 'BAR',
        'image_url': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80',
        'description': 'Ống tròn uốn tay vịn ghế ngoài trời, khuôn Phú Mỹ',
        'metal_spec': {
            'profile_shape': ProfileShape.ROUND_PIPE,
            'outer_dimension_1': 29.00,
            'outer_dimension_2': None,
            'thickness': 1.50,
            'standard_bar_length': 6000.00,
            'end_trim_loss': 50.00,
            'saw_kerf_loss': 3.00,
            'weight_per_meter_kg': 0.3540,
            'mold_code': 'PM029-T15',
            'features': '',
        }
    },
    {
        'material_code': 'KL-00003',
        'material_name': 'Hộp nhôm vuông 52x52 dày 2.0 cây 5m bo góc',
        'category_code': 'METAL_ALUMINUM',
        'base_uom_code': 'BAR',
        'image_url': '',
        'description': 'Khuôn bo góc R=3 chịu tải trọng lớn chân bàn ăn',
        'metal_spec': {
            'profile_shape': ProfileShape.SQUARE_TUBE,
            'outer_dimension_1': 52.00,
            'outer_dimension_2': None,
            'thickness': 2.00,
            'standard_bar_length': 5000.00,
            'end_trim_loss': 50.00,
            'saw_kerf_loss': 3.00,
            'weight_per_meter_kg': 1.0650,
            'mold_code': '1252AL',
            'features': 'R=3',
        }
    },
    {
        'material_code': 'KL-00004',
        'material_name': 'Thanh la nhôm phẳng 4x30 cây 3m',
        'category_code': 'METAL_ALUMINUM',
        'base_uom_code': 'BAR',
        'image_url': '',
        'description': 'La dẹt đặc gia cường thanh giằng liên kết',
        'metal_spec': {
            'profile_shape': ProfileShape.FLAT_BAR,
            'outer_dimension_1': 30.00,
            'outer_dimension_2': None,
            'thickness': 4.00,
            'standard_bar_length': 3000.00,
            'end_trim_loss': 30.00,
            'saw_kerf_loss': 3.00,
            'weight_per_meter_kg': 0.3260,
            'mold_code': '',
            'features': 'DAC',
        }
    },
    {
        'material_code': 'KL-00005',
        'material_name': 'Thép hộp mạ kẽm chữ nhật 20x40 dày 1.2 cây 6m',
        'category_code': 'METAL_STEEL',
        'base_uom_code': 'BAR',
        'image_url': '',
        'description': 'Thép mạ kẽm chống rỉ kết cấu khung gầm bàn lớn',
        'metal_spec': {
            'profile_shape': ProfileShape.RECT_TUBE,
            'outer_dimension_1': 20.00,
            'outer_dimension_2': 40.00,
            'thickness': 1.20,
            'standard_bar_length': 6000.00,
            'end_trim_loss': 50.00,
            'saw_kerf_loss': 3.00,
            'weight_per_meter_kg': 1.0800,
            'mold_code': '',
            'features': '',
        }
    },
    {
        'material_code': 'GO-00001',
        'material_name': 'Gỗ Teak xẻ sấy dày 25mm chuẩn FSC',
        'category_code': 'WOOD_SOLID',
        'base_uom_code': 'M3',
        'image_url': 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=400&q=80',
        'description': 'Gỗ Teak tự nhiên nhập khẩu xẻ sấy độ ẩm < 12%',
        'metal_spec': None,
    },
    {
        'material_code': 'SN-00001',
        'material_name': 'Sơn bóng PU Oseven hệ ngoài trời (Topcoat)',
        'category_code': 'PAINT_TOPCOAT',
        'base_uom_code': 'LITER',
        'image_url': '',
        'description': 'Sơn bóng 2K chống tia UV và chịu thời tiết cao',
        'metal_spec': None,
    },
    {
        'material_code': 'PK-00001',
        'material_name': 'Bulong lục giác chìm Inox 304 M6x30mm',
        'category_code': 'HARDWARE_FASTENER',
        'base_uom_code': 'PCS',
        'image_url': '',
        'description': 'Phụ kiện liên kết ngầm chân bàn ăn và khung ghế',
        'metal_spec': None,
    },
]


class Command(BaseCommand):
    help = "Khoi tao du lieu mau master-data: Don vi tinh, Nhom NVL, Nguyen vat lieu"

    @transaction.atomic
    def handle(self, *args, **options):
        # Seed danh mục Đơn vị tính (Units of Measure)
        self.stdout.write("\nKhoi tao Danh muc Don vi tinh (Units of Measure)...")
        for u_data in DEFAULT_UNITS:
            unit, created = UnitOfMeasure.objects.update_or_create(
                code=u_data['code'],
                defaults={
                    'name': u_data['name'],
                    'description': u_data['description'],
                    'is_active': True,
                }
            )
            status_text = "[NEW]" if created else "[UPDATE]"
            self.stdout.write(f"  + {status_text} UOM: {unit.code}")

        # Seed danh mục Nhóm Nguyên Vật Liệu (Material Categories)
        self.stdout.write("\nKhoi tao Danh muc Nhom Nguyen Vat Lieu (Material Categories)...")
        cat_map = {}
        # 1. Tạo các nhóm gốc trước (parent_code is None)
        for mc_data in DEFAULT_MATERIAL_CATEGORIES:
            if not mc_data.get('parent_code'):
                cat, created = MaterialCategory.objects.update_or_create(
                    code=mc_data['code'],
                    defaults={
                        'name': mc_data['name'],
                        'parent': None,
                        'sort_order': mc_data['sort_order'],
                        'description': mc_data['description'],
                        'is_active': True,
                    }
                )
                cat_map[cat.code] = cat
                status_text = "[NEW]" if created else "[UPDATE]"
                self.stdout.write(f"  + {status_text} Root Category: {cat.code} - {cat.name}")

        # 2. Tạo các nhóm con (subtypes) gán parent_id
        for mc_data in DEFAULT_MATERIAL_CATEGORIES:
            p_code = mc_data.get('parent_code')
            if p_code:
                parent_obj = cat_map.get(p_code)
                cat, created = MaterialCategory.objects.update_or_create(
                    code=mc_data['code'],
                    defaults={
                        'name': mc_data['name'],
                        'parent': parent_obj,
                        'sort_order': mc_data['sort_order'],
                        'description': mc_data['description'],
                        'is_active': True,
                    }
                )
                cat_map[cat.code] = cat
                status_text = "[NEW]" if created else "[UPDATE]"
                self.stdout.write(f"    └── {status_text} Subtype: {cat.code} - {cat.name} (Parent: {p_code})")

        # Seed danh mục Nguyên Vật Liệu (Materials & MetalMaterialSpecs)
        self.stdout.write("\nKhoi tao Danh muc Nguyen Vat Lieu (Materials & MetalMaterialSpecs)...")
        uom_map = {u.code: u for u in UnitOfMeasure.objects.filter(deleted_at__isnull=True)}
        for m_data in DEFAULT_MATERIALS:
            cat_obj = cat_map.get(m_data['category_code'])
            uom_obj = uom_map.get(m_data['base_uom_code'])
            if not cat_obj or not uom_obj:
                continue

            metal_spec_data = m_data.get('metal_spec')
            mat, created = Material.objects.update_or_create(
                material_code=m_data['material_code'],
                defaults={
                    'material_name': m_data['material_name'],
                    'category': cat_obj,
                    'base_uom': uom_obj,
                    'image_url': m_data.get('image_url', ''),
                    'description': m_data.get('description', ''),
                    'is_active': True,
                }
            )
            status_text = "[NEW]" if created else "[UPDATE]"
            self.stdout.write(f"  + {status_text} Material: {mat.material_code} - {mat.material_name}")

            if metal_spec_data:
                spec, s_created = MetalMaterialSpec.objects.update_or_create(
                    material=mat,
                    defaults={
                        'profile_shape': metal_spec_data['profile_shape'],
                        'outer_dimension_1': metal_spec_data['outer_dimension_1'],
                        'outer_dimension_2': metal_spec_data['outer_dimension_2'],
                        'thickness': metal_spec_data['thickness'],
                        'standard_bar_length': metal_spec_data['standard_bar_length'],
                        'end_trim_loss': metal_spec_data['end_trim_loss'],
                        'saw_kerf_loss': metal_spec_data['saw_kerf_loss'],
                        'weight_per_meter_kg': metal_spec_data['weight_per_meter_kg'],
                        'mold_code': metal_spec_data['mold_code'],
                        'features': metal_spec_data['features'],
                        'is_active': True,
                    }
                )
                self.stdout.write(f"    └── MetalSpec: {spec.get_profile_shape_display()} (L={spec.standard_bar_length}mm, kg/m={spec.weight_per_meter_kg})")

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Hoan tat khoi tao du lieu mau master-data."))
