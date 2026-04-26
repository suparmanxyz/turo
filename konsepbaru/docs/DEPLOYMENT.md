# Deployment Guide

Panduan deploy Turo ke production.

## Stack Hosting

| Komponen | Provider | Alasan |
|----------|----------|--------|
| Frontend | Vercel | Next.js native, free tier generous, deploy otomatis dari GitHub |
| Backend | Railway atau Fly.io | Python support, auto-scaling, affordable |
| Database | Supabase | PostgreSQL managed, RLS built-in |
| CDN | Cloudflare (optional) | Static assets, image optimization |

## Frontend — Deploy ke Vercel

### Setup awal (sekali)

1. Push code ke GitHub repository
2. Import repository di Vercel dashboard
3. Set Framework Preset: Next.js (auto-detected)
4. Root Directory: `frontend`
5. Set environment variables di Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

### Auto-deploy

Setiap push ke `main` branch akan auto-deploy ke production.
Pull request akan generate preview URL.

### Custom domain

1. Buy domain (e.g. turo.id)
2. Vercel dashboard → Settings → Domains → Add
3. Update DNS records sesuai instruksi Vercel

## Backend — Deploy ke Railway

### Setup awal

1. Sign up di railway.app
2. New Project → Deploy from GitHub
3. Pilih repository, set root directory: `backend`
4. Add environment variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ENVIRONMENT=production
   LOG_LEVEL=INFO
   CORS_ORIGINS=https://turo.id,https://your-vercel-app.vercel.app
   ```
5. Add `railway.toml` (kalau perlu custom build):
   ```toml
   [build]
   builder = "nixpacks"
   
   [deploy]
   startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
   ```

### Domain custom

Railway provides `*.railway.app` URL otomatis.
Untuk custom domain, set di Railway dashboard.

## Database — Supabase Setup

### Create project

1. Sign up di supabase.com
2. New Project → set password kuat (simpan di password manager!)
3. Tunggu provisioning (~2 menit)

### Apply migrations

**Via SQL Editor (manual)**:

1. Buka project → SQL Editor
2. Open file `backend/migrations/001_initial_schema.sql`
3. Copy-paste ke editor → Run
4. Verify tabel ter-create di Database → Tables

**Via Supabase CLI (recommended)**:

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
cd backend
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Auth setup

1. Authentication → Providers → enable Email
2. Set Site URL ke production frontend URL
3. (Optional) Enable Google/Apple OAuth

### Storage setup

(Untuk asset visual soal — di phase 2+)

1. Storage → New bucket: `item-images`
2. Set bucket policy: read-only public
3. Update env: `NEXT_PUBLIC_SUPABASE_STORAGE_URL`

## Monitoring

### Vercel Analytics

- Built-in di Vercel free tier
- Real User Metrics (LCP, FCP, etc)
- Page views, top routes

### Sentry (recommended)

- Error tracking untuk frontend dan backend
- Free tier: 5K events/month

```bash
# Frontend
npm install @sentry/nextjs

# Backend
pip install sentry-sdk[fastapi]
```

### Custom dashboard

Untuk metrik diagnostik (completion rate, accuracy, dll), buat dashboard sederhana di Supabase Studio menggunakan SQL views.

Contoh query untuk completion rate:
```sql
SELECT
  jalur,
  mode,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 2
  ) as completion_rate_pct
FROM diagnostic_session
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY jalur, mode;
```

## Backup Strategy

### Database backups

- Supabase Pro: automatic daily backups, 7-day retention
- Free tier: manual backup via Supabase CLI

```bash
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Item bank backup

Item bank adalah aset paling berharga (banyak waktu authoring).
Schedule weekly dump dan upload ke Google Drive atau S3.

## Performance Targets

Sesuai SRS Section 13:
- API response time p95 < 500ms
- Frontend LCP < 2.5s
- Engine uptime ≥ 99.5%

### Cache strategy

Kalau hit performance bottleneck:
- Add Redis untuk session state caching
- Vercel Edge Functions untuk locator (latency-critical)
- Item bank metadata cached di backend memory

## Rollback Plan

### Frontend

Vercel: Settings → Deployments → previous deployment → Promote to Production

### Backend

Railway: Deployments → previous deployment → Redeploy

### Database

Hindari destructive migrations di production. Pakai expand-contract pattern.
Backup before migration. Test di staging dulu.

## Security Checklist

- [ ] Environment variables tidak committed ke Git
- [ ] CORS origins restrictive (hanya production frontend URL)
- [ ] RLS enabled di semua tabel
- [ ] Service role key TIDAK diexpose ke frontend
- [ ] HTTPS only (no HTTP)
- [ ] Rate limiting di backend
- [ ] Email verification enabled di Supabase Auth
- [ ] Strong password policy
- [ ] Regular security audits

## Cost Estimation

Kalkulasi rough untuk 1000 active users:

| Service | Tier | Cost/month |
|---------|------|-----------|
| Vercel | Hobby (free) atau Pro ($20) | $0-20 |
| Railway | Hobby ($5 + usage) | $10-30 |
| Supabase | Free atau Pro ($25) | $0-25 |
| Domain | turo.id | ~$10/year |
| **Total** | | **$10-75** |

Skala 10K users: estimate $100-300/month.
