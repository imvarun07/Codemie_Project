const path = require('path');
const createApp = require('./app');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'books.sqlite');
const PORT = process.env.PORT || 3000;

const app = createApp(DB_FILE);
app.listen(PORT, () => console.log(`Book Catalog running at http://localhost:${PORT}`));
