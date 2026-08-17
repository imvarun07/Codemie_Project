const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'books.json');

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { nextId: 1, books: [] }; }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/books', (req, res) => {
  const { books } = readDB();
  res.json([...books].reverse());
});

app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;
  if (!title || !author || !year) {
    return res.status(400).json({ error: 'title, author, and year are required' });
  }
  const db = readDB();
  const book = { id: db.nextId++, title, author, year: Number(year) };
  db.books.push(book);
  writeDB(db);
  res.status(201).json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const index = db.books.findIndex(b => b.id === id);
  if (index === -1) return res.status(404).json({ error: 'Book not found' });
  db.books.splice(index, 1);
  writeDB(db);
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Book Catalog running at http://localhost:${PORT}`));
