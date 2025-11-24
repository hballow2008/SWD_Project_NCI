const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./notes.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database
function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      INSERT OR IGNORE INTO notes (id, title, content, created_by)
      VALUES 
        (1, 'Welcome Note', 'This is a sample note created by user', 'user'),
        (2, 'Shopping List', 'Milk, Eggs, Bread, Coffee', 'user'),
        (3, 'Meeting Notes', 'Discuss project timeline and deliverables', 'user')
    `);

    console.log('Database initialized successfully');
  });
}

// ============ NOTES ROUTES ============

// Get all notes 
app.get('/api/notes', (req, res) => {
  db.all('SELECT * FROM notes ORDER BY created_at DESC', (err, notes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});


app.get('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  });
});

app.post('/api/notes', (req, res) => {
  const { title, content, role } = req.body;

  const query = `INSERT INTO notes (title, content, created_by) VALUES ('${title}', '${content}', '${role || 'user'}')`;
  
  db.run(query, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      message: 'Note created',
      noteId: this.lastID
    });
  });
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
 
  const query = `UPDATE notes SET title = '${title}', content = '${content}', updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
  
  db.run(query, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Note updated', changes: this.changes });
  });
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(`DELETE FROM notes WHERE id = ${id}`, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Note deleted', deletedCount: this.changes });
  });
});

app.get('/api/notes/search/:query', (req, res) => {
  const { query } = req.params;
  
  const sql = `SELECT * FROM notes WHERE title LIKE '%${query}%' OR content LIKE '%${query}%'`;
  
  db.all(sql, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});

// Start server
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notes API Server',
    status: 'running',
    endpoints: {
      notes: '/api/notes',
      search: '/api/notes/search/:query',
      note: '/api/notes/:id'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  });
