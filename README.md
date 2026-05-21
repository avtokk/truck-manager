# 🚛 Truck Manager

სატვირთოების მართვის სისტემა — Dashboard / Permits / Update

---

## 🛠 გაშვება (ნაბიჯ-ნაბიჯ)

### ნაბიჯი 1 — Firebase პროექტის შექმნა

1. გახსენი [https://console.firebase.google.com](https://console.firebase.google.com)
2. დააჭირე **"Add project"** → სახელი (მაგ: `truck-manager`)
3. Google Analytics — არ არის სავალდებულო
4. **Firestore Database** → Build → Firestore Database → Create → **Start in test mode**
5. **Storage** → Build → Storage → Get started → **Start in test mode**
6. **Project Settings** → Your apps → `</>` (Web app) → Register app → დაკოპირე `firebaseConfig`

---

### ნაბიჯი 2 — Firebase config-ის შევსება

გახსენი ფაილი `src/firebase.js` და ჩაანაცვლე:

```js
const firebaseConfig = {
  apiKey: "...",           // შენი
  authDomain: "...",       // შენი
  projectId: "...",        // შენი
  storageBucket: "...",    // შენი
  messagingSenderId: "...",// შენი
  appId: "..."             // შენი
};
```

---

### ნაბიჯი 3 — GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/truck-manager.git
git push -u origin main
```

---

### ნაბიჯი 4 — Firebase Hosting setup

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# public dir: dist
# SPA: Yes
# GitHub deploy: Yes (optional)
```

---

### ნაბიჯი 5 — GitHub Actions (ავტო-deploy)

GitHub repo → Settings → Secrets and variables → Actions → New secret:

| Secret | მნიშვნელობა |
|--------|-------------|
| `FIREBASE_PROJECT_ID` | შენი Firebase Project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase → Project Settings → Service Accounts → Generate new private key (JSON-ის მთელი შინაარსი) |

---

### ნაბიჯი 6 — ლოკალური გაშვება (ტესტისთვის)

```bash
npm install
npm run dev
```

გახსნის: `http://localhost:5173`

---

### ნაბიჯი 7 — Deploy

```bash
npm run build
firebase deploy
```

ან უბრალოდ გააკეთე `git push` — GitHub Actions ავტომატურად deploy-ს გააკეთებს.

---

## 📱 მობილური

საიტი სრულად ადაპტირებულია მობილურისთვის. iOS Safari და Android Chrome-ზე მუშაობს.

---

## 🔔 ნოტიფიკაციები

Firebase Firestore-ის `onSnapshot`-ის გამო, ყველა ღია ბრაუზერის ჩანართზე (კომპიუტერი + მობილური) ნოტიფიკაცია გამოჩნდება რეალურ დროში, ცვლილებიდან 1 წამის განმავლობაში.

---

## 📂 სტრუქტურა

```
src/
  firebase.js          # Firebase config
  App.jsx              # Navigation + notification system
  pages/
    HomePage.jsx       # მთავარი ცხრილი
    PermitsPage.jsx    # ნებართვები
    UpdatePage.jsx     # გეგმები
```

---

## ⚠️ Firebase-ის გარეშე

თუ Firebase არ არის კონფიგურირებული, საიტი მუშაობს **ლოკალური localStorage-ით**. მაგრამ მაშინ რეალური სინქრონიზაცია სხვა მომხმარებლებთან არ იმუშავებს.
