
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

async function loadAllComplaints() {
  auth.onAuthStateChanged(async user => {
    if (!user) return location.href = 'index.html';
    const userSnap = await (typeof db !== 'undefined' ? db.ref('users/' + user.uid).get() : Promise.resolve({ exists: () => false }));
    const isAdmin = userSnap && userSnap.exists && userSnap.exists() ? userSnap.val().role === 'admin' : false;
    if (!isAdmin) {
      // allow admin bypass during local-demo: check local storage flag "cc_admin" if set true on this device
      const localAdminFlag = localStorage.getItem('cc_admin_'+user.uid);
      if (!localAdminFlag) {
        alert('Access denied. You must be admin.');
        return logout();
      }
    }

    const listEl = document.getElementById('allComplaints');
    listEl.innerHTML = '<div class="meta">Loading…</div>';

    try {
      // try DB first
      if (typeof db !== 'undefined') {
        const snap = await db.ref('complaints').orderByChild('createdAt').limitToLast(500).get();
        if (snap.exists()) {
          const arr = [];
          snap.forEach(c => arr.push(Object.assign({ id: c.key }, c.val())));
          renderAdminList(arr);
          return;
        }
      }
    } catch (e) {
      console.warn('DB read failed', e);
    }

    // fallback: local complaints on this device
    const local = loadLocalComplaints();
    renderAdminList(local);
  });
}

function renderAdminList(arr) {
  const listEl = document.getElementById('allComplaints');
  listEl.innerHTML = '';
  if (!arr || arr.length === 0) { listEl.innerHTML = '<div class="meta">No complaints.</div>'; return; }
  arr.forEach(c => {
    const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : '—';
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div>
        <div style="font-weight:700">${escapeHtml(c.title)} <span class="meta">(${escapeHtml(c.customUID || 'N/A')})</span></div>
        <div class="meta">${created} • ${escapeHtml(c.status || 'pending')}</div>
        <div class="meta" style="margin-top:6px">${escapeHtml(c.description || '').slice(0,200)}${c.description && c.description.length>200 ? '…' : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="markResolvedLocal('${c.id}')">Resolve</button>
        <button class="btn secondary" onclick="deleteLocalComplaint('${c.id}')">Delete</button>
      </div>
    `;
    listEl.appendChild(el);
  });
}

// Local-only resolve/delete operations (or DB if available)
async function markResolvedLocal(id) {
  // if DB has the complaint id as remoteId, update DB; otherwise update localStorage
  try {
    const local = loadLocalComplaints();
    const idx = local.findIndex(x => x.id === id || x.remoteId === id);
    if (idx === -1) return alert('Complaint not found locally.');
    local[idx].status = 'resolved';
    saveLocalComplaints(local);
    // try remote update
    if (typeof db !== 'undefined' && local[idx].remoteId) {
      await db.ref('complaints/' + local[idx].remoteId + '/status').set('resolved');
    }
    loadAllComplaints();
  } catch (e) {
    console.error(e);
  }
}

async function deleteLocalComplaint(id) {
  if (!confirm('Delete complaint?')) return;
  try {
    let local = loadLocalComplaints();
    const toDelete = local.filter(x => x.id === id || x.remoteId === id);
    local = local.filter(x => !(x.id === id || x.remoteId === id));
    saveLocalComplaints(local);
    // try remote delete if remoteId exists
    for (const d of toDelete) {
      if (typeof db !== 'undefined' && d.remoteId) {
        try { await db.ref('complaints/' + d.remoteId).remove(); } catch(e){ console.warn('remote delete failed', e); }
      }
    }
    loadAllComplaints();
  } catch (e) { console.error(e); }
}

// helper to export local complaints to JSON (for migration later)
function exportLocalComplaints() {
  const arr = loadLocalComplaints();
  const json = JSON.stringify(arr, null, 2);
  // prints to console and returns string for copy/paste
  console.log('Exported local complaints JSON:', json);
  return json;
}

// helper to import complaints into DB (admin-run later when DB permitted).
// This function expects you have admin rights in DB. It will push each complaint into /complaints and print mapping.
async function importLocalComplaintsToDB() {
  if (typeof db === 'undefined') return alert('DB not available.');
  const arr = loadLocalComplaints();
  for (const c of arr) {
    const newRef = db.ref('complaints').push();
    await newRef.set({
      studentUid: c.studentUid,
      customUID: c.customUID,
      title: c.title,
      description: c.description,
      category: c.category,
      status: c.status || 'pending',
      createdAt: c.createdAt || Date.now()
    });
    console.log('Imported', c.id, '->', newRef.key);
    // Optionally mark local copy as synced
    c.remoteId = newRef.key;
    c.localOnly = false;
  }
  saveLocalComplaints(arr);
  alert('Import complete. Check DB.');
}

window.loadAllComplaints = loadAllComplaints;
window.exportLocalComplaints = exportLocalComplaints;
window.importLocalComplaintsToDB = importLocalComplaintsToDB;
window.markResolvedLocal = markResolvedLocal;
window.deleteLocalComplaint = deleteLocalComplaint;
