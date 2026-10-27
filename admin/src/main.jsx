import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Users,
  Headphones,
  ShieldAlert,
  BookOpen,
  History,
  RefreshCw,
  Plus,
  Trash2,
  UserX,
  UserCheck
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [phraseSearch, setPhraseSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // New Phrase Form State
  const [newPhrase, setNewPhrase] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newCategory, setNewCategory] = useState('everyday conversation');
  const [newExample, setNewExample] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [sRes, uRes, rRes, repRes, audRes, phrRes] = await Promise.all([
        fetch(`${API}/api/stats`).then((r) => r.json()),
        fetch(`${API}/api/users`).then((r) => r.json()),
        fetch(`${API}/api/rooms`).then((r) => r.json()),
        fetch(`${API}/api/reports`).then((r) => r.json()),
        fetch(`${API}/api/admin/audit`).then((r) => r.json()).catch(() => ({ auditLogs: [] })),
        fetch(`${API}/api/phrases`).then((r) => r.json()).catch(() => ({ phrases: [] }))
      ]);

      setStats(sRes);
      setUsers(uRes);
      setRooms(rRes);
      setReports(repRes);
      setAuditLogs(audRes.auditLogs || []);
      setPhrases(phrRes.phrases || []);
      setError('');
    } catch {
      setError('Backend unreachable. Ensure backend is running on port 4000.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolveReport(id) {
    try {
      await fetch(`${API}/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      load();
    } catch {
      alert('Failed to resolve report.');
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await fetch(`${API}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      load();
    } catch {
      alert('Failed to update user status.');
    }
  }

  async function handleAddPhrase(e) {
    e.preventDefault();
    if (!newPhrase.trim() || !newMeaning.trim()) return;

    try {
      const res = await fetch(`${API}/api/admin/phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: newPhrase,
          meaning: newMeaning,
          category: newCategory,
          example: newExample
        })
      });
      if (res.ok) {
        setNewPhrase('');
        setNewMeaning('');
        setNewExample('');
        setShowAddForm(false);
        load();
      }
    } catch {
      alert('Error adding phrase.');
    }
  }

  async function handleDeletePhrase(phraseId) {
    if (!confirm('Are you sure you want to retire this phrase?')) return;
    try {
      await fetch(`${API}/api/admin/phrases/${phraseId}`, {
        method: 'DELETE'
      });
      load();
    } catch {
      alert('Error removing phrase.');
    }
  }

  const menu = [
    ['Overview', LayoutDashboard],
    ['Users', Users],
    ['Rooms', Headphones],
    ['Reports', ShieldAlert],
    ['Phrase CMS', BookOpen],
    ['Audit Logs', History]
  ];

  const filteredPhrases = phrases.filter(
    (p) =>
      p.phrase.toLowerCase().includes(phraseSearch.toLowerCase()) ||
      p.meaning.toLowerCase().includes(phraseSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(phraseSearch.toLowerCase())
  );

  return (
    <div className="shell">
      <aside>
        <h1>
          BY<span>TALK</span>
        </h1>
        <p>ADMIN CONSOLE</p>
        <nav>
          {menu.map(([label, Icon]) => (
            <button
              className={tab === label ? 'active' : ''}
              onClick={() => setTab(label)}
              key={label}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="foot">BYTALK · v1.0 Production Scope</div>
      </aside>

      <main>
        <header>
          <div>
            <small>Aparaitech Software · Management Portal</small>
            <h2>{tab}</h2>
          </div>
          <button className="reload" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </header>

        {error && <div className="error">{error}</div>}

        {/* 1. OVERVIEW */}
        {tab === 'Overview' && (
          <>
            <section className="metrics">
              {[
                ['Users', stats.users, Users],
                ['Online Learners', stats.activeUsers, LayoutDashboard],
                ['Audio Rooms', stats.rooms, Headphones],
                ['Messages Exchanged', stats.messages, Users],
                ['Open Reports', stats.reports, ShieldAlert]
              ].map(([name, value, Icon]) => (
                <div className="metric" key={name}>
                  <Icon size={23} />
                  <p>{name}</p>
                  <strong>{value ?? '—'}</strong>
                </div>
              ))}
            </section>
            <div className="panel">
              <h3>System Status & Scope</h3>
              <p>
                Manage BYTALK English learners, live audio practice rooms, moderation reports, content CMS, and audit trails conforming to the Aparaitech Software specification.
              </p>
              <p className="muted">
                Anonymity & Consent Rules: All private 1-to-1 audio sessions and rooms maintain anonymity. Real contact info is never exposed.
              </p>
            </div>
          </>
        )}

        {/* 2. USERS */}
        {tab === 'Users' && (
          <div className="panel">
            <h3>Registered Learners & Account Controls</h3>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Alias / Name</th>
                    <th>Email</th>
                    <th>Country</th>
                    <th>Native Lang</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.alias || u.name}</strong>
                      </td>
                      <td>{u.email || '—'}</td>
                      <td>{u.country}</td>
                      <td>{u.nativeLanguage}</td>
                      <td>{u.level}</td>
                      <td>
                        <span
                          className="status"
                          style={{
                            background: u.status === 'suspended' ? '#FFE8E6' : u.online ? '#E8F9F0' : '#F1F3F7',
                            color: u.status === 'suspended' ? '#D92D20' : u.online ? '#128C50' : '#6B7280'
                          }}
                        >
                          {u.status === 'suspended' ? 'Suspended' : u.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action"
                          style={{
                            backgroundColor: u.status === 'suspended' ? '#128C50' : '#D92D20',
                            padding: '6px 10px',
                            fontSize: '12px'
                          }}
                          onClick={() => toggleUserStatus(u.id, u.status)}
                        >
                          {u.status === 'suspended' ? (
                            <>
                              <UserCheck size={14} /> Reactivate
                            </>
                          ) : (
                            <>
                              <UserX size={14} /> Suspend
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ROOMS */}
        {tab === 'Rooms' && (
          <div className="panel">
            <h3>Live Audio Room Directory</h3>
            <div className="roomlist">
              {rooms.map((r) => (
                <div className="room" key={r.id}>
                  <div className="emoji">🎙️</div>
                  <div>
                    <b>{r.name}</b>
                    <p>
                      {r.topic} · {r.level} · Capacity: {r.capacity || 50}
                    </p>
                  </div>
                  <span>{r.listeners + (r.joined || 0)} listening</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. REPORTS & SAFETY */}
        {tab === 'Reports' && (
          <div className="panel">
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ margin: 0 }}>Moderation & Safety Reports Queue</h3>
              <p style={{ margin: '6px 0 0', color: '#697891', fontSize: '13px' }}>
                🛡️ <strong>Innocent User Safeguard:</strong> Reported accounts are never penalized automatically. Review interaction context, dismiss emotional/false reports, or take targeted action.
              </p>
            </div>

            {reports.length === 0 ? (
              <p>No safety reports currently flagged.</p>
            ) : (
              reports.map((x) => {
                const targetUser = users.find((u) => u.id === x.reportedUserId);
                const isUnverified = x.verificationStatus === 'unverified_interaction';
                return (
                  <div className="room" key={x.id} style={{ alignItems: 'flex-start', padding: '16px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          className="status"
                          style={{
                            background: x.status === 'open' ? '#FFF4EE' : '#E8F9F0',
                            color: x.status === 'open' ? '#FF5226' : '#128C50',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}
                        >
                          {x.status === 'open' ? 'PENDING MODERATION' : 'RESOLVED / DISMISSED'}
                        </span>
                        <span
                          className="status"
                          style={{
                            background: isUnverified ? '#FEF9E7' : '#EDF5FF',
                            color: isUnverified ? '#B45309' : '#1E40AF',
                            fontSize: '11px'
                          }}
                        >
                          {isUnverified ? '⚠️ Unverified Interaction (Potential False Report)' : 'Shared Call Context Verified'}
                        </span>
                      </div>

                      <b style={{ fontSize: '15px' }}>Report Reason: "{x.reason}"</b>

                      <p style={{ margin: '6px 0' }}>
                        Reported Person: <strong>{targetUser ? `${targetUser.name} (${targetUser.alias || targetUser.id})` : x.reportedUserId || 'Session'}</strong>
                        {' · '}
                        Account State: <span style={{ color: '#128C50', fontWeight: 'bold' }}>Active & Unpenalized</span>
                      </p>

                      <small style={{ color: '#8894A8' }}>
                        Report ID: {x.id.slice(0, 8)}... · Reported At: {new Date(x.at).toLocaleString()}
                      </small>
                    </div>

                    {x.status === 'open' && (
                      <button
                        className="action"
                        style={{ backgroundColor: '#128C50', alignSelf: 'center' }}
                        onClick={() => resolveReport(x.id)}
                      >
                        Dismiss False Report
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 5. PHRASE CMS */}
        {tab === 'Phrase CMS' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Everyday English Phrases CMS</h3>
                <p style={{ margin: '4px 0 0', color: '#697891', fontSize: '13px' }}>
                  Manage curated expressions for speaking and vocabulary practice.
                </p>
              </div>
              <button className="action" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? 'Cancel' : 'Add New Phrase'}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddPhrase}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}
              >
                <h4 style={{ margin: '0 0 12px' }}>Add Curated Expression</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>English Phrase</label>
                    <input
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      placeholder="e.g., Let's touch base next week."
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Plain-language Meaning</label>
                    <input
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      placeholder="e.g., Schedule a brief check-in."
                      value={newMeaning}
                      onChange={(e) => setNewMeaning(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Category</label>
                    <select
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="greetings">Greetings</option>
                      <option value="introductions">Introductions</option>
                      <option value="shopping">Shopping</option>
                      <option value="travel">Travel</option>
                      <option value="work">Work</option>
                      <option value="interviews">Interviews</option>
                      <option value="education">Education</option>
                      <option value="everyday conversation">Everyday Conversation</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Example Sentence</label>
                    <input
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      placeholder="e.g., We made good progress; let's touch base next week."
                      value={newExample}
                      onChange={(e) => setNewExample(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="action">
                  Save to Phrase Bank
                </button>
              </form>
            )}

            <input
              type="text"
              placeholder="Search phrases by text, meaning, or category..."
              value={phraseSearch}
              onChange={(e) => setPhraseSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                marginBottom: '16px'
              }}
            />

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Phrase</th>
                    <th>Category</th>
                    <th>Meaning</th>
                    <th>Example Usage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhrases.slice(0, 30).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.phrase}</strong>
                      </td>
                      <td>
                        <span className="status" style={{ background: '#FFF4EE', color: '#FF5226' }}>
                          {p.category}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>{p.meaning}</td>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal', color: '#6B7280', fontStyle: 'italic' }}>
                        {p.example}
                      </td>
                      <td>
                        <button
                          className="action"
                          style={{ backgroundColor: '#EF4444', padding: '6px 10px' }}
                          onClick={() => handleDeletePhrase(p.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. AUDIT LOGS */}
        {tab === 'Audit Logs' && (
          <div className="panel">
            <h3>Administrative & Safety Audit Trail (Section 17 & 19)</h3>
            <p className="muted" style={{ marginBottom: '16px' }}>
              Immutable record of security events, reports, user suspensions, and data operations.
            </p>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Event Type</th>
                    <th>Target / Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4">No audit events recorded yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <strong>{log.actor}</strong>
                        </td>
                        <td>
                          <span
                            className="status"
                            style={{
                              background: log.eventType.includes('BLOCKED') || log.eventType.includes('REPORT')
                                ? '#FFE8E6'
                                : '#EDF5FF',
                              color: log.eventType.includes('BLOCKED') || log.eventType.includes('REPORT')
                                ? '#D92D20'
                                : '#1E40AF'
                            }}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td>{log.target || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
