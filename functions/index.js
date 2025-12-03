// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Filter = require('bad-words');

admin.initializeApp();
const db = admin.database();
const filter = new Filter();

function rand4() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i += 1) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

async function generateUID(branch) {
  branch = (branch || 'XX').toString().substring(0, 2).toUpperCase();
  let uid;
  let exists = true;
  while (exists) {
    uid = `M-${branch}-${rand4()}-${rand4()}`;
    // check uniqueness
    // look for any user with the same customUID
    // limit to first match to reduce data transfer
    // note: this is safe for modest scale; for huge scale you'd need a different scheme
    // but it is fine for campus projects
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.ref('users').orderByChild('customUID').equalTo(uid).limitToFirst(1).get();
    exists = snap.exists();
  }
  return uid;
}

exports.processRegistration = functions.database.ref('/pendingRegistrations/{uid}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    try {
      const userRef = db.ref(`users/${uid}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists()) {
        await snap.ref.remove();
        return null;
      }
      const user = userSnap.val();

      // duplicate check based on roll+branch
      const rollBranch = `${user.roll || ''}_${user.branch || ''}`;
      const existing = await db.ref('users').orderByChild('roll_branch').equalTo(rollBranch).get();

      let isDuplicate = false;
      existing.forEach((c) => {
        if (c.key !== uid && c.val().customUID) isDuplicate = true;
      });

      if (isDuplicate) {
        await userRef.update({ registrationStatus: 'duplicate', verified: false });
        await snap.ref.remove();
        return null;
      }

      const customUID = await generateUID(user.branch || 'XX');
      await userRef.update({
        customUID,
        verified: true,
        registrationStatus: 'ok',
        roll_branch: rollBranch
      });
      await snap.ref.remove();
      console.log('Registered user', uid, '->', customUID);
      return null;
    } catch (err) {
      console.error('processRegistration error', err);
      return null;
    }
  });

exports.processSubmit = functions.database.ref('/submitRequests/{reqId}')
  .onCreate(async (snap, context) => {
    const req = snap.val();
    const reqId = context.params.reqId;
    try {
      if (!req || !req.studentUid || !req.title || !req.description) {
        await snap.ref.update({ status: 'invalid' });
        return null;
      }

      const userSnap = await db.ref(`users/${req.studentUid}`).get();
      if (!userSnap.exists()) {
        await snap.ref.update({ status: 'invalid_user' });
        return null;
      }

      // daily limit
      const today = new Date().toISOString().slice(0, 10);
      const limitRef = db.ref(`limits/${req.studentUid}/${today}`);
      const lSnap = await limitRef.get();
      const count = lSnap.exists() ? (lSnap.val().count || 0) : 0;
      if (count >= 2) {
        await snap.ref.update({ status: 'rejected', reason: 'daily_limit' });
        return null;
      }

      // moderation
      const text = `${req.title} ${req.description}`;
      const isProfane = filter.isProfane(text);
      const status = isProfane ? 'flagged' : 'pending';

      // create complaint
      const complaintRef = db.ref('complaints').push();
      await complaintRef.set({
        studentUid: req.studentUid,
        customUID: userSnap.val().customUID || null,
        title: req.title,
        description: req.description,
        category: req.category || 'Other',
        status,
        moderation: isProfane ? 'profanity' : null,
        createdAt: Date.now()
      });

      // increment limit
      await limitRef.transaction((curr) => {
        if (!curr) return { count: 1 };
        return { count: (curr.count || 0) + 1 };
      });

      await db.ref('logs').push({
        type: 'submission',
        reqId,
        complaintId: complaintRef.key,
        studentUid: req.studentUid,
        status,
        at: Date.now()
      });

      await snap.ref.remove();
      console.log('Processed submit', reqId, '->', complaintRef.key);
      return null;
    } catch (err) {
      console.error('processSubmit error', err);
      // update request with error so UX shows problem
      try {
        await snap.ref.update({ status: 'error', err: err.message });
      } catch (e) {
        // ignore
      }
      return null;
    }
  });

exports.unmaskUser = functions.https.onCall(async (data, context) => {
  const caller = context.auth && context.auth.uid;
  if (!caller) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const adminSnap = await db.ref(`users/${caller}`).get();
  if (!adminSnap.exists() || adminSnap.val().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const studentUid = data.studentUid;
  const sSnap = await db.ref(`users/${studentUid}`).get();
  if (!sSnap.exists()) throw new functions.https.HttpsError('not-found', 'Student not found');

  await db.ref('unmaskLogs').push({
    admin: caller,
    studentUid,
    at: Date.now(),
    reason: data.reason || null
  });

  const u = sSnap.val();
  return { name: u.name, email: u.email, roll: u.roll, branch: u.branch };
});
