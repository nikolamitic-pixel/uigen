---
name: Database schema location
description: Where to find the Prisma schema for understanding the structure of data stored in the database
type: reference
---

The database schema is defined in `prisma/schema.prisma`. Always read this file when reasoning about database structure, models, or stored data.

Two models:
- `User` — id (cuid), email (unique), password (bcrypt hash), timestamps
- `Project` — id (cuid), name, userId (nullable — null for anonymous), messages (JSON string, default "[]"), data (JSON string for serialized virtual file system, default "{}"), timestamps. Cascades on user delete.
