# **Innsphere CRM & PMS: Master Architectural Blueprint & Product Specification**

## **1\. Executive Summary**

**Innsphere** is a modern, responsive Property Management System (PMS) and Customer Relationship Management (CRM) platform designed for boutique guest houses, inns, and small hotels. The application operates on a strict **Role-Based Access Control (RBAC)** architecture, providing distinct, tailored experiences for **Clients (Guests)**, **Staff (Innkeepers)**, and **Admins (System Managers)**.

### **1.1 Tech Stack**

* **Framework:** Next.js (React 19, App Router)  
* **Styling:** Tailwind CSS  
* **Icons:** Lucide React  
* **Animations:** Motion (Framer Motion)  
* **Backend as a Service (BaaS):** Firebase (Auth, Firestore)

## **2\. Global UI Structure & Wireframes**

The application utilizes a unified layout for authenticated users to ensure code reusability and a consistent mental model across all roles.

### **2.1 Unified Layout Wireframe**

\+-------------------------------------------------------------------------+  
|                                                                         |  
|  \+-----------------+  \+----------------------------------------------+  |  
|  |                 |  | TOP HEADER                                   |  |  
|  | \[Logo\] Innsphere|  | \[Breadcrumbs\]          \[Notifications\] \[User\]|  |  
|  |                 |  \+----------------------------------------------+  |  
|  | MENU            |  |                                              |  |  
|  | \- Item 1        |  |  MAIN CONTENT AREA                           |  |  
|  | \- Item 2        |  |  (Scrollable)                                |  |  
|  | \- Item 3        |  |                                              |  |  
|  |                 |  |  \+----------------------------------------+  |  |  
|  |                 |  |  |                                        |  |  |  
|  |                 |  |  |    Active View Component Rendered      |  |  |  
|  |                 |  |  |    Based on Sidebar Selection          |  |  |  
|  | \[Profile Snippet|  |  |                                        |  |  |  
|  | \[Sign Out\]      |  |  \+----------------------------------------+  |  |  
|  \+-----------------+  \+----------------------------------------------+  |  
|                                                                         |  
\+-------------------------------------------------------------------------+

### **2.2 Navigation Mapping by Role**

The Sidebar component dynamically renders menu items based on the authenticated user's role:

* **Admin (role: "admin"):**  
  1. Admin Center (Dashboard)  
  2. Staff Management (Add/Revoke staff access)  
  3. System Settings (Configure dynamic rooms, pricing, taxes)  
* **Staff (role: "staff"):**  
  1. Cockpit Dashboard (Metrics & Quick Actions)  
  2. Room Timeline (Visual Calendar Scheduler)  
  3. Guest Registry (CRM Profiles & History)  
* **Client (role: "client"):**  
  1. Reserve Room (Booking Engine)  
  2. My Bookings (History & Active Stays)  
  3. Preferences (User Profile & Special Notes)

## **3\. Database Schematics (Firestore)**

The database follows a NoSQL document structure optimized for fast reads and real-time listeners (onSnapshot).

### **3.1 users Collection**

Tracks core application access and RBAC.

* uid (string, PK) \- Firebase Auth UID  
* email (string)  
* role (enum: "admin", "staff", "client")  
* createdAt / updatedAt (timestamp)

### **3.2 guests Collection (CRM Profiles)**

Extended profile data for guests. Note: Clients automatically get a document here upon registration.

* id (string, PK) \- Matches User UID (if self-registered) or auto-gen (if staff-created)  
* name (string)  
* email (string)  
* phone (string)  
* notes (string) \- Dietary restrictions, room preferences  
* ownerId (string) \- UID of the creator (Staff or Self)  
* createdAt / updatedAt (timestamp)

### **3.3 bookings Collection**

Transaction and scheduling records.

* id (string, PK)  
* guestId (string, FK \-\> guests.id)  
* guestName (string) \- Denormalized for fast timeline rendering  
* roomNumber (string)  
* checkIn (string, YYYY-MM-DD)  
* checkOut (string, YYYY-MM-DD)  
* status (enum: "confirmed", "checked\_in", "checked\_out", "cancelled")  
* totalAmount (number)  
* notes (string) \- Specific to this reservation  
* ownerId (string)  
* createdAt / updatedAt (timestamp)

### **3.4 settings Collection (Planned)**

Global application settings managed by Admins.

* Document: "inn\_config"  
  * rooms (array of objects: { number: "101", price: 150, type: "Suite" })  
  * taxRate (number)  
  * staffPasscodes (array of strings)

## **4\. User Workflows**

### **4.1 Authentication Workflow**

1. User lands on / (Login Screen).  
2. User chooses **Sign In** or **Create Account**.  
3. *If creating an account:*  
   * User selects role: "Client" or "Staff".  
   * If "Staff", user must enter a valid secret passcode (e.g., STAFF123).  
4. **Admin Override:** If the email entered is exactly jegbase@gmail.com (with password Admins), the system intercepts the process and forcefully assigns role: "admin".  
5. System routes user to the Unified Sidebar Layout and sets the activeView based on their role.

### **4.2 Client Booking Workflow**

1. Client selects "Reserve Room".  
2. Client picks dates (Check-in / Check-out). Validation ensures Check-out \> Check-in and Check-in \>= Today.  
3. System calculates total stay price dynamically.  
4. Client adds special requests and clicks "Confirm".  
5. Document written to bookings. State transitions to "My Bookings" tab showing a success animation.

### **4.3 Staff Operations Workflow (Check-in)**

1. Staff opens "Room Timeline".  
2. Staff clicks on a booking block for today.  
3. System opens the Guest Profile associated with that booking.  
4. Staff clicks "Check In". Booking status changes from confirmed to checked\_in.  
5. Timeline block color changes (e.g., Blue to Amber). Dashboard "Active Guests" metric increments by 1\.

## **5\. Detailed Features & Functions by Role**

### **5.1 Admin Center (role: "admin")**

**Visibility:** Restricted to Super Admins.

* **Global Metrics Dashboard:** Aggregated data of all revenue, bookings, and active users across the platform.  
* **Staff Access Management:** View all accounts with role: "staff". Ability to revoke access or reset the global staff registration passcode.  
* **Inn Configuration:** A UI to add/remove rooms and update base nightly rates. This overrides the hardcoded ROOMS array, pulling dynamically from the settings Firestore collection.

### **5.2 Staff Cockpit (role: "staff")**

**Visibility:** Innkeepers, Receptionists, Managers.

* **Live Dashboard:** 4 key metric cards: Total Bookings, Active Guests (Checked-in), Occupancy Rate (%), Projected Revenue.  
* **Calendar Timeline:** A 14-day rolling Gantt-chart style timeline. Rooms on the Y-axis, Dates on the X-axis. Absolute positioning is used to span booking blocks across days. Clicking a block loads the CRM profile.  
* **Guest Registry:** A searchable, alphabetical list of all past and future guests. Features CRUD operations to manually add walk-in guests or update phone numbers/emails.  
* **Guest Profile Deep-Dive:** Displays contact info, permanent preferences, and a historical log of all their reservations. Allows staff to change booking statuses (Cancel, Check-in, Check-out).

### **5.3 Client Portal (role: "client")**

**Visibility:** Registered Guests.

* **Welcome Dashboard:** Personalized greeting fetching the user's display name.  
* **Booking Engine:** A clean, 2-column layout. Left side: Room selection and date inputs. Right side: Sticky invoice breakdown showing room rate, taxes, and total.  
* **My Bookings:** A chronological list of upcoming and past stays. Allows the client to cancel an upcoming "confirmed" booking. Displays status badges.  
* **Preferences Center:** Allows guests to update their permanent notes (e.g., "I am allergic to down pillows"), which syncs directly to the Staff CRM view.

## **6\. Design System & UI Elements**

### **6.1 Color Palette (Tailwind)**

* **Primary Brand:** Indigo (bg-indigo-600, text-indigo-600) \- Used for primary buttons, active states, and highlights.  
* **Backgrounds:** Slate (bg-slate-50 for app background, bg-white for cards).  
* **Sidebar:** Dark Slate (bg-slate-900) for high contrast and premium administrative feel.  
* **Status Colors:**  
  * Confirmed: Blue (bg-blue-500)  
  * Checked In: Amber (bg-amber-500)  
  * Checked Out: Emerald (bg-emerald-500)  
  * Cancelled/Error: Rose/Red (bg-rose-500, text-red-500)

### **6.2 Typography**

* **Sans-serif:** Inter (used for all UI text, forms, lists).  
* **Display:** Space Grotesk (used for major headers, login screen branding).

### **6.3 Interaction & Animation (Framer Motion)**

* **Page Transitions:** Fade in and slide up (y: 10 to y: 0\) for smooth tab switching.  
* **Drawers/Accordions:** AnimatePresence used for expanding/collapsing the "Add Guest" and "Add Booking" forms (height: 0 to height: auto).  
* **Feedback:** Temporary toast notifications or inline banners (Success: Emerald, Error: Red) that automatically dismiss after 3 seconds.

## **7\. Operational Modes & Safeguards**

### **7.1 Local Sandbox Mode (Fallback & Demo)**

The application includes a robust "Sandbox Mode" ensuring it functions perfectly in iframe preview environments or when Firebase credentials are not supplied.

* **Trigger:** Clicking "Demo Staff" or "Demo Client" on the login screen bypasses Firebase Auth.  
* **Storage:** Uses the browser's localStorage (innsphere\_sandbox\_guests, innsphere\_sandbox\_bookings).  
* **Event Listeners:** Dispatches a custom window.dispatchEvent(new Event("innsphere\_local\_update")) to trigger React state updates across components when local storage is modified, simulating Firestore's onSnapshot real-time behavior.

### **7.2 Security Rules (Firestore)**

Data protection is enforced at the database level:

* **Isolation:** Staff can only read/write bookings and guests where ownerId \== request.auth.uid (In a multi-tenant setup).  
* **Validation:** Custom functions (isValidGuest, isValidBooking) strictly enforce data types, string lengths, and required fields before any write is accepted.  
* **Relational Integrity:** A booking cannot be created unless the associated guestId exists in the guests collection.

## **8\. Future Roadmap: AI Integrations**

While AI is not currently configured in the active application, future implementations are planned as the product matures:

1. **AI Communications:** A button in the Staff GuestProfile view that reads guest notes and past stays to auto-draft personalized welcome emails or text messages.  
2. **AI Concierge:** A floating chat widget in the ClientPortal where guests can ask policies/FAQ questions, answered by an AI model augmented with Inn policy data.  
3. **Smart Insights:** An AI widget in the AdminCenter that analyzes the bookings collection to suggest dynamic pricing adjustments based on upcoming low-occupancy periods.