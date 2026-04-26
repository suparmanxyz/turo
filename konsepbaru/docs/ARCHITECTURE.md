# Arsitektur Sistem Turo

Dokumen ini menjelaskan arsitektur sistem Turo secara high-level. Untuk detail spesifikasi engine diagnostik, lihat `SRS-Turo-Diagnostik.md`.

## Overview

Turo adalah aplikasi web (mobile-friendly) dengan arsitektur three-tier:

```
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js 14)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Onboarding │  │  Test Runner │  │  Result/Roadmap │ │
│  │     Flow    │  │      UI      │  │    Display      │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                    HTTPS / REST
                         │
┌─────────────────────────────────────────────────────────┐
│              BACKEND (FastAPI Python)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Diagnostic  │  │  Adaptive    │  │   Profile/      │ │
│  │  Endpoints  │  │  Engine IRT  │  │   Mastery       │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Peta Prasyarat Service                     ││
│  │  (loaded from data/peta-prasyarat.json on startup)  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                         │
                    PostgreSQL
                         │
┌─────────────────────────────────────────────────────────┐
│              DATABASE (Supabase)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │   user   │ │ session  │ │ response │ │  item_bank │ │
│  │ profile  │ │          │ │          │ │            │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌────────────────────────────┐                        │
│  │   sub_materi_mastery       │                        │
│  └────────────────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Komponen Utama

### Frontend (Next.js)

**Struktur app router:**

```
src/app/
├── (public)/
│   ├── page.tsx                    # Landing page
│   └── login/page.tsx              # Login
├── (authenticated)/
│   ├── onboarding/
│   │   ├── welcome/page.tsx
│   │   ├── profile/page.tsx
│   │   └── mode-select/page.tsx
│   ├── test/
│   │   └── [sessionId]/
│   │       ├── page.tsx            # Test runner
│   │       └── result/page.tsx     # Test result
│   ├── learn/
│   │   ├── page.tsx                # Materi catalog
│   │   └── [materiKode]/page.tsx   # Materi detail dengan Cek Kesiapan
│   └── profile/page.tsx
└── api/                             # API route handlers (proxy ke backend)
```

**Key components:**

- `<DiagnosticSession>` — kontainer untuk satu sesi tes
- `<QuestionCard>` — render soal dengan opsi
- `<ProgressIndicator>` — adaptive progress (TIDAK soal X dari Y)
- `<SkipButton>` — muncul setelah 10 detik
- `<AreaHeatmap>` — visualisasi 5 area
- `<PrerequisiteMap>` — peta prasyarat untuk Deep Test result
- `<CekKesiapanCard>` — card pemanasan inline

### Backend (FastAPI)

**Layered architecture:**

```
app/
├── main.py                          # FastAPI app + middleware
├── api/                             # HTTP layer
│   ├── diagnostic.py               # /diagnostic/* endpoints
│   ├── cek_kesiapan.py             # /cek-kesiapan/* endpoints
│   ├── profile.py                  # /profile/* endpoints
│   └── auth.py                     # auth helpers
├── core/                            # Algoritma core (no I/O)
│   ├── irt_engine.py               # IRT 2PL math
│   ├── locator.py                  # Binary search locator
│   ├── area_coverage.py            # Area sampling logic
│   ├── multistage.py               # Deep Test stages
│   └── stopping_rules.py           # Decision: stop or continue
├── services/                        # Business logic (orchestration)
│   ├── diagnostic_service.py       # Main orchestrator
│   ├── peta_service.py             # Akses peta prasyarat
│   ├── item_service.py             # Akses item bank
│   ├── profile_service.py          # User profile CRUD
│   └── cek_kesiapan_service.py     # Lapis 2 logic
├── models/                          # Pydantic models
│   ├── diagnostic.py               # Request/response schemas
│   ├── user.py
│   └── item.py
└── db/                              # Database access
    ├── client.py                    # Supabase client init
    └── repositories/
        ├── user_repo.py
        ├── session_repo.py
        ├── response_repo.py
        └── item_repo.py
```

**Layer rules:**

- `api/` HANYA HTTP concerns — parsing, validation, response. Tidak ada business logic.
- `services/` orchestrate. Memanggil core algorithms dan repositories.
- `core/` pure logic. Tidak ada database access. Mudah di-unit-test.
- `db/repositories/` HANYA database access. Tidak ada business logic.

### Database (Supabase)

**Tables (sesuai SRS Section 9):**

- `user_profile` — profil user
- `diagnostic_session` — sesi tes (Onboarding, Cek Kesiapan, Post-Test)
- `item_response` — jawaban per soal
- `sub_materi_mastery` — status penguasaan per sub-materi
- `item_bank` — bank soal

**Indexes wajib:**

- `user_profile.user_id` (PK)
- `diagnostic_session.user_id` + `started_at` (untuk query history)
- `item_response.session_id` (untuk reconstruct session)
- `sub_materi_mastery.user_id` + `sub_materi_kode` (composite, untuk lookup mastery)
- `item_bank.sub_materi_kode` + `area` (untuk item selection)

**RLS Policies:**

- `user_profile`: user hanya bisa baca/edit profil sendiri
- `diagnostic_session`: user hanya akses session sendiri
- `item_response`: user hanya akses response sendiri
- `sub_materi_mastery`: user hanya akses mastery sendiri
- `item_bank`: read-only untuk authenticated user, write hanya admin

## Data Flow

### Flow 1: Onboarding Diagnostic (Fast Test)

```
1. User register → user_profile created
2. User pilih mode "Fast Test" jalur SMP
3. Frontend: POST /diagnostic/start
   { user_id, mode: "fast", jalur: "SMP" }
