# Architecture: Book Catalog API

## Context / Overview

Book Catalog is a lightweight full-stack web application built on **Node.js + Express**.
A single-page vanilla-JS frontend communicates with a REST API that persists data to an
embedded **SQLite** database via `better-sqlite3`. All application logic (routing, Zod
validation, security middleware, error handling, and inline SQL) lives in `backend/app.js`.
The app is tested at two levels: Jest + Supertest unit/integration tests that call the
Express app factory directly, and Playwright end-to-end tests that drive a real browser
against a running server.

---

## Text Diagram (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                  │
│                                                                            │
│   ┌───────────────┐        ┌───────────────────────────────────────────┐  │
│   │  User/Browser │◄──────►│           UI  (index.html + app.js)       │  │
│   │               │  HTTP  │  • Fetch-based CRUD calls                 │  │
│   └───────────────┘        │  • DOM rendering with XSS guard (escHtml) │  │
│                             │  • Error display with auto-hide           │  │
│                             └──────────────────┬──────────────────────┘  │
└────────────────────────────────────────────────┼───────────────────────────┘
                                                  │  HTTP / REST JSON
                        ┌─────────────────────────▼──────────────────────────┐
                        │              Express API  (backend/app.js)          │
                        │                                                     │
                        │  ┌─────────────────────────────────────────────┐   │
                        │  │           Security Middleware (first)        │   │
                        │  │  • helmet()       – secure HTTP headers      │   │
                        │  │  • express-rate-limit – 100 req/min per IP  │   │
                        │  │  • x-powered-by   – disabled                │   │
                        │  │  • express.json({ limit: '10kb' })          │   │
                        │  └─────────────────────┬───────────────────────┘   │
                        │                        │                            │
                        │  ┌─────────────────────▼───────────────────────┐   │
                        │  │             Route Handlers                   │   │
                        │  │  GET  /api/books                             │   │
                        │  │  POST /api/books                             │   │
                        │  │  PUT  /api/books/:id                         │   │
                        │  │  DELETE /api/books/:id                       │   │
                        │  └──────┬──────────────────────────────────────┘   │
                        │         │                                           │
                        │  ┌──────▼──────────────────────────────────────┐   │
                        │  │          Zod Validation (inline)             │   │
                        │  │  • bookBodySchema  – title, author, year     │   │
                        │  │  • idParamSchema   – positive integer id     │   │
                        │  └──────┬──────────────────────────────────────┘   │
                        │         │  on error → next(err)                    │
                        │  ┌──────▼──────────────────────────────────────┐   │
                        │  │        Central Error Middleware               │   │
                        │  │  ZodError  → 400 VALIDATION_ERROR            │   │
                        │  │  .status 404 → 404 NOT_FOUND                 │   │
                        │  │  others    → 500 INTERNAL_ERROR              │   │
                        │  │  shape: { error: { code, message, details }} │   │
                        │  └──────┬──────────────────────────────────────┘   │
                        └─────────┼──────────────────────────────────────────┘
                                  │  better-sqlite3 synchronous calls
                        ┌─────────▼──────────────────────────────────────────┐
                        │       Data Access Layer  (inline SQL in app.js)    │
                        │                                                     │
                        │  Prepared statements (synchronous):                │
                        │  • SELECT * FROM books ORDER BY id ASC             │
                        │  • INSERT INTO books (title, author, year) ...     │
                        │  • UPDATE books SET title=?, author=?, year=? ...  │
                        │  • DELETE FROM books WHERE id = ?                  │
                        └─────────────────────┬──────────────────────────────┘
                                              │
                        ┌─────────────────────▼──────────────────────────────┐
                        │           SQLite DB  (DATABASE_FILE)                │
                        │                                                     │
                        │  Table: books                                       │
                        │  ┌──────┬──────────────┬─────────────┬───────┐    │
                        │  │ id   │ title        │ author      │ year  │    │
                        │  │ INT  │ TEXT NOT NULL │ TEXT NOTNULL│ INT   │    │
                        │  └──────┴──────────────┴─────────────┴───────┘    │
                        │  Default path: backend/books.sqlite                 │
                        │  Test path:    backend/test.sqlite                  │
                        └────────────────────────────────────────────────────┘

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  Test Layer  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  ┌──────────────────────────────┐     ┌──────────────────────────────────┐
  │  Jest + Supertest            │     │  Playwright (E2E)                │
  │  backend/__tests__/          │     │  e2e/books.spec.js               │
  │  • Calls createApp(testDb)   │     │  • Spawns real server            │
  │  • No HTTP server needed     │     │  • Drives Chromium headless      │
  │  • Isolated test.sqlite      │     │  • CRUD + validation flows       │
  │  • 15 unit/integration tests │     │  • 4 end-to-end scenarios        │
  └──────────────────────────────┘     └──────────────────────────────────┘
```

---

## Component Table

| Component | Responsibility | Interfaces |
|---|---|---|
| **User / Browser** | Initiates CRUD operations via the web UI | HTTP GET/POST/PUT/DELETE to `/api/books`; receives JSON responses |
| **UI** (`backend/public/index.html` + `app.js`) | Single-page frontend; renders book list, handles form submit, shows errors | Fetches `GET/POST/PUT/DELETE /api/books`; manipulates DOM; XSS-guarded via `escHtml()` |
| **Express API** (`backend/app.js`) | App factory; assembles and exports the Express application | Exports `createApp(dbPath): Express`; mounts all middleware and routes |
| **Security Middleware** (`helmet`, `express-rate-limit`) | Hardens HTTP headers; throttles requests to 100/min per IP; caps body at 10 KB | Applied globally before all route handlers via `app.use()` |
| **Route Handlers** (`GET/POST/PUT/DELETE /api/books`) | Map HTTP verbs + paths to controller logic; call Zod validation and DAO operations | Receive `req`, `res`, `next`; call `next(err)` on failure |
| **Zod Validation** (`bookBodySchema`, `idParamSchema`) | Validates and coerces request bodies and URL parameters; rejects malformed input early | Called inside route handlers via `schema.parse()`; throws `ZodError` on failure |
| **Central Error Middleware** (`(err, req, res, next)`) | Translates thrown errors into structured JSON responses; prevents stack-trace leaks | Receives any `err` passed via `next(err)`; returns `{ error: { code, message, details } }` |
| **Data Access Layer** (inline SQL in `app.js`) | Executes synchronous prepared-statement SQL against SQLite; encapsulates all persistence logic | Called by route handlers; uses `better-sqlite3` `.prepare().all/run/get()` API |
| **SQLite DB** (`DATABASE_FILE`) | Persistent relational store for the `books` table | File path configurable via `DATABASE_FILE` env var; defaults to `backend/books.sqlite`; test DB at `backend/test.sqlite` |
| **Jest + Supertest** (`backend/__tests__/books.test.js`) | Unit and integration tests; exercises all routes and error paths against an isolated SQLite database | Calls `createApp(testDb)` directly; 15 tests covering happy path, validation, and 404/400/500 cases |
| **Playwright** (`e2e/books.spec.js`) | End-to-end browser tests; verifies full UI + API + DB flow in headless Chromium | Configured via `playwright.config.js`; spawns `node backend/server.js` with `DATABASE_FILE=backend/test.sqlite` before tests |
