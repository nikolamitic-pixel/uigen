# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates and edits files in a virtual file system that renders in real-time without writing to disk.

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run lint       # ESLint
npm test           # Vitest unit tests
npm run setup      # Install deps + Prisma migrate (first-time setup)
npm run db:reset   # Reset SQLite database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Architecture

### Data Flow for Component Generation

1. User types in chat → `ChatInterface` sends `{messages, files (serialized VirtualFileSystem), projectId}` to `POST /api/chat`
2. `api/chat/route.ts` calls Claude (Haiku 4.5) via Vercel AI SDK `streamText()`, with the virtual FS injected into the system prompt
3. Claude uses two tools — `str_replace_editor` (edit file ranges) and `file_manager` (create/delete/rename) — to modify the virtual FS
4. Streamed tool calls flow back to `file-system-context.tsx` which updates in-memory state
5. `PreviewFrame` picks up changed files, transforms JSX via Babel standalone in-browser, and re-renders the iframe

### Virtual File System (`src/lib/file-system.ts`)

Pure in-memory Map-based tree. No disk writes. Serialized for API transmission and DB persistence. The root entrypoint is always `/App.jsx`. Paths are normalized to always have a leading `/` and no trailing `/`.

### Three-Panel UI (`src/app/main-content.tsx`)

Resizable panels: **Chat** (left) | **Code Editor** (center) | **Preview** (right). State is split across two React contexts:
- `chat-context.tsx` — wraps Vercel AI SDK's `useChat` hook
- `file-system-context.tsx` — owns `VirtualFileSystem` state and exposes it to editor and preview

### API Route (`src/app/api/chat/route.ts`)

- 120s timeout, up to 40 tool-use steps
- System prompt (in `src/lib/prompts/generation.tsx`) uses Anthropic ephemeral prompt caching
- If `ANTHROPIC_API_KEY` is unset, falls back to `MockLanguageModel` in `src/lib/provider.ts`

### Persistence

- Authenticated users: messages + serialized file system saved to SQLite via Prisma after each chat completion
- Anonymous users: data lives only in browser memory; tracked via `anon-work-tracker.ts` (localStorage)
- DB schema is in `prisma/schema.prisma` — two models: `User` (auth) and `Project` (stores messages + file system JSON as plain JSON strings)

### Auth

JWT stored as an httpOnly cookie (7-day expiry). Server actions in `src/actions/` handle sign-up/sign-in/sign-out. `middleware.ts` verifies JWT for protected API routes.

## Key Conventions

- **Styling**: Tailwind CSS v4 only. The system prompt explicitly forbids hardcoded inline styles in generated components.
- **Imports**: `@/` alias maps to `src/`. Generated components must use `@/` for cross-file imports.
- **Path alias**: `tsconfig.json` maps `@/*` → `./src/*`.
- **No API key needed**: The mock provider returns static component code, so the full UI works without an `ANTHROPIC_API_KEY`.
