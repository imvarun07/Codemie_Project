const form = document.getElementById('add-form');
const tbody = document.getElementById('books-body');
const errorEl = document.getElementById('error');
const emptyEl = document.getElementById('empty');
const tableEl = document.getElementById('books-table');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 3000);
}

function renderBooks(books) {
  tbody.innerHTML = '';
  if (books.length === 0) {
    tableEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }
  tableEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  books.forEach(book => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(book.title)}</td>
      <td>${escHtml(book.author)}</td>
      <td>${book.year}</td>
      <td><button class="delete-btn" data-id="${book.id}" title="Delete">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function loadBooks() {
  const res = await fetch('/api/books');
  const books = await res.json();
  renderBooks(books);
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const year = parseInt(document.getElementById('year').value, 10);

  const res = await fetch('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, year }),
  });

  if (!res.ok) {
    const err = await res.json();
    showError(err.error || 'Failed to add book');
    return;
  }

  form.reset();
  loadBooks();
});

tbody.addEventListener('click', async e => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) { showError('Failed to delete book'); return; }
  loadBooks();
});

loadBooks();
