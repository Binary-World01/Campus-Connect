
function rand4() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function generateUniqueUIDLocal(branch) {
  branch = (branch || 'XX').toString().substring(0,2).toUpperCase();
  // local-only UID generator — chance of collision extremely low for demo
  return `M-${branch}-${rand4()}-${rand4()}`;
}

function saveProfileLocally(uid, profile) {
  // store under key "cc_user_<uid>"
  try {
    localStorage.setItem(`cc_user_${uid}`, JSON.stringify(profile));
  } catch (e) {
    console.warn('localStorage write failed', e);
  }
}

async function registerStudent() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const branch = document.getElementById('branch').value.trim().toUpperCase();
  const roll = document.getElementById('roll').value.trim();
  const out = document.getElementById('regmsg');

  if (!name || !email || !password || !branch || !roll) {
    return out.innerText = 'Please fill all fields.';
  }
  if (password.length < 6) return out.innerText = 'Password must be >= 6 characters.';

  try {
    // create auth user as before
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // generate local customUID (works offline/demo)
    const customUID = await generateUniqueUIDLocal(branch);

    const profile = {
      name, email, branch, roll,
      role: 'student',
      customUID,
      createdAt: Date.now(),
      localOnly: true // flag that this profile was created locally
    };

    // save locally
    saveProfileLocally(uid, profile);

    // try to write to Realtime DB if possible (non-blocking)
    (async () => {
      try {
        if (typeof db !== 'undefined') {
          await db.ref(`users/${uid}`).set(profile);
          // if DB write succeeded, remove localOnly flag
          profile.localOnly = false;
          saveProfileLocally(uid, profile);
        }
      } catch (e) {
        // ignore DB errors; keep the local copy
        console.warn('DB write failed (non-blocking):', e && e.message ? e.message : e);
      }
    })();

    out.innerText = 'Account created. UID: ' + customUID;
    // quick redirect for demo
    setTimeout(()=> location.href = 'dashboard.html', 800);
  } catch (err) {
    out.innerText = err && err.message ? err.message : 'Registration failed';
  }
}

window.registerStudent = registerStudent;
