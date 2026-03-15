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
