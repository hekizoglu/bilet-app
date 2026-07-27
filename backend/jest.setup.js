// Local Auth'u testlerde aktif etmek için
process.env.ENABLE_LOCAL_AUTH = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest_mock_long_enough_32_chars';
