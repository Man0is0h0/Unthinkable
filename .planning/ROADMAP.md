# Project Roadmap: Healthcare Appointment Manager

## Phase 1: Foundation (Day 1)
**Goal:** Initialize project infrastructure, database schema, and authentication.

### Deliverables
- [ ] Next.js (Frontend) and FastAPI (Backend) scaffolded
- [ ] PostgreSQL Database Configured
- [ ] SQLAlchemy Models Created (User, Doctor, Patient, Appointment)
- [ ] JWT Authentication & Role-Based Access Control implemented
- [ ] Core CRUD APIs for Admin and Doctor profiles

## Phase 2: Booking Engine & Integrations (Day 2)
**Goal:** Implement the complex booking logic, AI features, and external integrations.

### Deliverables
- [ ] Slot Generation based on working hours
- [ ] Transactional Booking Engine with Row Locks
- [ ] Doctor Leave management & Appointment Cancellations
- [ ] Gemini API integration for pre/post visit summaries
- [ ] Email Notifications (SendGrid/SMTP)
- [ ] Google Calendar API sync
- [ ] Background Reminders Job (APScheduler)

## Phase 3: Frontend Delivery (Day 3)
**Goal:** Build out the user interfaces and deploy the application.

### Deliverables
- [ ] Patient Dashboard (Booking, History, Profile)
- [ ] Doctor Dashboard (Today's Patients, AI Summary, Notes)
- [ ] Admin Dashboard (Manage Doctors, Leave)
- [ ] Integration of UI with Backend APIs
- [ ] Basic E2E Testing
- [ ] Deployment (Render, Vercel, Neon DB)
