const request = require('supertest');
const path = require('path');
const fs = require('fs');
const createApp = require('../app');

const TEST_DB = path.join(__dirname, '..', 'test.sqlite');

let app;

beforeAll(() => {
  try { fs.unlinkSync(TEST_DB); } catch {}
  app = createApp(TEST_DB);
});

afterAll(() => {
  try { fs.unlinkSync(TEST_DB); } catch {}
});

beforeEach(() => {
  const Database = require('better-sqlite3');
  const db = new Database(TEST_DB);
  db.prepare('DELETE FROM books').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name='books'").run();
  db.close();
});

// GET /api/books
describe('GET /api/books', () => {
  test('returns empty array when no books', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all books ordered by id', async () => {
    await request(app).post('/api/books').send({ title: 'A', author: 'Author', year: 2000 });
    await request(app).post('/api/books').send({ title: 'B', author: 'Author', year: 2001 });
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('A');
    expect(res.body[1].title).toBe('B');
  });
});

// POST /api/books
describe('POST /api/books', () => {
  test('creates a book and returns 201', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Dune');
    expect(res.body.author).toBe('Frank Herbert');
    expect(res.body.year).toBe(1965);
    expect(res.body.id).toBeDefined();
  });

  test('trims whitespace from title and author', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: '  Trimmed  ', author: '  Author  ', year: 2020 });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Trimmed');
    expect(res.body.author).toBe('Author');
  });

  test('returns 400 for empty title', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: '', author: 'Author', year: 2020 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for missing body fields', async () => {
    const res = await request(app).post('/api/books').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for year out of range', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Book', author: 'Author', year: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// PUT /api/books/:id
describe('PUT /api/books/:id', () => {
  test('updates an existing book', async () => {
    const created = await request(app)
      .post('/api/books')
      .send({ title: 'Old', author: 'Old Author', year: 2000 });
    const id = created.body.id;

    const res = await request(app)
      .put(`/api/books/${id}`)
      .send({ title: 'New', author: 'New Author', year: 2024 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.year).toBe(2024);
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/books/9999')
      .send({ title: 'X', author: 'Y', year: 2020 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('returns 400 for non-positive id param', async () => {
    const res = await request(app)
      .put('/api/books/-1')
      .send({ title: 'X', author: 'Y', year: 2020 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for invalid body', async () => {
    const created = await request(app)
      .post('/api/books')
      .send({ title: 'Book', author: 'Author', year: 2000 });
    const res = await request(app)
      .put(`/api/books/${created.body.id}`)
      .send({ title: '', author: 'Author', year: 2020 });
    expect(res.status).toBe(400);
  });
});

// DELETE /api/books/:id
describe('DELETE /api/books/:id', () => {
  test('deletes a book and returns 204', async () => {
    const created = await request(app)
      .post('/api/books')
      .send({ title: 'To Delete', author: 'Author', year: 2000 });
    const id = created.body.id;

    const res = await request(app).delete(`/api/books/${id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get('/api/books');
    expect(check.body).toHaveLength(0);
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/api/books/9999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('returns 400 for non-positive id param', async () => {
    const res = await request(app).delete('/api/books/0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// Unknown routes
describe('Unknown routes', () => {
  test('returns 404 for unknown API route', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
