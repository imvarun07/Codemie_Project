const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { z } = require('zod');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'books.sqlite');
const db = new Database(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER NOT NULL
  )
`);

const bookBodySchema = z.object({
  title: z.string().trim().min(1, { message: 'title must not be empty' }),
  author: z.string().trim().min(1, { message: 'author must not be empty' }),
  year: z.coerce
    .number({ invalid_type_error: 'year must be a number' })
    .int('year must be an integer')
    .min(1, 'year must be >= 1')
    .max(2100, 'year must be <= 2100'),
});

const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id must be a number' })
    .int('id must be an integer')
    .positive('id must be a positive integer'),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/books', (req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY id ASC').all();
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const result = bookBodySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const { title, author, year } = result.data;
  const info = db.prepare('INSERT INTO books (title, author, year) VALUES (?, ?, ?)').run(title, author, year);
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const idResult = idParamSchema.safeParse({ id: req.params.id });
  if (!idResult.success) {
    return res.status(400).json({ error: idResult.error.flatten() });
  }
  const id = idResult.data.id;

  const bodyResult = bookBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: bodyResult.error.flatten() });
  }
  const { title, author, year } = bodyResult.data;

  const info = db.prepare('UPDATE books SET title = ?, author = ?, year = ? WHERE id = ?').run(title, author, year, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const idResult = idParamSchema.safeParse({ id: req.params.id });
  if (!idResult.success) {
    return res.status(400).json({ error: idResult.error.flatten() });
  }
  const id = idResult.data.id;
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Book Catalog running at http://localhost:${PORT}`));
