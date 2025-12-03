# 📚 CampusConnect — Online Student Complaint System  
*A mini-project designed for colleges to streamline student grievance submission with optional anonymity.*

CampusConnect allows students to register, generate a secure UID, and submit complaints through a clean and modern interface. The system supports both **local storage mode** (offline/demo mode) and **Firebase-enhanced mode** (online sync).  
For the current submission, **local storage mode is used** to avoid backend dependencies and ensure 100% functional behaviour on any device.

---

## 🚀 Features

### 👨‍🎓 Student Side
- Student registration with **auto-generated UID**  
- Local profile storage for offline functionality  
- Submit complaints with:
  - Category
  - Title
  - Description
  - Auto-timestamp  
- Daily complaint limit (2 per day)
- Client-side profanity filter  
- View all complaints submitted by the student  
- Modern UI with clean layout

### 🛠 Admin Side
- Admin login  
- Local admin fallback for demo mode  
- View all complaints submitted on the device  
- Mark complaints as **resolved**  
- Delete complaints  
- Import student complaints (from export JSON)  
- Optional database sync mode (Firebase)

### 🔒 Security
- Email/Password authentication via Firebase Auth  
- All local writes/reads sandboxed inside browser storage  
- UID masking to maintain student anonymity

---

## 🏗 Technologies Used

- **HTML5 + CSS3 (Modern UI)**  
- **JavaScript (Vanilla)**  
- **LocalStorage (Temporary client-side DB)**  
- **Firebase (Auth & optional Realtime DB)**  
- Hosted via **GitHub** / served via **Live Server**


---

## 🛠 Installation & Setup

CampusConnect requires **no backend** for the demo version.  
You only need a browser and optionally a local web server.

### ✔ Option 1 — Quick Run (Recommended)
Run using VS Code Live Server:

1. Open the project folder in VS Code  
2. Install Live Server (if not installed)  
3. Right-click `index.html` → **Open with Live Server**

Done 🚀

---

### ✔ Option 2 — Run with any local HTTP server  
If you prefer not to use Live Server:

#### Using Python (built-in)
```bash
cd project-folder
python -m http.server 8000
```
Now open:
👉 http://localhost:8000/index.html

🔧 Enabling Firebase (Optional)

Firebase is not required for the demo, but you can enable it later.

Steps:

Create Firebase Project

Enable Firebase Auth (Email/Password)

(Optional) Enable Realtime Database

Copy your Firebase config into:
```
js/firebaseInit.js
```

Set database rules accordingly if enabling sync

🧪 How to Use
👨‍🎓 For Students:

Open the site

Click Register

Fill your details

Your UID will be auto-generated

Go to Dashboard & submit complaints

View your complaint history anytime

🛠 For Admin:

Open admin.html

Login with admin credentials

If local admin flag not set:

Press F12 → Console → run:
```
localStorage.setItem('cc_admin_'+auth.currentUser.uid,'true');
```

Admin panel will unlock

Now you can:

View all complaints

Resolve

Delete

Import/export complaints

🖼 Screenshots (Optional — Add your images)
Login Page

Dashboard

Admin Panel

(Replace with actual images from your repo)

🧩 Future Improvements

Full Firebase cloud sync

Cloud Functions for UID generation

Admin role management

Department-wise routing

File upload with Cloud Storage

Push notifications for complaint updates

📝 License

This project is created as a Mini Project / Academic Submission.
Free to use for educational purposes.

⭐ Acknowledgements

Made by CampusConnect Team

