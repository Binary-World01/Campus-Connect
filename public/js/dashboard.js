
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

async function initStudentDashboard() {
  auth.onAuthStateChanged(async user => {
    if (!user) return location.href = 'index.html';
    const uid = user.uid;
    // try local profile first
    let profile = null;
    try {
      const raw = localStorage.getItem('cc_user_' + uid);
      profile = raw ? JSON.parse(raw) : null;
    } catch (e) { profile = null; }

    // fallback: try DB (non-blocking)
    (async () => {
      try {
        if (typeof db !== 'undefined') {
          const snap = await db.ref('users/' + uid).get();
          if (snap.exists()) {
            profile = snap.val();
            // update local copy too
            try { localStorage.setItem('cc_user_' + uid, JSON.stringify(profile)); } catch(e){}
          }
        }
      } catch(e){ console.warn('DB profile read failed', e); }
      // refresh pseudonym in case profile upgraded
      const pseudoEl = document.getElementById('pseudonym');
      if (pseudoEl) pseudoEl.innerText = (profile && profile.customUID) ? profile.customUID : pseudoEl.innerText;
    })();

    // set pseudonym now (local or pending)
    const pseudoEl = document.getElementById('pseudonym');
    if (pseudoEl) pseudoEl.innerText = (profile && profile.customUID) ? profile.customUID : 'UID pending';

    // Try to load complaints from DB first (if DB accessible). Otherwise use local storage.
    let complaints = [];
    try {
      if (typeof db !== 'undefined') {
        const snap = await db.ref('complaints').orderByChild('studentUid').equalTo(uid).get();
        if (snap.exists()) {
          snap.forEach(c => complaints.push(Object.assign({ id: c.key }, c.val())));
        } else {
          complaints = getLocalComplaintsForUser(uid);
        }
      } else {
        complaints = getLocalComplaintsForUser(uid);
      }
    } catch (e) {
      console.warn('DB complaints read failed', e);
      complaints = getLocalComplaintsForUser(uid);
    }

    renderComplaints(complaints);
  });
}

function renderComplaints(list) {
  const listEl = document.getElementById('complaints');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!list || list.length === 0) {
    listEl.innerHTML = '<div class="meta">No complaints yet.</div>';
    return;
  }
  list.forEach(c => {
    const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : '—';
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div>
        <div style="font-weight:700">${escapeHtml(c.title)}</div>
        <div class="meta">${escapeHtml(c.category || 'General')} • ${created} • ${escapeHtml(c.status || 'pending')}</div>
        <div class="meta" style="margin-top:6px">${escapeHtml(c.description || '').slice(0,250)}${c.description && c.description.length>250 ? '...' : ''}</div>
      </div>
    `;
    listEl.appendChild(el);
  });
}

window.initStudentDashboard = initStudentDashboard;
window.renderComplaints = renderComplaints;
