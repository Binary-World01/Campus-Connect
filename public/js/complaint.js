
const CC_COMPLAINTS_KEY = 'cc_complaints_v1';
const BAD_WORDS = ["fuck","shit","bitch","idiot"];

function isClean(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return !BAD_WORDS.some(w => t.includes(w));
}

function loadLocalComplaints() {
  try {
    const raw = localStorage.getItem(CC_COMPLAINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse local complaints', e);
    return [];
  }
}

function saveLocalComplaints(list) {
  try {
    localStorage.setItem(CC_COMPLAINTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to write local complaints', e);
  }
}

async function submitComplaintFromUI() {
  if (!auth.currentUser) return location.href = 'index.html';
  const uid = auth.currentUser.uid;
  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const out = document.getElementById('cmsg');

  if (!title || !description) return out.innerText = 'Title and description required.';
  if (!isClean(title + ' ' + description)) return out.innerText = 'Inappropriate language detected.';

  // client-side daily limit (local data)
  const complaints = loadLocalComplaints().filter(c => c.studentUid === uid);
  const today = new Date().toISOString().slice(0,10);
  const todayCount = complaints.reduce((acc, c) => {
    const d = new Date(c.createdAt).toISOString().slice(0,10);
    return acc + (d === today ? 1 : 0);
  }, 0);
  if (todayCount >= 2) return out.innerText = 'Daily limit reached (2).';

  // get user's customUID from localStorage profile or DB
  let profile = null;
  try {
    const localProfile = localStorage.getItem(`cc_user_${uid}`);
    profile = localProfile ? JSON.parse(localProfile) : null;
  } catch (e) { profile = null; }

  const customUID = (profile && profile.customUID) ? profile.customUID : null;

  const complaint = {
    id: 'local_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    studentUid: uid,
    customUID,
    title,
    description,
    category,
    status: 'pending',
    createdAt: Date.now(),
    localOnly: true // local-only until / unless DB sync happens
  };

  // Save locally
  const all = loadLocalComplaints();
  all.push(complaint);
  saveLocalComplaints(all);

  // Non-blocking attempt to write to DB if available
  (async () => {
    try {
      if (typeof db !== 'undefined') {
        const newRef = db.ref('complaints').push();
        await newRef.set({
          studentUid: complaint.studentUid,
          customUID: complaint.customUID,
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          status: complaint.status,
          createdAt: complaint.createdAt
        });
        // on success, mark local complaint as synced
        complaint.localOnly = false;
        complaint.remoteId = newRef.key;
        saveLocalComplaints(loadLocalComplaints().map(c => c.id === complaint.id ? complaint : c));
      }
    } catch (e) {
      console.warn('DB complaint write failed (non-blocking):', e && e.message ? e.message : e);
    }
  })();

  out.innerText = 'Submitted (saved locally).';
  setTimeout(()=> location.href = 'dashboard.html', 800);
}

function getLocalComplaintsForUser(uid) {
  return loadLocalComplaints().filter(c => c.studentUid === uid).sort((a,b)=>b.createdAt - a.createdAt);
}

// Expose functions
window.submitComplaintFromUI = submitComplaintFromUI;
window.getLocalComplaintsForUser = getLocalComplaintsForUser;
window.loadLocalComplaints = loadLocalComplaints;
window.saveLocalComplaints = saveLocalComplaints;
