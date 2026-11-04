import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Headphones,
  ShieldAlert,
  History,
  RefreshCw,
  UserX,
  UserCheck,
  Crown,
  Search,
  PlusCircle,
  IndianRupee,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Check,
  ArrowRight,
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Search & Filter state for Users tab
  const [userQuery, setUserQuery] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Manual Grant PRO Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('3months');
  const [grantDuration, setGrantDuration] = useState('90');
  const [grantAmount, setGrantAmount] = useState('524.3');
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  // Plan Add / Edit Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    duration: '',
    durationDays: 30,
    price: 399,
    originalPrice: 500,
    savings: '',
    badge: '',
    badgeColor: '#EA580C',
    badgeBg: '#FFEDD5',
    unitText: '',
    featuresText: '',
    active: true,
    order: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const [sRes, uRes, subRes, pRes, rRes, repRes, audRes] = await Promise.all([
        fetch(`${API}/api/stats`).then((r) => r.json()),
        fetch(`${API}/api/admin/users`).then((r) => r.json()).catch(() => fetch(`${API}/api/users`).then((r) => r.json())),
        fetch(`${API}/api/admin/subscriptions`).then((r) => r.json()).catch(() => ({ subscriptions: [] })),
        fetch(`${API}/api/admin/plans`).then((r) => r.json()).catch(() => ({ plans: [] })),
        fetch(`${API}/api/rooms`).then((r) => r.json()),
        fetch(`${API}/api/reports`).then((r) => r.json()),
        fetch(`${API}/api/admin/audit`).then((r) => r.json()).catch(() => ({ auditLogs: [] })),
      ]);

      setStats(sRes || {});
      setUsers(Array.isArray(uRes) ? uRes : []);
      setSubscriptions(subRes.subscriptions || []);
      setPlans(pRes.plans || []);
      setRooms(Array.isArray(rRes) ? rRes : []);
      setReports(Array.isArray(repRes) ? repRes : []);
      setAuditLogs(audRes.auditLogs || []);
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

  async function resolveReport(id, status = 'resolved', notes = '') {
    try {
      await fetch(`${API}/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, moderatorNotes: notes }),
      });
      load();
    } catch {
      alert('Failed to update report status.');
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await fetch(`${API}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      load();
    } catch {
      alert('Failed to update user status.');
    }
  }

  async function grantProAccess(userId, durationDays = 90, amount = 0, planId = '3months') {
    try {
      const res = await fetch(`${API}/api/admin/subscriptions/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, durationDays, amount, planId }),
      });
      if (res.ok) {
        alert('🎉 PRO subscription granted successfully!');
        setShowGrantModal(false);
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to grant PRO.');
      }
    } catch {
      alert('Network error while granting PRO.');
    }
  }

  async function revokeProAccess(userId) {
    if (!confirm('Are you sure you want to revoke PRO subscription for this user?')) return;
    try {
      const res = await fetch(`${API}/api/admin/subscriptions/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        alert('PRO subscription revoked.');
        load();
      } else {
        alert('Failed to revoke PRO subscription.');
      }
    } catch {
      alert('Network error while revoking PRO.');
    }
  }

  // --- PLAN MANAGEMENT HANDLERS ---
  function openAddPlanModal() {
    setEditingPlan(null);
    setPlanForm({
      id: '',
      name: '',
      duration: '',
      durationDays: 30,
      price: '',
      originalPrice: '',
      savings: '',
      badge: '',
      badgeColor: '#EA580C',
      badgeBg: '#FFEDD5',
      unitText: '',
      featuresText: [
        'Unlimited ARYA AI practice conversations',
        'HD 1-on-1 Video Calling with native speakers',
        'All interview & daily conversation topics',
        'Priority matching with global speakers',
        'One-time payment, no autopay',
      ].join('\n'),
      active: true,
      order: plans.length + 1,
    });
    setShowPlanModal(true);
  }

  function openEditPlanModal(p) {
    setEditingPlan(p);
    setPlanForm({
      id: p.id,
      name: p.name || p.duration,
      duration: p.duration || p.name,
      durationDays: p.durationDays || 30,
      price: p.price,
      originalPrice: p.originalPrice || '',
      savings: p.savings || '',
      badge: p.badge || '',
      badgeColor: p.badgeColor || '#EA580C',
      badgeBg: p.badgeBg || '#FFEDD5',
      unitText: p.unitText || '',
      featuresText: Array.isArray(p.features) ? p.features.join('\n') : '',
      active: p.active !== false,
      order: p.order ?? 1,
    });
    setShowPlanModal(true);
  }

  async function savePlan() {
    if (!planForm.name.trim()) {
      alert('Plan Name is required.');
      return;
    }
    if (planForm.price === '' || isNaN(Number(planForm.price)) || Number(planForm.price) < 0) {
      alert('Valid plan price in ₹ is required.');
      return;
    }
    setPlanSubmitting(true);
    try {
      const features = planForm.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const priceNum = Number(planForm.price);
      const origNum = Number(planForm.originalPrice) || 0;
      let savingsCalc = planForm.savings.trim();
      if (!savingsCalc && origNum > priceNum) {
        savingsCalc = `Save ${Math.round((1 - priceNum / origNum) * 100)}%`;
      }

      const payload = {
        name: planForm.name.trim(),
        duration: planForm.duration.trim() || planForm.name.trim(),
        durationDays: Number(planForm.durationDays) || 30,
        price: priceNum,
        originalPrice: origNum,
        savings: savingsCalc,
        badge: planForm.badge.trim() || null,
        badgeColor: planForm.badgeColor,
        badgeBg: planForm.badgeBg,
        unitText: planForm.unitText.trim() || `/${planForm.duration.trim() || planForm.name.trim()}`,
        features: features.length > 0 ? features : [
          'Unlimited ARYA AI practice conversations',
          'HD 1-on-1 Video Calling',
          'All topics unlocked',
        ],
        order: Number(planForm.order) || 1,
        active: Boolean(planForm.active),
      };

      let res;
      if (editingPlan) {
        res = await fetch(`${API}/api/admin/plans/${editingPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        payload.id = planForm.id.trim() || planForm.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        res = await fetch(`${API}/api/admin/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        alert(editingPlan ? '✅ Plan updated successfully!' : '🎉 New plan created successfully!');
        setShowPlanModal(false);
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save plan.');
      }
    } catch {
      alert('Network error while saving plan.');
    } finally {
      setPlanSubmitting(false);
    }
  }

  async function deletePlan(planId, planName) {
    if (!confirm(`Are you sure you want to permanently delete plan "${planName}" (${planId})? Learners will no longer see or purchase this plan.`)) return;
    try {
      const res = await fetch(`${API}/api/admin/plans/${planId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert(`Plan "${planName}" deleted.`);
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete plan.');
      }
    } catch {
      alert('Network error while deleting plan.');
    }
  }

  async function togglePlanActive(p) {
    try {
      const res = await fetch(`${API}/api/admin/plans/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      if (res.ok) {
        load();
      } else {
        alert('Failed to update plan status.');
      }
    } catch {
      alert('Network error updating plan status.');
    }
  }

  // Filtered Users computation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = userQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.id?.toLowerCase().includes(query);

      const isPro = u.subscriptionPlan === 'pro' || u.subscriptionPlan === 'plus';
      const matchPlan =
        userPlanFilter === 'all' ||
        (userPlanFilter === 'pro' && isPro) ||
        (userPlanFilter === 'free' && !isPro);

      const matchStatus =
        userStatusFilter === 'all' || u.status === userStatusFilter;

      return matchQuery && matchPlan && matchStatus;
    });
  }, [users, userQuery, userPlanFilter, userStatusFilter]);

  const menu = [
    ['Overview', LayoutDashboard],
    ['Users', Users],
    ['Subscriptions', CreditCard],
    ['Plans & Pricing', Sparkles],
    ['Rooms', Headphones],
    ['Reports', ShieldAlert],
    ['Audit Logs', History],
  ];

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
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="foot">BYTALK · Operations Portal</div>
      </aside>

      <main>
        <header>
          <div>
            <small>BYTALK Platform · Live Management System</small>
            <h2>{tab}</h2>
          </div>
          <button className="reload" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </header>

        {error && <div className="error">{error}</div>}

        {/* 1. OVERVIEW TAB */}
        {tab === 'Overview' && (
          <>
            <section className="metrics">
              {[
                ['Registered Users', stats.users ?? users.length, Users],
                ['Online Learners', stats.activeUsers ?? users.filter((u) => u.online).length, LayoutDashboard],
                ['👑 PRO Subscribers', stats.proUsers ?? users.filter((u) => u.subscriptionPlan === 'pro').length, Crown],
                ['Total Revenue (₹)', `₹${stats.totalRevenue ?? '0'}`, IndianRupee],
                ['Subscription Plans', plans.length, Sparkles],
                ['Audio Rooms', stats.rooms ?? rooms.length, Headphones],
                ['Messages Exchanged', stats.messages ?? 0, Users],
                ['Open Reports', stats.reports ?? 0, ShieldAlert],
              ].map(([name, value, Icon]) => (
                <div className="metric" key={name}>
                  <Icon size={22} />
                  <p>{name}</p>
                  <strong>{value ?? '—'}</strong>
                </div>
              ))}
            </section>

            <div className="panel">
              <h3>System Status & Operational Overview</h3>
              <p>
                Manage active BYTALK learners, live audio practice rooms, Razorpay subscription enrollments, dynamic pricing plans, and safety moderation reports.
              </p>
              <p className="muted">
                <strong>Dynamic Plans Engine:</strong> Any subscription plan added, modified, or removed here reflects immediately on the user mobile app in real time.
              </p>
            </div>
          </>
        )}

        {/* 2. USERS TAB */}
        {tab === 'Users' && (
          <div className="panel">
            <div className="toolbar">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
                <Search size={16} color="#64748B" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search learners by name, email, or ID..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="filter-select"
                  value={userPlanFilter}
                  onChange={(e) => setUserPlanFilter(e.target.value)}
                >
                  <option value="all">All Plans</option>
                  <option value="pro">👑 PRO Only</option>
                  <option value="free">Free Only</option>
                </select>

                <select
                  className="filter-select"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>

                <button
                  className="action"
                  style={{ backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setGrantUserId('');
                    setShowGrantModal(true);
                  }}
                >
                  <PlusCircle size={15} /> Grant PRO
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Email</th>
                    <th>Level</th>
                    <th>Language</th>
                    <th>Plan Tier</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#64748B', padding: '30px' }}>
                        No learners match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isPro = u.subscriptionPlan === 'pro' || u.subscriptionPlan === 'plus';
                      return (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                          </td>
                          <td>{u.email || '—'}</td>
                          <td>
                            <span className="badge-level">{u.level || 'Beginner'}</span>
                          </td>
                          <td>
                            {u.learningLanguage}
                            <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>
                              Native: {u.nativeLanguage || 'Other'}
                            </span>
                          </td>
                          <td>
                            <span className={isPro ? 'badge-pro' : 'badge-free'}>
                              {isPro ? '👑 PRO' : 'Free'}
                            </span>
                            {isPro && u.subscriptionExpiresAt && (
                              <span style={{ display: 'block', fontSize: '10.5px', color: '#94A3B8' }}>
                                until {new Date(u.subscriptionExpiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className="status"
                              style={{
                                background: u.status === 'suspended' ? '#FFE8E6' : '#E8F9F0',
                                color: u.status === 'suspended' ? '#D92D20' : '#128C50',
                              }}
                            >
                              {u.status === 'suspended' ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="action"
                                style={{
                                  backgroundColor: u.status === 'suspended' ? '#059669' : '#DC2626',
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                }}
                                onClick={() => toggleUserStatus(u.id, u.status)}
                              >
                                {u.status === 'suspended' ? (
                                  <>
                                    <UserCheck size={13} /> Reactivate
                                  </>
                                ) : (
                                  <>
                                    <UserX size={13} /> Suspend
                                  </>
                                )}
                              </button>

                              {isPro ? (
                                <button
                                  className="action"
                                  style={{
                                    backgroundColor: '#EA580C',
                                    padding: '5px 10px',
                                    fontSize: '11.5px',
                                  }}
                                  onClick={() => revokeProAccess(u.id)}
                                >
                                  Revoke PRO
                                </button>
                              ) : (
                                <button
                                  className="action"
                                  style={{
                                    backgroundColor: '#4F46E5',
                                    padding: '5px 10px',
                                    fontSize: '11.5px',
                                  }}
                                  onClick={() => {
                                    setGrantUserId(u.id);
                                    setShowGrantModal(true);
                                  }}
                                >
                                  Grant PRO
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SUBSCRIPTIONS TAB */}
        {tab === 'Subscriptions' && (
          <div className="panel">
            <div className="toolbar">
              <div>
                <h3 style={{ margin: '0 0 4px' }}>Active Subscribers & Enrollments</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Review all active paid and granted memberships, payment gateways, and validity periods.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="action"
                  style={{ backgroundColor: '#0284C7', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setTab('Plans & Pricing')}
                >
                  <Sparkles size={15} /> Manage Plans & Pricing
                </button>
                <button
                  className="action"
                  style={{ backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setGrantUserId('');
                    setShowGrantModal(true);
                  }}
                >
                  <PlusCircle size={15} /> + Grant PRO Manually
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Provider</th>
                    <th>Purchase ID</th>
                    <th>Amount Paid</th>
                    <th>Started</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: '#64748B', padding: '30px' }}>
                        No active subscriptions on record. Use the "+ Grant PRO Manually" button above or wait for Razorpay transactions.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <strong>{sub.userName}</strong>
                        </td>
                        <td>{sub.userEmail || '—'}</td>
                        <td>
                          <span className="badge-pro" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            👑 {sub.plan}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{sub.provider}</td>
                        <td>
                          <code style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            {sub.purchaseId}
                          </code>
                        </td>
                        <td className="badge-revenue">₹{sub.amount}</td>
                        <td>{sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : '—'}</td>
                        <td>{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'Lifetime'}</td>
                        <td>
                          <span
                            className="status"
                            style={{
                              background: sub.status === 'active' ? '#E8F9F0' : '#FFE8E6',
                              color: sub.status === 'active' ? '#128C50' : '#D92D20',
                            }}
                          >
                            {sub.status === 'active' ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="action"
                              style={{ backgroundColor: '#2563EB', padding: '5px 10px', fontSize: '11.5px' }}
                              onClick={() => grantProAccess(sub.userId, 30, 0)}
                            >
                              +30 Days
                            </button>
                            <button
                              className="action"
                              style={{ backgroundColor: '#DC2626', padding: '5px 10px', fontSize: '11.5px' }}
                              onClick={() => revokeProAccess(sub.userId)}
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PLANS & PRICING TAB (NEW) */}
        {tab === 'Plans & Pricing' && (
          <div className="panel">
            <div className="toolbar">
              <div>
                <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#6366F1" />
                  Subscription Plans & Pricing Management
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  Create, edit, reorder, or delete PRO subscription plans. Changes immediately sync in real-time to the learner mobile & web app!
                </p>
              </div>

              <button
                className="action"
                style={{ backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={openAddPlanModal}
              >
                <PlusCircle size={16} /> + Add New Plan
              </button>
            </div>

            {/* Plans Grid (Card Previews) */}
            <div className="plans-grid">
              {plans.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No subscription plans found. Click "+ Add New Plan" to create one.
                </div>
              ) : (
                plans.map((p) => {
                  const origPrice = p.originalPrice || Math.round(p.price * 1.5);
                  return (
                    <div className={`plan-card-admin ${!p.active ? 'inactive' : ''}`} key={p.id}>
                      <div className="plan-card-header">
                        <div className="plan-title-box">
                          <h4>{p.name || p.duration}</h4>
                          <span className="plan-id-tag">ID: {p.id} · {p.durationDays} Days</span>
                        </div>
                        {p.badge ? (
                          <span
                            className="plan-badge-pill"
                            style={{
                              backgroundColor: p.badgeBg || '#FFEDD5',
                              color: p.badgeColor || '#EA580C',
                            }}
                          >
                            ⭐ {p.badge}
                          </span>
                        ) : (
                          <span
                            className="status"
                            style={{
                              backgroundColor: p.active ? '#E8F9F0' : '#F1F5F9',
                              color: p.active ? '#128C50' : '#64748B',
                              fontSize: '11px',
                              padding: '2px 8px',
                            }}
                          >
                            {p.active ? 'Active' : 'Hidden'}
                          </span>
                        )}
                      </div>

                      {/* Pricing Row */}
                      <div className="plan-price-row">
                        {origPrice > p.price && (
                          <span className="plan-price-strike">₹{origPrice}</span>
                        )}
                        <span className="plan-price-main">₹{p.price}</span>
                        <span className="plan-price-unit">{p.unitText || `/${p.duration}`}</span>
                      </div>

                      {p.savings && (
                        <div>
                          <span className="plan-savings-pill">{p.savings}</span>
                        </div>
                      )}

                      {/* Feature Highlights */}
                      <ul className="plan-features-list">
                        {(p.features || []).slice(0, 4).map((feat, idx) => (
                          <li key={idx}>
                            <Check size={14} color="#10B981" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Card Action Buttons */}
                      <div className="plan-card-actions">
                        <button
                          className="action"
                          style={{
                            backgroundColor: '#4F46E5',
                            padding: '6px 12px',
                            fontSize: '12px',
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                          onClick={() => openEditPlanModal(p)}
                        >
                          <Edit2 size={13} /> Edit Plan
                        </button>

                        <button
                          className="action"
                          style={{
                            backgroundColor: p.active ? '#64748B' : '#059669',
                            padding: '6px 12px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={p.active ? 'Hide plan from learners' : 'Make plan visible'}
                          onClick={() => togglePlanActive(p)}
                        >
                          {p.active ? <EyeOff size={13} /> : <Eye size={13} />}
                          {p.active ? 'Hide' : 'Show'}
                        </button>

                        <button
                          className="action"
                          style={{
                            backgroundColor: '#DC2626',
                            padding: '6px 10px',
                            fontSize: '12px',
                          }}
                          title="Delete this plan"
                          onClick={() => deletePlan(p.id, p.name || p.duration)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Plans Tabular Summary */}
            <div style={{ marginTop: '30px' }}>
              <h4>All Subscription Plans Summary</h4>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Plan ID</th>
                      <th>Plan Name</th>
                      <th>Duration</th>
                      <th>Days</th>
                      <th>Price</th>
                      <th>Original</th>
                      <th>Savings</th>
                      <th>Badge Tag</th>
                      <th>Order</th>
                      <th>Learner Visibility</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.id}</code></td>
                        <td><strong>{p.name || p.duration}</strong></td>
                        <td>{p.duration}</td>
                        <td>{p.durationDays} Days</td>
                        <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{p.price}</td>
                        <td style={{ color: '#94A3B8', textDecoration: 'line-through' }}>
                          {p.originalPrice ? `₹${p.originalPrice}` : '—'}
                        </td>
                        <td><span className="plan-savings-pill">{p.savings || '—'}</span></td>
                        <td>
                          {p.badge ? (
                            <span
                              className="plan-badge-pill"
                              style={{
                                backgroundColor: p.badgeBg || '#FFEDD5',
                                color: p.badgeColor || '#EA580C',
                              }}
                            >
                              {p.badge}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{p.order ?? 1}</td>
                        <td>
                          <span
                            className="status"
                            style={{
                              backgroundColor: p.active ? '#E8F9F0' : '#FFE8E6',
                              color: p.active ? '#128C50' : '#D92D20',
                            }}
                          >
                            {p.active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="action"
                              style={{ backgroundColor: '#4F46E5', padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => openEditPlanModal(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="action"
                              style={{ backgroundColor: '#DC2626', padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => deletePlan(p.id, p.name || p.duration)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. ROOMS TAB */}
        {tab === 'Rooms' && (
          <div className="panel">
            <h3>Audio Practice Rooms</h3>
            <p className="muted">Live multi-user audio conversation rooms for learners worldwide.</p>
            {rooms.length === 0 ? (
              <p className="muted" style={{ padding: '20px 0' }}>
                No active speaking rooms currently configured.
              </p>
            ) : (
              rooms.map((r) => (
                <div className="room" key={r.id}>
                  <div className="emoji">{r.topicEmoji || '🎙️'}</div>
                  <div>
                    <strong>{r.title}</strong>
                    <p className="muted">{r.description || 'Public audio speaking room'}</p>
                    <small>
                      Level: {r.level} · {r.participants?.length || 0} participants
                    </small>
                  </div>
                  <span className="status" style={{ background: '#E8F9F0', color: '#128C50' }}>
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 6. REPORTS TAB */}
        {tab === 'Reports' && (
          <div className="panel">
            <h3>User Reports & Safety Moderation</h3>
            <p className="muted">Review incidents reported during 1-to-1 audio and video calls.</p>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Reported User</th>
                    <th>Reason</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#64748B', padding: '30px' }}>
                        No open moderation reports.
                      </td>
                    </tr>
                  ) : (
                    reports.map((rep) => (
                      <tr key={rep.id}>
                        <td><code>{rep.id}</code></td>
                        <td><strong>{rep.targetName || rep.targetId}</strong></td>
                        <td>{rep.reason || 'Safety issue'}</td>
                        <td>{new Date(rep.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td>
                          <span
                            className="status"
                            style={{
                              background: rep.status === 'resolved' ? '#E8F9F0' : '#FFE8E6',
                              color: rep.status === 'resolved' ? '#128C50' : '#D92D20',
                            }}
                          >
                            {rep.status || 'open'}
                          </span>
                        </td>
                        <td>
                          {rep.status !== 'resolved' && (
                            <button
                              className="action"
                              style={{ backgroundColor: '#10B981', padding: '5px 10px', fontSize: '11.5px' }}
                              onClick={() => resolveReport(rep.id, 'resolved', 'Reviewed by admin')}
                            >
                              Mark Resolved
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. AUDIT LOGS TAB */}
        {tab === 'Audit Logs' && (
          <div className="panel">
            <h3>Security & Operational Audit Log</h3>
            <p className="muted">Permanent log of all administrative actions, plan modifications, and payment verification events.</p>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Event Type</th>
                    <th>Target / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#64748B', padding: '30px' }}>
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748B' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td><strong>{log.actor}</strong></td>
                        <td>
                          <span
                            className="status"
                            style={{
                              background:
                                log.eventType.includes('REVOKED') || log.eventType.includes('SUSPENDED') || log.eventType.includes('DELETED')
                                  ? '#FFE8E6'
                                  : log.eventType.includes('PURCHASED') || log.eventType.includes('GRANTED') || log.eventType.includes('CREATED')
                                  ? '#FEF3C7'
                                  : '#EFF6FF',
                              color:
                                log.eventType.includes('REVOKED') || log.eventType.includes('SUSPENDED') || log.eventType.includes('DELETED')
                                  ? '#D92D20'
                                  : log.eventType.includes('PURCHASED') || log.eventType.includes('GRANTED') || log.eventType.includes('CREATED')
                                  ? '#B45309'
                                  : '#1E40AF',
                            }}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td>{log.target}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODALS ================= */}

        {/* 1. MANUAL GRANT PRO MODAL */}
        {showGrantModal && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <h4>👑 Manual PRO Subscription Grant</h4>

              <div className="form-group">
                <label>Select Learner</label>
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Subscription Plan Duration</label>
                <select
                  value={grantPlanId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setGrantPlanId(selId);
                    const foundPlan = plans.find((p) => p.id === selId);
                    if (foundPlan) {
                      setGrantDuration(String(foundPlan.durationDays || 90));
                      setGrantAmount(String(foundPlan.price || 0));
                    }
                  }}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.duration} ({p.durationDays} Days - ₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Duration in Days</label>
                <input
                  type="number"
                  value={grantDuration}
                  onChange={(e) => setGrantDuration(e.target.value)}
                  placeholder="90"
                />
              </div>

              <div className="form-group">
                <label>Recorded Payment Amount (₹)</label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="524.3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action"
                  style={{ backgroundColor: '#64748B' }}
                  onClick={() => setShowGrantModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action"
                  style={{ backgroundColor: '#4F46E5' }}
                  disabled={!grantUserId || grantSubmitting}
                  onClick={async () => {
                    setGrantSubmitting(true);
                    await grantProAccess(grantUserId, grantDuration, grantAmount, grantPlanId);
                    setGrantSubmitting(false);
                  }}
                >
                  {grantSubmitting ? 'Granting...' : 'Grant PRO Access'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. ADD / EDIT PLAN MODAL (NEW) */}
        {showPlanModal && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h4>{editingPlan ? '✏️ Edit Subscription Plan' : '➕ Add New Subscription Plan'}</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Plan ID (Unique Key)</label>
                  <input
                    type="text"
                    value={planForm.id}
                    disabled={!!editingPlan}
                    onChange={(e) => setPlanForm({ ...planForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="e.g. 6months, 1year, vip"
                  />
                  <small style={{ color: '#94A3B8', fontSize: '11px' }}>
                    {editingPlan ? 'Unique identifier cannot be modified.' : 'Letters, numbers and hyphens only.'}
                  </small>
                </div>

                <div className="form-group">
                  <label>Plan Display Name *</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = { ...planForm, name: val };
                      if (!editingPlan && !planForm.id) {
                        next.id = val.toLowerCase().replace(/[^a-z0-9]/g, '');
                      }
                      if (!planForm.duration) {
                        next.duration = val;
                      }
                      setPlanForm(next);
                    }}
                    placeholder="e.g. 6 Months, 1 Year"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Duration Label</label>
                  <input
                    type="text"
                    value={planForm.duration}
                    onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                    placeholder="e.g. 6 Months, 3 Months"
                  />
                </div>

                <div className="form-group">
                  <label>Duration (in Days) *</label>
                  <input
                    type="number"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    placeholder="e.g. 180"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    placeholder="e.g. 699, 999"
                  />
                </div>

                <div className="form-group">
                  <label>Original Strike Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.originalPrice}
                    onChange={(e) => setPlanForm({ ...planForm, originalPrice: e.target.value })}
                    placeholder="e.g. 1500, 2400"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Savings / Discount Tag</label>
                  <input
                    type="text"
                    value={planForm.savings}
                    onChange={(e) => setPlanForm({ ...planForm, savings: e.target.value })}
                    placeholder="e.g. Save 53% (auto if empty)"
                  />
                </div>

                <div className="form-group">
                  <label>Badge Chip (Optional)</label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    placeholder="e.g. Most Popular, Most Valued"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Price Unit Suffix</label>
                  <input
                    type="text"
                    value={planForm.unitText}
                    onChange={(e) => setPlanForm({ ...planForm, unitText: e.target.value })}
                    placeholder="e.g. /6 Months, /Year"
                  />
                </div>

                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={planForm.order}
                    onChange={(e) => setPlanForm({ ...planForm, order: e.target.value })}
                    placeholder="1, 2, 3..."
                  />
                </div>
              </div>

              {/* Badge Color Presets */}
              <div className="form-group">
                <label>Badge Color Theme</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    ['Orange / Fire', '#EA580C', '#FFEDD5'],
                    ['Gold / Crown', '#D97706', '#FEF3C7'],
                    ['Purple / VIP', '#7C3AED', '#EDE9FE'],
                    ['Emerald / Deal', '#059669', '#ECFDF5'],
                  ].map(([label, color, bg]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, badgeColor: color, badgeBg: bg })}
                      style={{
                        backgroundColor: bg,
                        color,
                        border: planForm.badgeColor === color ? `2px solid ${color}` : '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features Multi-line */}
              <div className="form-group">
                <label>Included Features (One feature per line)</label>
                <textarea
                  rows="4"
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  placeholder="Unlimited ARYA AI practice conversations&#10;HD 1-on-1 Video Calling&#10;Interview Prep Topics"
                />
              </div>

              {/* Active Toggle */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="planActiveCheck"
                  checked={planForm.active}
                  onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="planActiveCheck" style={{ margin: 0, cursor: 'pointer' }}>
                  Active & Visible for Learners (Enable for purchase)
                </label>
              </div>

              {/* Live Preview */}
              <div className="plan-preview-box">
                <small style={{ fontWeight: '800', color: '#4338CA', display: 'block', marginBottom: '6px' }}>
                  📱 LIVE APP PREVIEW (How learners see this plan):
                </small>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#5843E8', borderStyle: 'solid' }} />
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#0F172A' }}>
                      {planForm.name || 'Plan Name'}
                    </span>
                    {planForm.badge && (
                      <span
                        style={{
                          backgroundColor: planForm.badgeBg,
                          color: planForm.badgeColor,
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {planForm.badge}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#94A3B8', textDecoration: 'line-through', fontSize: '12px', marginRight: '6px' }}>
                      {planForm.originalPrice ? `₹${planForm.originalPrice}` : ''}
                    </span>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>
                      ₹{planForm.price || '0'}
                    </span>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                      {planForm.savings || (planForm.originalPrice > planForm.price ? `Save ${Math.round((1 - planForm.price / planForm.originalPrice) * 100)}%` : '')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="action"
                  style={{ backgroundColor: '#64748B' }}
                  onClick={() => setShowPlanModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action"
                  style={{ backgroundColor: '#4F46E5' }}
                  disabled={planSubmitting || !planForm.name || !planForm.price}
                  onClick={savePlan}
                >
                  {planSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
