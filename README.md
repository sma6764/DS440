# Check-me-up 🏥
An AI-powered healthcare appointment booking platform built as a capstone project for DS440 (Group 12).
 
---
 
## What is Check-me-up?
 
Check-me-up is a web-based platform that makes booking a medical appointment actually simple. Instead of calling during office hours or navigating a confusing system, patients can describe their symptoms in plain language, get an AI-powered specialist recommendation, and book an appointment online — all in one place.
 
The platform supports multiple clinic branches, shows insurance coverage and pricing before booking, and gives doctors and admins their own dashboards to manage everything on their end.
 
---
 
## Features
 
- **AI Symptom Checker** — patients describe symptoms and get a specialist recommendation before booking
- **Online Appointment Booking** — full end-to-end booking with no phone calls required
- **Insurance Transparency** — patients see coverage percentage and estimated cost before confirming
- **Multi-Branch Support** — works across multiple clinic locations
- **Doctor Dashboard** — doctors can view and manage their appointments and patient notes
- **Admin Panel** — admins manage doctors, branches, and bookings for their assigned branch
- **Contact Form** — patients can send messages directly through the platform
- **Email Notifications** — confirmation and cancellation emails sent automatically
 
---

## Database Tables
 
| Table | Description |
|-------|-------------|
| `users` | Stores all users — patients, doctors, and admins (role-based) |
| `doctors` | Doctor profiles linked to users, specialists, and branches |
| `specialists` | Medical specialties (e.g. Cardiology, Dermatology) |
| `branches` | Clinic branch locations |
| `appointments` | Booking records linking patients, doctors, and branches |
| `insurance_coverage` | Coverage percentages per insurance company per specialist |
| `contact_messages` | Messages submitted through the contact form |
 
---

## Team
 
| Name | Role |
|------|------|
| Sara Almansoori | Frontend Development, UI Design, Documentation |
| Suheil Alzaabi | Backend Development, Database, API Integration |
 
DS440 — Capstone Project | Group 12
 
---

## Getting Started — Run Locally

### Requirements

- [XAMPP](https://www.apachefriends.org/download.html) — includes Apache, PHP, and MySQL

---

### Step 1 — Install XAMPP

1. Download and install XAMPP from https://www.apachefriends.org/download.html
2. Open the **XAMPP Control Panel**
3. Start **Apache** and **MySQL**

---

### Step 2 — Clone the Repository OR download the zip file

```bash
git clone https://github.com/YOUR_USERNAME/checkmeup.git
```

Move the cloned folder (or zipped folder) into your XAMPP `htdocs` directory:

- **Windows:** `C:\xampp\htdocs\checkmeup`
- **Mac:** `/Applications/XAMPP/htdocs/checkmeup`

---

### Step 3 — Set Up the Database

1. Open your browser and go to `http://localhost/phpmyadmin`
2. Click **New** on the left sidebar
3. Create a database named `checkmeup`
4. Select the `checkmeup` database
5. Click the **Import** tab
6. Click **Choose File** and select `checkmeup.sql` from the `backend/config`
7. Click **Go**

The database will be created with all tables and seed data.

---

### Step 4 — run xampp and open local web
1. Search for xampp and open application
2. enable the apache server and database
3. once on, in your browser open http://localhost/check-me-up/frontend/