4. Backend:
   - Buat diagnostic_session dengan status="in_progress"
   - Initialize IRT theta = 0
   - Pilih kelas tengah (K3-4 untuk SMP)
   - Pilih item milestone dari peta_service
   - Return: { session_id, item: {...} }
5. User jawab soal
6. Frontend: POST /diagnostic/answer
   { session_id, item_id, answer, response_time_ms }
7. Backend:
   - Save item_response
   - Update theta dengan EAP
   - Check stopping rules
   - Kalau belum stop: pilih next item, return item baru
   - Kalau stop: compute final result, return result
8. Repeat 5-7 sampai stop
9. Frontend: GET /diagnostic/result/{session_id}
10. Backend: return profile result + recommendations
```

### Flow 2: Cek Kesiapan

```
1. User pilih materi target SMP K8 SPLDV
2. Frontend: GET /cek-kesiapan/check
   { user_id, target_kode: "SMP.8.B5.01" }
3. Backend:
   - Ambil prereq dari peta_service
   - Filter STRICT prereqs
   - Cek mastery di sub_materi_mastery
   - Identify blind spots (no data atau outdated)
   - Kalau blind spots = 0: return { needs_warmup: false }
   - Kalau blind spots 1-3: return { needs_warmup: true, blind_spots: [...] }
   - Kalau >3: return { needs_warmup: false, suggest_rediagnostic: true }
4. Kalau needs_warmup: frontend tampilkan card pemanasan
5. User klik "Pemanasan"
6. Frontend: POST /cek-kesiapan/start
   { user_id, target_kode, blind_spots }
7. Backend:
   - Buat session "cek_kesiapan"
   - Pilih 1-2 soal per blind spot dari item_bank
   - Return: { session_id, items: [...] }
8. User jawab semua (no adaptive, fixed sequence)
9. Frontend: POST /cek-kesiapan/submit
10. Backend:
    - Compute pass/fail per blind spot
    - Update sub_materi_mastery
    - Return action: "lulus" | "review_materi_X" | "review_fundamental"
11. Frontend: navigate sesuai action
```

## Authentication & Authorization

- Supabase Auth handles registration, login, session management
- Frontend: Supabase Auth Helpers untuk Next.js
- Backend: Verify Supabase JWT di middleware
- All endpoints (kecuali health) require authentication
- RLS di database menjadi second layer of defense

## Caching Strategy

**Frontend:**
- React Query untuk API responses (dengan stale-while-revalidate)
- LocalStorage untuk session state (auto-save tiap 30 detik)
- IndexedDB untuk offline mode (opsional di Phase 1)

**Backend:**
- In-memory cache untuk peta prasyarat (loaded once at startup)
- In-memory cache untuk item bank metadata (refresh tiap jam)
- Redis (opsional) untuk session theta state — alternatif: query DB tiap request

## Performance Targets

Sesuai SRS Section 13:

- API response time p95 < 500ms
- Diagnostic completion time match estimasi (±20%)
- Engine uptime ≥ 99.5%

**Bottleneck yang perlu diwaspadai:**

1. IRT computation untuk theta update — cache prior calculation, batch jika perlu
2. Item selection (Maximum Information) — pre-compute info function untuk current theta
3. Peta prasyarat traversal — gunakan index `dependents` untuk reverse lookup

## Deployment

### Development

- Backend: `uvicorn app.main:app --reload` (port 8000)
- Frontend: `npm run dev` (port 3000)
- DB: Supabase (online, shared dev project)

### Staging

- Backend: Railway atau Fly.io (auto-deploy dari main branch)
- Frontend: Vercel preview deploys per PR
- DB: Supabase staging project

### Production

- Backend: Railway/Fly.io production (auto-deploy dari `release` branch)
- Frontend: Vercel production
- DB: Supabase production project (separate)
- Monitoring: Sentry untuk errors, custom dashboard untuk diagnostic metrics

## Security

- HTTPS only (no HTTP)
- Supabase Auth dengan email verification
- Rate limiting di backend (per user, per endpoint)
- Input validation via Pydantic
- SQL injection prevention via parameterized queries (Supabase client default)
- CORS: only allow trusted origins (Vercel domain)
- Secrets management: Vercel Environment Variables, Railway Secrets

## Monitoring & Observability

**Logs:**
- Structured JSON logs (Loguru atau structlog)
- Critical events: diagnostic start/end, failures, edge cases

**Metrics:**
- Diagnostic completion rate (per jalur, per mode)
- Average time per stage
- Skip rate distribution
- Theta convergence (SE values)
- API latency p50/p95/p99

**Alerts:**
- Backend down → page on-call
- Error rate > 5% → notification
- DB query > 1s → log
- Skip rate spike → investigate item bank quality

## Future Considerations

**Phase 2+:**

- Lapis 3 Post-Test (separate SRS)
- Modul belajar engine (separate spec)
- Real-time collaborative learning
- Parent dashboard
- Teacher dashboard untuk sekolah mitra
- Offline-first mode untuk daerah dengan internet lambat
- Multilingual (Arabic untuk konteks Islamic schools)

**Scale considerations:**

- Database read replicas saat user > 10K
- Edge functions untuk locator (latency-critical)
- ML-based item selection (di atas Maximum Information classic)
