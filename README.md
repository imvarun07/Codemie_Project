# Book Catalog

A simple full-stack book catalog application with an Express backend and a browser-based frontend.

## Setup

**Prerequisites:** Node.js 18+

```bash
# Install backend dependencies
cd backend
npm install

# Return to project root for E2E tooling
cd ..
npm install
```

## Running the app

```bash
cd backend
npm start
# Server starts at http://localhost:3000
```

For auto-reload during development:

```bash
cd backend
npm run dev
```

## Environment variables

| Variable        | Default                    | Description                          |
|-----------------|----------------------------|--------------------------------------|
| `PORT`          | `3000`                     | Port the HTTP server listens on      |
| `DATABASE_FILE` | `backend/books.sqlite`     | Path to the SQLite database file     |

Example — run on a different port with a custom DB:

```bash
PORT=4000 DATABASE_FILE=/tmp/mybooks.sqlite node backend/server.js
```

## API reference

All endpoints return JSON. Error responses always have this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | INTERNAL_ERROR",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### GET /api/books

List all books, ordered by id ascending.

```bash
curl http://localhost:3000/api/books
```

Response `200`:

```json
[
  { "id": 1, "title": "Dune", "author": "Frank Herbert", "year": 1965 }
]
```

### POST /api/books

Create a new book.

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"title": "1984", "author": "George Orwell", "year": 1949}'
```

Response `201`:

```json
{ "id": 2, "title": "1984", "author": "George Orwell", "year": 1949 }
```

### PUT /api/books/:id

Update an existing book.

```bash
curl -X PUT http://localhost:3000/api/books/2 \
  -H "Content-Type: application/json" \
  -d '{"title": "Nineteen Eighty-Four", "author": "George Orwell", "year": 1949}'
```

Response `200` — returns the updated book. Returns `404` if the id does not exist.

### DELETE /api/books/:id

Delete a book by id.

```bash
curl -X DELETE http://localhost:3000/api/books/2
```

Response `204` (no body). Returns `404` if the id does not exist.

## Validation rules

All `POST` and `PUT` requests are validated with Zod. Violations return `400 VALIDATION_ERROR`.

| Field    | Rules                                                    |
|----------|----------------------------------------------------------|
| `title`  | Required string; leading/trailing whitespace is trimmed  |
| `author` | Required string; leading/trailing whitespace is trimmed  |
| `year`   | Required integer between 1 and 2100 (inclusive)          |
| `:id`    | Must be a positive integer                               |

## Running tests

### API tests (Jest + Supertest)

```bash
cd backend
npm test
```

Runs 15 isolated tests against a temporary `backend/test.sqlite` database that is wiped between each test suite.

### E2E tests (Playwright)

Install Playwright browsers once (only required first time):

```bash
npx playwright install --with-deps chromium
```

Run the E2E suite:

```bash
npm run test:e2e
```

Playwright automatically starts `node backend/server.js` with `DATABASE_FILE=backend/test.sqlite` before running tests, then shuts it down after.

View the HTML report after a run:

```bash
npx playwright show-report
```
