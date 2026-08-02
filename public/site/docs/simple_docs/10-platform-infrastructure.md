# 10. Platform Infrastructure

## Goal
Provide the minimal hosting and operations setup that keeps the AquaLudo MVP site live, secure, and recoverable: a single web host, a real domain with HTTPS, environment-based configuration, and a basic backup of the database.

## User Stories (MVP)
- As the owner, I want the site deployed on a single managed host (e.g. Vercel for the Next.js app + Supabase for the database), so that the MVP is online with the least operational overhead.
- As a visitor, I want the site to load at `aqualudo.net` over HTTPS, so that the academy looks trustworthy and bookings are submitted securely.
- As a developer, I want secrets (database URL, payment keys, API keys) stored as environment variables on the host, so that they never appear in the code or git history.
- As the owner, I want a separate staging environment that mirrors production with a different database, so that I can preview changes safely before going live.
- As the owner, I want the database to be automatically backed up daily, so that bookings, customer accounts, and content can be restored if data is lost.
- As the owner, I want a single source of truth for database schema changes via versioned migration files, so that the dev, staging, and production databases stay in sync.

## Out of Scope (for MVP)
- Multi-region failover or CDN beyond what the default host provides.
- Kubernetes, containers, or custom infrastructure orchestration.
- Observability stacks (Sentry, custom metrics, log aggregation, alerting).
- Feature flags, A/B testing infrastructure, or staged rollouts.
- Complex CI/CD pipelines (preview deploys per PR, automated canaries).
- Security audit pipelines, penetration testing automation, or compliance tooling.
- GDPR data-export or account-deletion tooling.
- Per-table RLS policy templates, audit log tables, or telemetry event primitives.
- Custom image CDN, signed-URL workflows, or hotlink protection.
- Cron jobs, scheduled tasks, or background workers.
- Database performance audits, `pg_trgm` search, or advanced indexing strategies.
- PITR, manual restore drills, or off-site backup replication.
