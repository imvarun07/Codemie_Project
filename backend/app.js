const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { z } = require('zod');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function createApp(dbPath) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      year INTEGER NOT NULL
    )
  `);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/books', (req, res) => {
    const books = db.prepare('SELECT * FROM books ORDER BY id ASC').all();
    res.json(books);
  });

  app.post('/api/books', (req, res, next) => {
    try {
      const { title, author, year } = bookBodySchema.parse(req.body);
      const info = db.prepare('INSERT INTO books (title, author, year) VALUES (?, ?, ?)').run(title, author, year);
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(book);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/books/:id', (req, res, next) => {
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const { title, author, year } = bookBodySchema.parse(req.body);
      const info = db.prepare('UPDATE books SET title = ?, author = ?, year = ? WHERE id = ?').run(title, author, year, id);
      if (info.changes === 0) return next(notFound('Book not found'));
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
      res.json(book);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/books/:id', (req, res, next) => {
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const info = db.prepare('DELETE FROM books WHERE id = ?').run(id);
      if (info.changes === 0) return next(notFound('Book not found'));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // 404 catch-all for unknown routes
  app.use((req, res, next) => {
    next(notFound(`Route ${req.method} ${req.path} not found`));
  });

  // Central error middleware
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: err.flatten(),
        },
      });
    }
    if (err.status === 404) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: err.message,
          details: null,
        },
      });
    }
    console.error(err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: null,
      },
    });
  });

  return app;
}

module.exports = createApp;
