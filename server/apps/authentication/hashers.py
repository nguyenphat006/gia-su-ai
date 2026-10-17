"""
Hasher cho mật khẩu chuyển từ hệ thống cũ (gia-su-ai-khtn, Node.js).

Bản cũ băm bằng `crypto.scrypt(password, salt, 64)` của Node (N=16384, r=8, p=1), lưu dạng `<salt_hex>:<key_hex>`
— salt là chuỗi hex và được dùng nguyên văn (UTF-8) làm salt. Lệnh `import_legacy` lưu lại thành
`legacy_scrypt$<salt_hex>$<key_hex>`.

Hasher này đứng SAU PBKDF2 trong PASSWORD_HASHERS: Django chỉ dùng nó để kiểm tra mật khẩu cũ, rồi tự băm lại
bằng PBKDF2 ngay lần đăng nhập thành công đầu tiên (`must_update` luôn True).
"""
import hashlib
import hmac

from django.contrib.auth.hashers import BasePasswordHasher, mask_hash
from django.utils.translation import gettext_noop as _

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
KEY_LENGTH = 64


def _derive(password: str, salt: str) -> str:
    key = hashlib.scrypt(
        password.encode(), salt=salt.encode(), n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P,
        dklen=KEY_LENGTH, maxmem=64 * 1024 * 1024,
    )
    return key.hex()


class LegacyScryptPasswordHasher(BasePasswordHasher):
    algorithm = 'legacy_scrypt'

    @staticmethod
    def from_legacy(stored: str) -> str:
        """`<salt>:<hex>` (định dạng bản cũ) -> chuỗi `password` của Django."""
        salt, key_hex = stored.split(':', 1)
        return f'legacy_scrypt${salt}${key_hex}'

    def encode(self, password, salt):
        self._check_encode_args(password, salt)
        return f'{self.algorithm}${salt}${_derive(password, salt)}'

    def decode(self, encoded):
        algorithm, salt, key_hex = encoded.split('$', 2)
        assert algorithm == self.algorithm
        return {'algorithm': algorithm, 'salt': salt, 'hash': key_hex}

    def verify(self, password, encoded):
        decoded = self.decode(encoded)
        return hmac.compare_digest(_derive(password, decoded['salt']), decoded['hash'])

    def safe_summary(self, encoded):
        decoded = self.decode(encoded)
        return {
            _('algorithm'): decoded['algorithm'],
            _('salt'): mask_hash(decoded['salt']),
            _('hash'): mask_hash(decoded['hash']),
        }

    def must_update(self, encoded):
        return True

    def harden_runtime(self, password, encoded):
        pass
