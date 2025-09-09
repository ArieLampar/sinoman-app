# 🚀 Setup Keamanan Sinoman SuperApp

Panduan langkah demi langkah untuk mengonfigurasi sistem keamanan yang komprehensif.

## ✅ Prerequisites

- Node.js 18+ terinstall
- Supabase project sudah dibuat
- Database PostgreSQL ready
- Basic knowledge tentang Next.js dan TypeScript

## 🔧 Langkah 1: Environment Configuration

### 1.1 Salin Environment File
```bash
cp .env.example .env.local
```

### 1.2 Generate Secure Secrets
```bash
npm run security:validate -- --generate-secrets
```

### 1.3 Konfigurasi .env.local
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security Secrets (gunakan output dari langkah 1.2)
JWT_SECRET=your_generated_jwt_secret_32_chars_minimum
SESSION_SECRET=your_generated_session_secret_32_chars_minimum
CSRF_SECRET=your_generated_csrf_secret_32_chars_minimum

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Audit & Monitoring
ENABLE_AUDIT_LOG=true
LOG_LEVEL=info
ALERT_EMAIL=admin@koperasi-anda.com

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🗄️ Langkah 2: Database Setup

### 2.1 Jalankan Migrasi Keamanan
Di Supabase SQL Editor, jalankan:
```sql
-- Salin dan jalankan isi file database/migrations/001_security_tables.sql
```

### 2.2 Verifikasi Tabel
Pastikan tabel berikut berhasil dibuat:
- `audit_logs`
- `security_alerts`
- `login_attempts`
- `rate_limit_violations`
- `user_sessions`

### 2.3 Setup Row Level Security
RLS sudah dikonfigurasi otomatis melalui migrasi. Verifikasi di Supabase Dashboard > Authentication > Policies.

## 📦 Langkah 3: Install Dependencies

```bash
npm install
```

Dependencies keamanan yang akan terinstall:
- `@types/jest` - TypeScript definitions untuk testing
- `jest` - Testing framework
- `node-mocks-http` - Mocking HTTP requests untuk testing
- `ts-jest` - TypeScript transformer untuk Jest

## 🧪 Langkah 4: Validasi Security Setup

```bash
npm run security:validate
```

Output yang diharapkan:
```
🔒 Sinoman SuperApp Security Validator

📋 Checking environment configuration...
✅ Environment file check completed

🗄️  Checking database schema...
ℹ️  Database schema check would require database connection

⚙️  Checking security configuration...
✅ Security configuration check completed

🛡️  Checking security middleware...
✅ Middleware check completed

🧪 Checking security tests...
✅ Found 1 security test file(s)
✅ Security tests check completed

📊 SECURITY VALIDATION REPORT
==================================================

✅ Passed checks: 15

🎉 Security validation completed successfully!
✅ Your application appears to be properly secured.
```

## 🔒 Langkah 5: Testing Security

### 5.1 Jalankan Security Tests
```bash
npm run test:security
```

### 5.2 Jalankan Dengan Coverage
```bash
npm run test:coverage
```

### 5.3 Expected Test Results
Semua test harus PASS:
- Configuration Tests ✅
- Rate Limiting Tests ✅
- Permission System Tests ✅
- Audit Logging Tests ✅
- Input Validation Tests ✅
- Integration Tests ✅

## 🚀 Langkah 6: Development Setup

### 6.1 Start Development Server
```bash
npm run dev
```

### 6.2 Akses Monitoring Dashboard
1. Buat user admin melalui Supabase Auth
2. Update role di tabel `members` menjadi 'admin'
3. Akses dashboard di: http://localhost:3000/admin/security

### 6.3 Test Security Features

#### Rate Limiting
```bash
# Test dengan curl (akan di-rate limit setelah 5 requests dalam 15 menit)
for i in {1..10}; do curl -X POST http://localhost:3000/api/auth/login; done
```

#### Suspicious Activity Detection
```bash
# Test SQL injection detection
curl "http://localhost:3000/api/test?id=1' OR '1'='1"
```

#### Permission System
1. Login sebagai member biasa
2. Coba akses `/admin/security` (harus ditolak)
3. Login sebagai admin
4. Akses `/admin/security` (harus berhasil)

## 📊 Langkah 7: Production Deployment

### 7.1 Update Environment Variables
```bash
# Production secrets (generate baru untuk production!)
JWT_SECRET=production_jwt_secret_64_chars_or_more
SESSION_SECRET=production_session_secret_64_chars_or_more
CSRF_SECRET=production_csrf_secret_64_chars_or_more

# Tighter rate limits untuk production
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=60000

# Production settings
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
LOG_LEVEL=warn

# Monitoring (opsional)
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

### 7.2 Pre-deployment Checklist
```bash
# Build aplikasi
npm run build

# Run security tests
npm run test:security

# Validate security configuration
npm run security:validate

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### 7.3 Database Production Setup
1. Backup database development
2. Apply migrasi di database production
3. Test koneksi dengan service role key
4. Verifikasi RLS policies aktif

## 🔄 Langkah 8: Monitoring Setup

### 8.1 Configure Logging
Di production, logs akan otomatis dikirim ke:
- Database (tabel `audit_logs`)
- Console output
- Webhook monitoring (jika dikonfigurasi)

### 8.2 Set Up Alerts
Konfigurasi alert untuk:
- Critical security events
- Rate limit violations
- Failed authentication attempts
- System errors

### 8.3 Regular Maintenance
Schedule cleanup otomatis:
```sql
-- Di Supabase, setup cron job untuk cleanup
SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');
```

## 🆘 Troubleshooting

### Environment Issues
```bash
# Check environment variables
npm run security:validate

# Generate new secrets jika diperlukan
npm run security:validate -- --generate-secrets
```

### Database Issues
```bash
# Periksa koneksi database
psql "postgresql://user:pass@host:port/db"

# Periksa tabel keamanan
\dt *audit*
\dt *security*
```

### Rate Limiting Issues
- Periksa redis connection jika menggunakan redis store
- Restart server jika in-memory store penuh
- Adjust rate limits di `config/security.ts`

### Permission Issues
- Periksa role user di tabel `members`
- Verify tenant isolation berfungsi
- Check RLS policies di Supabase

### Test Failures
```bash
# Clean cache dan re-run
npm test -- --clearCache
npm run test:security

# Debug specific test
npm test -- tests/security/security.test.ts --verbose
```

## 📞 Support

Jika mengalami masalah:

1. **Check Documentation**: Baca `KEAMANAN.md` untuk detail lengkap
2. **Run Validator**: Jalankan `npm run security:validate` untuk diagnosis
3. **Check Logs**: Periksa console output dan database logs
4. **Test Environment**: Pastikan semua environment variables benar

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Environment variables tidak terbaca | Restart development server |
| Rate limiting tidak bekerja | Periksa middleware configuration |
| Permission denied errors | Verify user role dan tenant ID |
| Database connection error | Check Supabase credentials |
| Test failures | Clear cache dan update dependencies |

## 🎯 Next Steps

Setelah setup berhasil:

1. **Customize Security Policies**: Sesuaikan rate limits dan permissions
2. **Set Up Monitoring**: Konfigurasi alerting dan dashboard
3. **Security Training**: Train tim tentang security best practices
4. **Regular Audits**: Schedule security reviews dan penetration testing
5. **Documentation**: Update dokumentasi sesuai environment specifik

---

**🔒 Security First!**  
Pastikan semua langkah dilakukan dengan hati-hati dan jangan skip validasi keamanan.

**Versi**: 1.0.0  
**Update Terakhir**: 9 September 2025