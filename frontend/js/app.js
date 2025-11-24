let currentRole = 'user'; // 'user' or 'guest'
let allNotes = [];
let editingNoteId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    updateRoleUI();
});

// Switch between User and Guest roles
function switchRole(role) {
    currentRole = role;
    updateRoleUI();
    cancelEdit();
}

// Update UI based on current role
function updateRoleUI() {
    const userBtn = document.getElementById('userBtn');
    const guestBtn = document.getElementById('guestBtn');
    const roleMessage = document.getElementById('roleMessage');
    const createSection = document.getElementById('createSection');
    const roleInfo = document.querySelector('.role-info');

    // Update active button
    if (currentRole === 'user') {
        userBtn.classList.add('active');
        guestBtn.classList.remove('active');
        roleMessage.innerHTML = '<strong>User Mode:</strong> You can create, edit, and delete notes.';
        roleInfo.className = 'role-info user';
        createSection.style.display = 'block';
    } else {
        userBtn.classList.remove('active');
        guestBtn.classList.add('active');
        roleMessage.innerHTML = '<strong>Guest Mode:</strong> You can only view notes (read-only).';
        roleInfo.className = 'role-info guest';
        createSection.style.display = 'none';
    }

    // Re-render notes to update action buttons
    renderNotes(allNotes);
}
// Load all notes
async function loadNotes() {
    try {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '<p class="loading">Loading notes...</p>';
        
        allNotes = await api.getNotes();
        renderNotes(allNotes);
    } catch (error) {
        document.getElementById('notesList').innerHTML = 
            '<p class="no-notes">Error loading notes. Make sure the backend is running!</p>';
    }
}

// Render notes to the page
function renderNotes(notes) {
    const notesList = document.getElementById('notesList');

    if (notes.length === 0) {
        notesList.innerHTML = '<p class="no-notes">No notes found. Create your first note!</p>';
        return;
    }

    notesList.innerHTML = notes.map(note => `
        <div class="note-card">
            <div class="note-card-header">
                <h3>${note.title}</h3>
                ${currentRole === 'user' ? `
                    <div class="note-actions">
                        <button class="btn-edit" onclick="editNote(${note.id})">Edit</button>
                        <button class="btn-delete" onclick="deleteNote(${note.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="note-card-content">
                ${note.content}
            </div>
            <div class="note-card-footer">
                <span class="note-badge badge-${note.created_by}">${note.created_by}</span>
                <span>Created: ${new Date(note.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

// Toggle note form visibility
function toggleForm() {
    const noteForm = document.getElementById('noteForm');
    noteForm.classList.toggle('hidden');
   
    if (!noteForm.classList.contains('hidden')) {
        document.getElementById('noteTitle').focus();
    }
}

// Save note (create or update)
async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const editNoteId = document.getElementById('editNoteId').value;

    if (!title || !content) {
        alert('Please fill in both title and content!');
        return;
    }

    try {
        if (editNoteId) {
            // Update existing note
            await api.updateNote(editNoteId, title, content);
            alert('Note updated successfully!');
        } else {
            // Create new note - VULNERABLE: No sanitization, XSS possible
            await api.createNote(title, content, currentRole);
            alert('Note created successfully!');
        }

        // Reset form and reload
        cancelEdit();
        loadNotes();
    } catch (error) {
        alert('Error saving note: ' + error.message);
    }
}

// Edit note
async function editNote(noteId) {
    try {
        const note = await api.getNote(noteId);
        
        // Populate form
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('editNoteId').value = note.id;
        document.getElementById('formTitle').textContent = 'Edit Note';
        
        // Show form
        document.getElementById('noteForm').classList.remove('hidden');
        document.getElementById('noteTitle').focus();
    } catch (error) {
        alert('Error loading note: ' + error.message);
    }
}

// Delete note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        await api.deleteNote(noteId);
        alert('Note deleted successfully!');
        loadNotes();
    } catch (error) {
        alert('Error deleting note: ' + error.message);
    }
}

// Cancel edit
function cancelEdit() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('editNoteId').value = '';
    document.getElementById('formTitle').textContent = 'Create New Note';
    document.getElementById('noteForm').classList.add('hidden');
}

// Search notes
async function searchNotes() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (!query) {
        alert('Please enter a search query!');
        return;
    }

    try {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '<p class="loading">Searching...</p>';
        
        // VULNERABLE: Direct search without sanitization
        const results = await api.searchNotes(query);
        allNotes = results;
        renderNotes(results);
    } catch (error) {
        alert(' Search error: ' + error.message);
        loadNotes();
    }
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadNotes();
}