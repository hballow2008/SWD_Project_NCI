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

// ============ PERMISSION HELPERS ============

// Check if user can access note
function canAccessNote(role, createdBy) {
  if (role === 'admin') return true;
  return role === createdBy;
}

// Check if user can modify note
function canModifyNote(role, createdBy) {
  if (role === 'admin') return true;
  return role === createdBy;
}

// Get notes based on role
app.get('/api/notes', (req, res) => {
  const { role } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  let query = 'SELECT * FROM notes';
  
  // Regular users see only their own notes
  if (role === 'user') {
    query += ` WHERE created_by = '${role}'`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});

// Get single note
app.get('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { role } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (!canAccessNote(role, note.created_by)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(note);
  });
});

// Create note
app.post('/api/notes', (req, res) => {
  const { title, content, role } = req.body;

  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const query = `INSERT INTO notes (title, content, created_by) VALUES ('${title}', '${content}', '${role}')`;
  
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

// Update note
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, role } = req.body;
 
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  // First get the note to check ownership
  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (!canModifyNote(role, note.created_by)) {
      return res.status(403).json({ error: 'Access denied - you can only edit your own notes' });
    }
    
    const query = `UPDATE notes SET title = '${title}', content = '${content}', updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    
    db.run(query, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Note updated', changes: this.changes });
    });
  });
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { role } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  // First get the note to check ownership
  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (!canModifyNote(role, note.created_by)) {
      return res.status(403).json({ error: 'Access denied - you can only delete your own notes' });
    }
    
    db.run(`DELETE FROM notes WHERE id = ${id}`, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Note deleted', deletedCount: this.changes });
    });
  });
});

// Search notes
app.get('/api/notes/search/:query', (req, res) => {
  const { query } = req.params;
  const { role } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }
  
  let sql = `SELECT * FROM notes WHERE (title LIKE '%${query}%' OR content LIKE '%${query}%')`;
  
  // Regular users see only their own notes
  if (role === 'user') {
    sql += ` AND created_by = '${role}'`;
  }
  
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
