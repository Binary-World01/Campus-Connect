// public/js/auth.js

// Wait until firebase auth is ready
function readyAuth() {
  return new Promise(resolve => {
    if (window.auth) return resolve(window.auth);
    const i = setInterval(() => {
      if (window.auth) { clearInterval(i); resolve(window.auth); }
    }, 50);
  });
}

async function login() {
  await readyAuth();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // redirect after small delay
    setTimeout(()=> {
      // read role and redirect
      db.ref(`users/${auth.currentUser.uid}`).get().then(snap => {
        const u = snap.exists() ? snap.val() : null;
        if (u && u.role === 'admin') location.href='admin.html';
        else location.href='dashboard.html';
      }).catch(()=> location.href='dashboard.html');
    }, 300);
  } catch (err) {
    if (msg) msg.innerText = err.message;
  }
}

async function logout() {
  await readyAuth();
  if (auth.currentUser) await auth.signOut();
  location.href = 'index.html';
}

// expose
window.login = login;
window.logout = logout;
window.readyAuth = readyAuth;
