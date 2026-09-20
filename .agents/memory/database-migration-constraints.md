---
name: Database migration constraints
description: Compatibility rules for extending the existing PostgreSQL schema without breaking startup or seed upserts.
---

Existing database installations must receive additive migrations for newly referenced columns before seed logic runs. When seed SQL uses `ON CONFLICT (column)`, the matching unique index must be a normal unique index; a partial unique index is not inferred by PostgreSQL unless the conflict clause includes its predicate.

**Why:** The app's first full runtime verification exposed both issues only on an existing database, after the initial schema creation path had already succeeded.

**How to apply:** Keep schema additions idempotent, migrate legacy columns in the same initialization batch, and make unique-index predicates match the exact `ON CONFLICT` target.