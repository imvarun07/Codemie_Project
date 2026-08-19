const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

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

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/books', (req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY id ASC').all();
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;
  if (!title || !author || !year) {
    return res.status(400).json({ error: 'title, author, and year are required' });
  }
  const stmt = db.prepare('INSERT INTO books (title, author, year) VALUES (?, ?, ?)');
  const info = stmt.run(title, author, Number(year));
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, author, year } = req.body;
  if (!title || !author || !year) {
    return res.status(400).json({ error: 'title, author, and year are required' });
  }
  const info = db.prepare('UPDATE books SET title = ?, author = ?, year = ? WHERE id = ?')
    .run(title, author, Number(year), id);
  if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Book Catalog running at http://localhost:${PORT}`));
