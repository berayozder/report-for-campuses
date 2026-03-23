# 🚨 Campus Hazard Reporting System (YGA)

> A web application that lets students quickly report hazards they spot on campus (broken outlets, cracked glass, slippery floors, etc.) by snapping a photo and sharing their location.

🌐 **Live Demo:** [app-yga.vercel.app](https://app-yga.vercel.app)

---

## 🎓 Evaluator Guide (Testing Roles)

To make grading simple and frictionless, a **"Demo Mode"** is built directly into the live app:

1. **Log in** to the live demo using any Google account.
2. In the top right corner (next to notifications), look for the special Grader Demo button: **<span class="material-icons-round" style="font-size:16px;vertical-align:middle;">build_circle</span>**.
3. **Click it** to instantly escalate your privileges to **Admin** for your current session.
4. You will immediately see the Admin Panel icon appear, and the "My Assignments" tab will become available, allowing you to fully test role-based features without waiting for database approval!

---

## 🎯 Core Functionalities

- 📸 **Photo Reporting:** Take a photo of the hazard or upload from your gallery.
- 📍 **Auto Location:** Uses GPS to pinpoint the hazard and auto-fills the reading address.
- 👥 **Role-Based Access:** 
  - **Users:** Create reports, view the Leaderboard, and upvote hazards.
  - **Repairmen:** Have a dedicated "My Assignments" tab to manage tasks assigned to them.
  - **Admins:** Access the Admin Dashboard to manage users, assign repairmen, and update/delete reports.
- 🔐 **Authentication:** Secure Google Sign-In.

---

## ⚡ Quick Start (Local Development)

```bash
git clone https://github.com/berayozder/report-for-campuses.git
cd report-for-campuses
npm install
npm run dev
```
*(Note: The app works out-of-the-box using `localStorage` as a database fallback if you don't connect Firebase).*

---

## ⭐ Additional Features (Added Later to Improve the App)

These features were added subsequently to significantly improve user experience and application quality:

- 📱 **PWA (Installable):** Can be installed directly to the phone's home screen.
- 🌍 **Multilingual:** Full Turkish and English language support.
- 🔍 **Smart Duplicate Detection:** Alerts users if a similar hazard was already reported within 500 meters.
- 🏆 **Gamification & Leaderboard:** Point system and earned badges for active reporters to encourage participation.
- 🏅 **Hall of Fame:** A dedicated public view for successfully resolved hazards to build community trust.
- 📈 **Upvoting System:** "Me Too" button to collaboratively escalate high-priority issues.
- ♿ **Accessibility Focus:** A dedicated hazard category specifically for accessibility barriers (e.g., broken ramps).

---

## 🏗️ Tech Stack

- **Frontend:** Vite & Vanilla JavaScript (No Framework)
- **Backend/DB:** Firebase (Firestore Database, Cloud Storage, Authentication)
- **Location:** Nominatim API (Reverse Geocoding)
