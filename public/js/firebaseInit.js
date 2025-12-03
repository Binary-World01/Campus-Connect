
const firebaseConfig = {
  apiKey: "AIzaSyDm0mHukVkJB83oaaDwfZz6JZ42gSYKZP8",
  authDomain: "campus-connect-ff687.firebaseapp.com",
  databaseURL: "https://campus-connect-ff687-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "campus-connect-ff687",
  storageBucket: "campus-connect-ff687.firebasestorage.app",
  messagingSenderId: "415317243228",
  appId: "1:415317243228:web:b8e354ea6deaae3599fd99",
  measurementId: "G-BLZWMWWM2D"
};

if (typeof firebase === "undefined") {
  console.error("Firebase SDK missing. Include compat SDK script tags in HTML.");
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db = firebase.database();
    // Load functions compat only if needed by admin unmask
    if (firebase.functions) window.functions = firebase.functions();
    console.log("firebaseInit.js loaded — auth ready:", !!window.auth);
  } catch (e) {
    console.error("Error initializing Firebase:", e);
  }
}