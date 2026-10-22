import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Users, Headphones, BookOpen, MessageSquare,
  Shield, Bell, Key, RefreshCw, Plus, Pencil, Trash2, Search,
  Check, X, AlertTriangle, Eye, Send, ChevronDown, Settings,
  LogOut, Clock, Globe, Mic, Volume2, FileText, UserCheck,
  UserX, Filter, MoreVertical, Activity, Menu
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ============================================================
   Toast Notification System
   ============================================================ */
let toastId = 0;

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <Check size={16} />}
          {t.type === 'error' && <X size={16} />}
          {t.type === 'info' && <Bell size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Confirm Dialog
   ============================================================ */
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Helper: API Fetch
   ============================================================ */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ============================================================
   Dashboard Page
   ============================================================ */
function DashboardPage({ stats, reports, loading, apiError }) {
  const recentReports = (reports || []).slice(0, 5);

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading dashboard...
      </div>
    );
  }

  return (
    <>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><Users size={24} /></div>
          <div className="stat-info">
            <p>Active Learners</p>
            <strong>{stats.users ?? '—'}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Activity size={24} /></div>
          <div className="stat-info">
            <p>Sessions</p>
            <strong>{stats.activeUsers ?? '—'}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><UserCheck size={24} /></div>
          <div className="stat-info">
            <p>Successful Matches</p>
            <strong>{stats.messages ?? '—'}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={24} /></div>
          <div className="stat-info">
            <p>Report Queue</p>
            <strong>{stats.reports ?? '—'}</strong>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-title">
            <Clock size={18} />
            Recent Activity
          </div>
          {recentReports.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <h3>No recent activity</h3>
              <p>Activity will appear here as users interact</p>
            </div>
          ) : (
            <div className="activity-feed">
              {recentReports.map((r) => (
                <div className="activity-item" key={r.id}>
                  <div className="activity-icon report">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="activity-text">
                    <p>Report: {r.reason}</p>
                    <small>
                      User {r.reportedUserId || 'unknown'} · {r.status}
                      {r.createdAt && ` · ${new Date(r.createdAt).toLocaleDateString()}`}
                    </small>
                  </div>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Stats Placeholder */}
          <div className="card">
            <div className="card-title">
              <LayoutDashboard size={18} />
              Quick Stats
            </div>
            <div className="chart-placeholder">
              📊 Charts coming soon
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="card-title">
              <Activity size={18} />
              System Status
            </div>
            <div className={`system-status ${apiError ? 'error' : ''}`}>
              <div className="status-dot"></div>
              {apiError ? 'Backend Unreachable' : 'All Systems Operational'}
            </div>
            <div style={{ marginTop: '14px', fontSize: '13px', color: '#78869b' }}>
              <p>API: {API}</p>
              <p>Rooms: {stats.rooms ?? 0} active</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   User Management Page
   ============================================================ */
function UserManagementPage({ users, loading, onCreate, onUpdate, onDelete, toast }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', country: '', nativeLanguage: '', learningLanguage: '', level: 'beginner', email: '', phone: '', status: 'active' });
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const SortIndicator = ({ col }) => {
    if (sortCol !== col) return <span className="sort-indicator">↕</span>;
    return <span className="sort-indicator active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const filteredUsers = (users || [])
    .filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q) ||
        (u.nativeLanguage || '').toLowerCase().includes(q) ||
        (u.learningLanguage || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter || (statusFilter === 'online' && u.online) || (statusFilter === 'offline' && !u.online && u.status !== 'suspended') || (statusFilter === 'suspended' && u.status === 'suspended');
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aVal = (a[sortCol] || '').toString().toLowerCase();
      const bVal = (b[sortCol] || '').toString().toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      country: user.country || '',
      nativeLanguage: user.nativeLanguage || '',
      learningLanguage: user.learningLanguage || '',
      level: user.level || '',
    });
  };

  const saveEdit = async () => {
    try {
      await onUpdate(editingId, editForm);
      setEditingId(null);
      toast('User updated successfully', 'success');
    } catch (err) {
      toast('Failed to update user: ' + err.message, 'error');
    }
  };

  const createUser = async () => {
    if (!createForm.name.trim()) {
      toast('Please enter a name', 'error');
      return;
    }
    try {
      await onCreate(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', country: '', nativeLanguage: '', learningLanguage: '', level: 'beginner', email: '', phone: '', status: 'active' });
      toast('User created successfully', 'success');
    } catch (err) {
      toast('Failed to create user: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
      toast('User deleted', 'success');
    } catch (err) {
      toast('Failed to delete user: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading users...
      </div>
    );
  }

  const getStatusBadge = (user) => {
    if (user.status === 'suspended') return <span className="badge badge-suspended">Suspended</span>;
    if (user.online) return <span className="badge badge-online">Online</span>;
    return <span className="badge badge-offline">Offline</span>;
  };

  return (
    <>
      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search users by name, country, language..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="card-title">
          <Users size={18} />
          Registered Users ({filteredUsers.length})
        </div>

        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <h3>No users found</h3>
            <p>{search ? 'Try a different search term' : 'No users registered yet'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')}>
                    Name <SortIndicator col="name" />
                  </th>
                  <th onClick={() => handleSort('country')}>
                    Country <SortIndicator col="country" />
                  </th>
                  <th onClick={() => handleSort('nativeLanguage')}>
                    Native Language <SortIndicator col="nativeLanguage" />
                  </th>
                  <th onClick={() => handleSort('learningLanguage')}>
                    Learning <SortIndicator col="learningLanguage" />
                  </th>
                  <th onClick={() => handleSort('level')}>
                    Level <SortIndicator col="level" />
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) =>
                  editingId === u.id ? (
                    <tr key={u.id}>
                      <td>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ width: '120px', padding: '6px 8px', border: '1px solid #dde3ee', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          style={{ width: '100px', padding: '6px 8px', border: '1px solid #dde3ee', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.nativeLanguage}
                          onChange={(e) => setEditForm({ ...editForm, nativeLanguage: e.target.value })}
                          style={{ width: '100px', padding: '6px 8px', border: '1px solid #dde3ee', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.learningLanguage}
                          onChange={(e) => setEditForm({ ...editForm, learningLanguage: e.target.value })}
                          style={{ width: '100px', padding: '6px 8px', border: '1px solid #dde3ee', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.level}
                          onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                          style={{ padding: '6px 8px', border: '1px solid #dde3ee', borderRadius: '6px', fontSize: '13px' }}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </td>
                      <td>{getStatusBadge(u)}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-primary" onClick={saveEdit} title="Save">
                            <Check size={14} /> Save
                          </button>
                          <button className="btn btn-ghost" onClick={() => setEditingId(null)} title="Cancel">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.country}</td>
                      <td>{u.nativeLanguage}</td>
                      <td>{u.learningLanguage}</td>
                      <td style={{ textTransform: 'capitalize' }}>{u.level}</td>
                      <td>{getStatusBadge(u)}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn-icon edit"
                            onClick={() => startEdit(u)}
                            title="Edit user"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className={`btn-icon ${u.status === 'suspended' ? 'edit' : 'delete'}`}
                            onClick={() => toggleSuspend(u)}
                            title={u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          >
                            {u.status === 'suspended' ? <UserCheck size={15} /> : <UserX size={15} />}
                          </button>
                          <button
                            className="btn-icon delete"
                            onClick={() => setConfirmDelete(u.id)}
                            title="Delete user"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Room Management Page
   ============================================================ */
function RoomManagementPage({ rooms, loading, onCreate, onUpdate, onDelete, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', topic: '', level: 'beginner', capacity: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const resetForm = () => {
    setForm({ name: '', topic: '', level: 'beginner', capacity: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.topic.trim()) {
      toast('Please fill in name and topic', 'error');
      return;
    }
    try {
      if (editingId) {
        await onUpdate(editingId, form);
        toast('Room updated', 'success');
      } else {
        await onCreate(form);
        toast('Room created', 'success');
      }
      resetForm();
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const startEdit = (room) => {
    setEditingId(room.id);
    setForm({
      name: room.name || '',
      topic: room.topic || '',
      level: room.level || 'beginner',
      capacity: room.capacity || '',
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
      toast('Room deleted', 'success');
    } catch (err) {
      toast('Failed to delete room: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading rooms...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <Plus size={16} />
            Create Room
          </button>
        </div>
      </div>

      {showForm && (
        <div className="inline-form">
          <h4>
            {editingId ? <><Pencil size={16} /> Edit Room</> : <><Plus size={16} /> New Room</>}
          </h4>
          <div className="form-row">
            <div className="form-group">
              <label>Room Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. English Café"
              />
            </div>
            <div className="form-group">
              <label>Topic</label>
              <input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Everyday Conversations"
              />
            </div>
            <div className="form-group">
              <label>Level</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="e.g. 20"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSubmit}>
              <Check size={14} />
              {editingId ? 'Update Room' : 'Create Room'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {(rooms || []).length === 0 ? (
        <div className="empty-state">
          <Headphones size={40} />
          <h3>No rooms yet</h3>
          <p>Create your first audio room to get started</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {(rooms || []).map((r) => (
            <div className="room-card" key={r.id}>
              <div className="room-card-header">
                <div className="room-card-icon">
                  <Mic size={22} />
                </div>
                <div className="room-card-actions">
                  <button className="btn-icon edit" onClick={() => startEdit(r)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="btn-icon delete" onClick={() => setConfirmDelete(r.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h4>{r.name}</h4>
              <p className="room-topic">{r.topic}</p>
              <div className="room-card-meta">
                <span><Globe size={14} /> {r.level}</span>
                <span><Volume2 size={14} /> {r.listeners ?? 0} listening</span>
                <span><Users size={14} /> {r.joined ?? 0} joined</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Room"
          message="Are you sure you want to delete this room?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Vocabulary CMS Page
   ============================================================ */
function VocabularyCMSPage({ vocabulary, loading, onCreate, onUpdate, onDelete, toast }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ word: '', category: '', userId: '' });

  const resetForm = () => {
    setForm({ word: '', category: '', userId: '' });
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.word.trim()) {
      toast('Please enter a word', 'error');
      return;
    }
    try {
      await onCreate(form);
      resetForm();
      toast('Word added', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const toggleStatus = async (item, newStatus) => {
    try {
      await onUpdate(item.id, { status: newStatus });
      toast(`Word ${newStatus}`, 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
      toast('Word deleted', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const filtered = (vocabulary || []).filter(
    (v) => statusFilter === 'all' || v.status === statusFilter
  );

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading vocabulary...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add Word
          </button>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {['all', 'published', 'draft', 'retired'].map((s) => (
              <button
                key={s}
                className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="inline-form">
          <h4><Plus size={16} /> Add New Word</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Word</label>
              <input
                value={form.word}
                onChange={(e) => setForm({ ...form, word: e.target.value })}
                placeholder="Enter word"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Greetings"
              />
            </div>
            <div className="form-group">
              <label>User ID (optional)</label>
              <input
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="User ID"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAdd}>
              <Check size={14} /> Add Word
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <BookOpen size={18} />
          Vocabulary ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />
            <h3>No vocabulary found</h3>
            <p>{statusFilter !== 'all' ? 'Try a different filter' : 'Add your first word'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Category</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.word}</td>
                    <td>{v.category || '—'}</td>
                    <td>{v.userId || '—'}</td>
                    <td>
                      <span className={`badge badge-${v.status || 'draft'}`}>
                        {v.status || 'draft'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        {v.status !== 'published' && (
                          <button
                            className="btn btn-success"
                            onClick={() => toggleStatus(v, 'published')}
                            title="Publish"
                          >
                            <Check size={13} /> Publish
                          </button>
                        )}
                        {v.status !== 'retired' && (
                          <button
                            className="btn btn-warning"
                            onClick={() => toggleStatus(v, 'retired')}
                            title="Retire"
                          >
                            <X size={13} /> Retire
                          </button>
                        )}
                        <button
                          className="btn-icon delete"
                          onClick={() => handleDelete(v.id)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   Phrase CMS Page
   ============================================================ */
function PhraseCMSPage({ phrases, loading, onCreate, onUpdate, onDelete, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    phrase: '', translation: '', language: '', category: '', status: 'draft',
  });

  const resetForm = () => {
    setForm({ phrase: '', translation: '', language: '', category: '', status: 'draft' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.phrase.trim()) {
      toast('Please enter a phrase', 'error');
      return;
    }
    try {
      if (editingId) {
        await onUpdate(editingId, form);
        toast('Phrase updated', 'success');
      } else {
        await onCreate(form);
        toast('Phrase added', 'success');
      }
      resetForm();
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      phrase: p.phrase || '',
      translation: p.translation || '',
      language: p.language || '',
      category: p.category || '',
      status: p.status || 'draft',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
      toast('Phrase deleted', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading phrases...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={16} /> Add Phrase
        </button>
      </div>

      {showForm && (
        <div className="inline-form">
          <h4>
            {editingId ? <><Pencil size={16} /> Edit Phrase</> : <><Plus size={16} /> New Phrase</>}
          </h4>
          <div className="form-row">
            <div className="form-group">
              <label>Phrase</label>
              <input
                value={form.phrase}
                onChange={(e) => setForm({ ...form, phrase: e.target.value })}
                placeholder="Enter phrase"
              />
            </div>
            <div className="form-group">
              <label>Translation</label>
              <input
                value={form.translation}
                onChange={(e) => setForm({ ...form, translation: e.target.value })}
                placeholder="Translation"
              />
            </div>
            <div className="form-group">
              <label>Language</label>
              <input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="e.g. Spanish"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Travel"
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSubmit}>
              <Check size={14} /> {editingId ? 'Update' : 'Add'} Phrase
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <MessageSquare size={18} />
          Phrases ({(phrases || []).length})
        </div>
        {(phrases || []).length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={40} />
            <h3>No phrases yet</h3>
            <p>Add your first phrase to get started</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phrase</th>
                  <th>Translation</th>
                  <th>Language</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(phrases || []).map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.phrase}</td>
                    <td>{p.translation || '—'}</td>
                    <td>{p.language || '—'}</td>
                    <td>{p.category || '—'}</td>
                    <td>
                      <span className={`badge badge-${p.status || 'draft'}`}>
                        {p.status || 'draft'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon edit" onClick={() => startEdit(p)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(p.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   Moderation Page
   ============================================================ */
function ModerationPage({ reports, loading, onUpdate, toast }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const updateReport = async (id, status) => {
    try {
      await onUpdate(id, { status });
      toast(`Report ${status}`, 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const filtered = (reports || []).filter(
    (r) => statusFilter === 'all' || r.status === statusFilter
  );

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading reports...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {['all', 'open', 'resolved'].map((s) => (
            <button
              key={s}
              className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Shield size={40} />
          <h3>No reports found</h3>
          <p>{statusFilter !== 'all' ? 'No reports with this status' : 'No reports have been filed yet'}</p>
        </div>
      ) : (
        filtered.map((r) => (
          <div className="report-item" key={r.id}>
            <div className="report-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="report-info">
              <h4>{r.reason}</h4>
              <p>
                Reported User: {r.reportedUserId || 'Not specified'}
                {r.createdAt && ` · ${new Date(r.createdAt).toLocaleDateString()}`}
              </p>
            </div>
            <span className={`badge badge-${r.status}`}>{r.status}</span>
            {r.status === 'open' && (
              <div className="report-actions">
                <button className="btn btn-success" onClick={() => updateReport(r.id, 'resolved')}>
                  <Check size={13} /> Resolve
                </button>
                <button className="btn btn-warning" onClick={() => updateReport(r.id, 'warned')}>
                  <AlertTriangle size={13} /> Warn
                </button>
                <button className="btn btn-danger" onClick={() => updateReport(r.id, 'suspended')}>
                  <UserX size={13} /> Suspend
                </button>
                <button className="btn btn-ghost" onClick={() => updateReport(r.id, 'dismissed')}>
                  <X size={13} /> Dismiss
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}

/* ============================================================
   Notifications Page
   ============================================================ */
function NotificationsPage({ notifications, loading, onCreate, onUpdate, onDelete, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', target: 'all', status: 'draft' });

  const resetForm = () => {
    setForm({ title: '', message: '', target: 'all', status: 'draft' });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast('Please fill in title and message', 'error');
      return;
    }
    try {
      await onCreate(form);
      resetForm();
      toast('Notification created', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const handleSend = async (n) => {
    try {
      await onUpdate(n.id, { status: 'sent' });
      toast('Notification sent', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
      toast('Notification deleted', 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading notifications...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Create Notification
        </button>
      </div>

      {showForm && (
        <div className="inline-form">
          <h4><Bell size={16} /> New Notification</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Notification title"
              />
            </div>
            <div className="form-group">
              <label>Target Audience</label>
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="all">All Users</option>
                <option value="beginner">Beginners</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Notification message..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>
              <Check size={14} /> Create
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {(notifications || []).length === 0 ? (
        <div className="empty-state">
          <Bell size={40} />
          <h3>No notifications</h3>
          <p>Create your first notification campaign</p>
        </div>
      ) : (
        (notifications || []).map((n) => (
          <div className="notif-item" key={n.id}>
            <div className="notif-icon">
              <Bell size={20} />
            </div>
            <div className="notif-info">
              <h4>{n.title}</h4>
              <p>{n.message}</p>
            </div>
            <span className={`badge badge-${n.status || 'draft'}`}>
              {n.status || 'draft'}
            </span>
            <div className="notif-actions">
              {n.status !== 'sent' && (
                <button className="btn btn-primary" onClick={() => handleSend(n)} title="Send">
                  <Send size={13} /> Send
                </button>
              )}
              <button className="btn-icon delete" onClick={() => handleDelete(n.id)} title="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

/* ============================================================
   Audit & Roles Page
   ============================================================ */
function AuditRolesPage({ audit, roles, adminUsers, loading, toast }) {
  const [subTab, setSubTab] = useState('audit');

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={20} />
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="sub-tabs">
        <button
          className={`sub-tab ${subTab === 'audit' ? 'active' : ''}`}
          onClick={() => setSubTab('audit')}
        >
          <FileText size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Audit Log
        </button>
        <button
          className={`sub-tab ${subTab === 'roles' ? 'active' : ''}`}
          onClick={() => setSubTab('roles')}
        >
          <Key size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Roles & Access
        </button>
      </div>

      {subTab === 'audit' && (
        <div className="card">
          <div className="card-title">
            <FileText size={18} />
            Audit Log
          </div>
          {(audit || []).length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <h3>No audit entries</h3>
              <p>Actions will be logged here automatically</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit || []).map((a, i) => (
                    <tr key={a.id || i}>
                      <td style={{ fontWeight: 600 }}>{a.action}</td>
                      <td>{a.user || a.userId || '—'}</td>
                      <td>{a.target || '—'}</td>
                      <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.details || '—'}
                      </td>
                      <td>
                        {a.timestamp || a.createdAt
                          ? new Date(a.timestamp || a.createdAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'roles' && (
        <>
          {/* Roles List */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">
              <Key size={18} />
              Roles & Permissions
            </div>
            {(roles || []).length === 0 ? (
              <div className="empty-state">
                <Key size={40} />
                <h3>No roles defined</h3>
                <p>Roles will appear here when configured</p>
              </div>
            ) : (
              (roles || []).map((role, i) => (
                <div className="role-card" key={role.id || i}>
                  <h4>
                    <Shield size={16} style={{ color: '#FF6847' }} />
                    {role.name || role.role}
                  </h4>
                  <div className="permissions">
                    {(role.permissions || []).map((perm, j) => (
                      <span className="permission-tag" key={j}>{perm}</span>
                    ))}
                    {(!role.permissions || role.permissions.length === 0) && (
                      <span className="permission-tag">No specific permissions</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Admin Users */}
          <div className="card">
            <div className="card-title">
              <Users size={18} />
              Admin Users
            </div>
            {(adminUsers || []).length === 0 ? (
              <div className="empty-state">
                <Users size={40} />
                <h3>No admin users</h3>
                <p>Admin users will appear here</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adminUsers || []).map((a, i) => (
                      <tr key={a.id || i}>
                        <td style={{ fontWeight: 600 }}>{a.name || '—'}</td>
                        <td>{a.email || '—'}</td>
                        <td>
                          <span className="badge badge-active">
                            {a.role || 'admin'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${a.status || 'active'}`}>
                            {a.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================
   Main App Component
   ============================================================ */
function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data state
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [audit, setAudit] = useState([]);
  const [roles, setRoles] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Load all data
  const loadAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const endpoints = [
        'stats', 'users', 'rooms', 'reports',
        'vocabulary', 'phrases', 'notifications',
        'audit', 'roles', 'admin-users',
      ];

      const results = await Promise.allSettled(
        endpoints.map((ep) =>
          fetch(`${API}/api/${ep}`)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
        )
      );

      const getData = (idx) =>
        results[idx].status === 'fulfilled' ? results[idx].value : (Array.isArray(results[idx]) ? [] : {});

      setStats(getData(0) || {});
      setUsers(Array.isArray(getData(1)) ? getData(1) : []);
      setRooms(Array.isArray(getData(2)) ? getData(2) : []);
      setReports(Array.isArray(getData(3)) ? getData(3) : []);
      setVocabulary(Array.isArray(getData(4)) ? getData(4) : []);
      setPhrases(Array.isArray(getData(5)) ? getData(5) : []);
      setNotifications(Array.isArray(getData(6)) ? getData(6) : []);
      setAudit(Array.isArray(getData(7)) ? getData(7) : []);
      setRoles(Array.isArray(getData(8)) ? getData(8) : []);
      setAdminUsers(Array.isArray(getData(9)) ? getData(9) : []);
      setApiError('');

      if (showRefresh) addToast('Data refreshed', 'success');
    } catch (err) {
      setApiError('Backend unreachable. Make sure the server is running on port 4000.');
      if (showRefresh) addToast('Failed to refresh data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- CRUD helpers ---
  const updateUser = async (id, data) => {
    await apiFetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const deleteUser = async (id) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const createRoom = async (data) => {
    await apiFetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const updateRoom = async (id, data) => {
    await apiFetch(`/api/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const deleteRoom = async (id) => {
    await apiFetch(`/api/rooms/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const createVocabulary = async (data) => {
    await apiFetch('/api/vocabulary', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const updateVocabulary = async (id, data) => {
    await apiFetch(`/api/vocabulary/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const deleteVocabulary = async (id) => {
    await apiFetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const createPhrase = async (data) => {
    await apiFetch('/api/phrases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const updatePhrase = async (id, data) => {
    await apiFetch(`/api/phrases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const deletePhrase = async (id) => {
    await apiFetch(`/api/phrases/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const updateReport = async (id, data) => {
    await apiFetch(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const createNotification = async (data) => {
    await apiFetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const updateNotification = async (id, data) => {
    await apiFetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await loadAll();
  };

  const deleteNotification = async (id) => {
    await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  // Navigation menu items
  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Users', icon: Users },
    { label: 'Rooms', icon: Headphones },
    { label: 'Vocabulary', icon: BookOpen },
    { label: 'Phrases', icon: MessageSquare },
    { label: 'Moderation', icon: Shield },
    { label: 'Notifications', icon: Bell },
    { label: 'Audit & Roles', icon: Key },
  ];

  // Render active page
  const renderPage = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardPage
            stats={stats}
            reports={reports}
            loading={loading}
            apiError={apiError}
          />
        );
      case 'Users':
        return (
          <UserManagementPage
            users={users}
            loading={loading}
            onUpdate={updateUser}
            onDelete={deleteUser}
            toast={addToast}
          />
        );
      case 'Rooms':
        return (
          <RoomManagementPage
            rooms={rooms}
            loading={loading}
            onCreate={createRoom}
            onUpdate={updateRoom}
            onDelete={deleteRoom}
            toast={addToast}
          />
        );
      case 'Vocabulary':
        return (
          <VocabularyCMSPage
            vocabulary={vocabulary}
            loading={loading}
            onCreate={createVocabulary}
            onUpdate={updateVocabulary}
            onDelete={deleteVocabulary}
            toast={addToast}
          />
        );
      case 'Phrases':
        return (
          <PhraseCMSPage
            phrases={phrases}
            loading={loading}
            onCreate={createPhrase}
            onUpdate={updatePhrase}
            onDelete={deletePhrase}
            toast={addToast}
          />
        );
      case 'Moderation':
        return (
          <ModerationPage
            reports={reports}
            loading={loading}
            onUpdate={updateReport}
            toast={addToast}
          />
        );
      case 'Notifications':
        return (
          <NotificationsPage
            notifications={notifications}
            loading={loading}
            onCreate={createNotification}
            onUpdate={updateNotification}
            onDelete={deleteNotification}
            toast={addToast}
          />
        );
      case 'Audit & Roles':
        return (
          <AuditRolesPage
            audit={audit}
            roles={roles}
            adminUsers={adminUsers}
            loading={loading}
            toast={addToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />

      {/* Mobile Sidebar Toggle */}
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={22} />
      </button>

      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Mic size={20} />
          </div>
          <h1>BY<span>TALK</span></h1>
        </div>
        <div className="sidebar-subtitle">Admin Console</div>

        <nav className="sidebar-nav">
          {menuItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeTab === label ? 'active' : ''}
              onClick={() => {
                setActiveTab(label);
                setSidebarOpen(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>BYTALK · Admin Panel</p>
          <p>v1.0 · Language Exchange</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <div className="breadcrumb">
              Admin Console / <span>{activeTab}</span>
            </div>
            <h2>{activeTab}</h2>
          </div>
          <div className="header-right">
            <button
              className={`btn-refresh ${refreshing ? 'spinning' : ''}`}
              onClick={() => loadAll(true)}
              disabled={refreshing}
            >
              <RefreshCw size={15} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className="admin-avatar">A</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {apiError && (
            <div className="error-banner">
              <AlertTriangle size={18} />
              {apiError}
            </div>
          )}
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Mount App
   ============================================================ */
createRoot(document.getElementById('root')).render(<App />);
