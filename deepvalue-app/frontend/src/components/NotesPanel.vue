<template>
  <div class="notes-panel">
    <h2>Research Notes</h2>
    <div class="notes-controls">
      <input v-model="searchQuery" placeholder="Search notes..." class="search-input" />
      <button @click="createNewNote" class="add-btn">+ New Note</button>
    </div>

    <div class="notes-list">
      <div v-for="note in filteredNotes" :key="note.id" class="note-item">
        <div class="note-header" @click="toggleNoteExpand(note.id)">
          <h3 class="note-title">{{ note.title }}</h3>
          <div class="note-meta">
            <span class="note-date">{{ formatDate(note.createdAt) }}</span>
            <span class="expand-icon">{{ expandedNotes.includes(note.id) ? '▼' : '►' }}</span>
          </div>
        </div>
        <div v-if="expandedNotes.includes(note.id)" class="note-content">
          <div class="markdown-content" v-html="renderMarkdown(note.content)"></div>
          <div class="note-actions">
            <button @click="editNote(note)" class="edit-btn">Edit</button>
            <button @click="deleteNote(note.id)" class="delete-btn">Delete</button>
          </div>
          <div class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="note-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Editor Modal -->
    <div v-if="showNoteEditor" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingNote ? 'Edit Note' : 'New Note' }}</h3>
        <input v-model="noteTitle" placeholder="Note title" class="note-title-input" />
        <textarea v-model="noteContent" placeholder="Write your note here..." rows="10"></textarea>
        <div class="tag-input">
          <input v-model="tagInput" @keydown.enter.prevent="addTag" placeholder="Add tags (press Enter)" />
          <div class="selected-tags">
            <span v-for="tag in noteTags" :key="tag" class="selected-tag">
              {{ tag }}
              <button @click="removeTag(tag)" class="remove-tag">×</button>
            </span>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeNoteEditor" class="cancel-btn">Cancel</button>
          <button @click="saveNote" class="save-btn">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { marked } from 'marked'

export default {
  name: 'NotesPanel',
  setup() {
    const store = useStore()
    const searchQuery = ref('')
    const expandedNotes = ref([])
    const showNoteEditor = ref(false)
    const editingNote = ref(null)
    const noteTitle = ref('')
    const noteContent = ref('')
    const noteTags = ref([])
    const tagInput = ref('')

    const notes = computed(() => store.getters.getNotes)

    const filteredNotes = computed(() => {
      if (!searchQuery.value) return notes.value
      
      const query = searchQuery.value.toLowerCase()
      return notes.value.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      )
    })

    const toggleNoteExpand = (noteId) => {
      if (expandedNotes.value.includes(noteId)) {
        expandedNotes.value = expandedNotes.value.filter(id => id !== noteId)
      } else {
        expandedNotes.value.push(noteId)
      }
    }

    const createNewNote = () => {
      editingNote.value = null
      noteTitle.value = ''
      noteContent.value = ''
      noteTags.value = []
      showNoteEditor.value = true
    }

    const editNote = (note) => {
      editingNote.value = note
      noteTitle.value = note.title
      noteContent.value = note.content
      noteTags.value = [...note.tags]
      showNoteEditor.value = true
    }

    const closeNoteEditor = () => {
      showNoteEditor.value = false
    }

    const saveNote = () => {
      if (!noteTitle.value.trim()) {
        alert('Please enter a title for your note')
        return
      }

      if (editingNote.value) {
        // Update existing note
        store.commit('UPDATE_NOTE', { 
          id: editingNote.value.id, 
          content: noteContent.value 
        })
      } else {
        // Create new note
        store.commit('ADD_NOTE', {
          id: Date.now(),
          title: noteTitle.value,
          content: noteContent.value,
          tags: noteTags.value,
          createdAt: new Date().toISOString()
        })
      }

      closeNoteEditor()
    }

    const deleteNote = (noteId) => {
      if (confirm('Are you sure you want to delete this note?')) {
        store.commit('DELETE_NOTE', noteId)
      }
    }

    const addTag = () => {
      const tag = tagInput.value.trim()
      if (tag && !noteTags.value.includes(tag)) {
        noteTags.value.push(tag)
      }
      tagInput.value = ''
    }

    const removeTag = (tag) => {
      noteTags.value = noteTags.value.filter(t => t !== tag)
    }

    const renderMarkdown = (content) => {
      return marked(content)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    return {
      searchQuery,
      expandedNotes,
      filteredNotes,
      showNoteEditor,
      editingNote,
      noteTitle,
      noteContent,
      noteTags,
      tagInput,
      toggleNoteExpand,
      createNewNote,
      editNote,
      closeNoteEditor,
      saveNote,
      deleteNote,
      addTag,
      removeTag,
      renderMarkdown,
      formatDate
    }
  }
}
</script>

<style scoped>
.notes-panel {
  padding: 1rem;
}

.notes-controls {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-btn {
  width: 100%;
  padding: 0.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.note-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.note-header {
  padding: 0.75rem;
  background-color: #f8f9fa;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-title {
  margin: 0;
  font-size: 1rem;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note-date {
  font-size: 0.8rem;
  color: #6c757d;
}

.note-content {
  padding: 1rem;
  border-top: 1px solid #e9ecef;
}

.note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.edit-btn, .delete-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.edit-btn {
  background-color: #17a2b8;
  color: white;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.note-tag {
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.note-title-input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  margin-bottom: 1rem;
}

.tag-input {
  margin-bottom: 1rem;
}

.tag-input input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selected-tag {
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
  display: flex;
  align-items: center;
}

.remove-tag {
  background: none;
  border: none;
  color: #6c757d;
  margin-left: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
}

.save-btn {
  background-color: #42b983;
  color: white;
}

.markdown-content :deep(p) {
  margin: 0.5rem 0;
}

.markdown-content :deep(code) {
  background-color: #f1f1f1;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.markdown-content :deep(pre) {
  background-color: #f1f1f1;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
