<div align="center">
  <h1>🏨 Innsphere CRM & PMS</h1>
  <p>A modern, responsive Property Management System (PMS) and Customer Relationship Management (CRM) platform designed for boutique guest houses, inns, and small hotels.</p>
</div>

---

## 📖 Executive Summary

**Innsphere** is a full-stack web application built to streamline the end-to-end operations of a boutique inn. Moving away from fragmented systems, Innsphere provides a single, unified interface that adapts dynamically based on the user's role. 

Operating on a strict **Role-Based Access Control (RBAC)** architecture, the system provides three distinct, tailored experiences:
1. **Clients (Guests):** Self-service booking, reservation management, and preference tracking.
2. **Staff (Innkeepers):** Operational tools including live metrics, visual room scheduling, and CRM capabilities.
3. **Admins (System Managers):** High-level oversight, staff access control, and global system configuration.

Whether guests are booking their next getaway or staff are managing room allocations on a live calendar timeline, Innsphere provides a seamless, premium, and lightning-fast interface powered by Next.js and Firebase.

---

## 🏗️ Application Architecture

Innsphere utilizes a **Unified Sidebar Layout** to ensure a consistent mental model across all roles. When a user logs in, the application evaluates their role and dynamically renders the appropriate navigation menu on the sidebar, loading specific modules into the main content area.

### Tech Stack
* **Frontend Framework:** Next.js (React 19, App Router)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Animations & Transitions:** Motion (Framer Motion)
* **Backend & Database:** Firebase (Authentication & Firestore)
* **Date Manipulation:** date-fns

---

## ✨ Detailed Feature Breakdown

### 1. 🛡️ Admin Control Center (Super-Users)
*The highest level of access, reserved for system administrators and hotel owners.*
* **Authentication Override:** Hardcoded logic ensures that specific emails (e.g., `jegbase@gmail.com`) are automatically intercepted and assigned the `admin` role upon login or registration, bypassing standard client/staff flows.
* **Global Metrics Dashboard:** A bird's-eye view of aggregate revenue, total system bookings, and active user metrics across the entire platform.
* **Staff Management:** Administrators can view registered staff accounts, revoke access, and configure the secret passcode required for new staff registration.
* **System Configuration & Health:** Dedicated modules to monitor Firestore read/write operations, configure dynamic room availability, room types, and adjust base nightly rates or tax percentages.

### 2. 🛎️ Staff Cockpit (Innkeepers & Management)
*The operational hub for front-desk staff and innkeepers to manage day-to-end tasks.*
* **Live Cockpit Dashboard:** A real-time metrics bar displaying:
  * *Total Bookings:* Historical and future reservation count.
  * *Active Guests:* Number of guests currently marked as "Checked In".
  * *Occupancy Rate:* A percentage calculating currently occupied rooms against total capacity.
  * *Projected Revenue:* Sum of all bookings tied to the operator.
* **Visual Room Timeline:** A robust 14-day rolling Gantt-chart style calendar. Rooms are mapped on the Y-axis and dates on the X-axis. Reservations are rendered as absolutely positioned, color-coded blocks spanning their respective dates. Clicking a reservation block instantly opens that guest's deep-dive CRM profile.
* **Guest Registry (CRM):** A searchable, alphabetical database of all past, active, and future guests. Staff can perform CRUD operations to manually add walk-in guests or update contact information.
* **Booking Management:** Within a guest's profile, staff can view chronological reservation logs and update statuses with single-click actions (e.g., transitioning a booking from `Confirmed` to `Checked In`, or checking a guest out).

### 3. 🏖️ Client Portal (Guests)
*A sleek, self-service portal for registered guests to manage their relationship with the inn.*
* **Booking Engine:** A seamless interface allowing guests to select check-in and check-out dates, pick an available room from a visual grid, and immediately see a dynamically calculated invoice (factoring in the nightly rate, duration of stay, and tourism taxes).
* **Reservation History:** A chronological ledger of the guest's upcoming and past stays. Status badges (Confirmed, Checked In, Checked Out, Cancelled) provide instant context. Guests have the autonomy to cancel upcoming unfulfilled reservations.
* **Preference Center:** Guests can save permanent notes (e.g., "Allergic to down pillows", "Prefer high floors"). These preferences automatically sync to the Staff CRM, ensuring innkeepers can customize the guest's experience before arrival.

### 4. 🛝 Local Sandbox Mode (Zero-Config Testing)
To facilitate easy testing, UI development, and rapid demos, Innsphere includes a completely disconnected **Sandbox Mode**. 
* **Bypass Auth:** Clicking **"Demo Staff"** or **"Demo Client"** on the login screen bypasses Firebase Authentication entirely.
* **Local Data Seeding:** The app seeds the browser's `localStorage` with mock guests (e.g., "John Doe", "Marcus Aurelius") and dummy reservations.
* **Event-Driven Reactivity:** Custom DOM event listeners (`window.dispatchEvent`) are used to simulate Firestore's real-time `onSnapshot` behavior, ensuring the UI updates instantly when local data changes.

---

## 🗄️ Database Architecture (Firestore)

The application uses Firebase Firestore, optimized with NoSQL principles for fast reads and real-time updates.

1. **`users` Collection:** Manages RBAC. Documents contain the user's UID, email, and their active `role` (`"admin" | "staff" | "client"`).
2. **`guests` Collection:** The core CRM profiles. Contains contact details, personal preferences/notes, and an `ownerId` to map the profile to the staff member who created it (or the guest themselves).
3. **`bookings` Collection:** The reservation ledger. Maps guest IDs to specific rooms, dates (`checkIn`, `checkOut`), prices, and states (`status`).
4. **`settings` Collection:** *(Future Implementation)* Will house global configurations like active room lists and pricing overrides.

### 🔒 Security Rules
Security is strictly enforced via `firestore.rules`. Comprehensive schema validation functions (e.g., `isValidGuest`, `isValidBooking`) ensure data integrity, verify correct data types, and check relational integrity (ensuring a booking cannot be made for a non-existent guest) before any write is accepted by the database.

---

## 🚀 Getting Started (Running Locally)

### Prerequisites
* Node.js (v18 or higher)
* A Firebase Project (Required if you wish to run connected to a live database)

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install