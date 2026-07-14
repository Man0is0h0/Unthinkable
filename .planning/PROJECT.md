# Healthcare Appointment Manager

## Mission
Build a robust, scalable, and modern healthcare appointment management system with AI capabilities, automated notifications, and calendar integrations, delivered within a compressed 3-day timeline.

## Context
The system serves three primary roles: Patients, Doctors, and Admins. It requires robust mechanisms to prevent double booking (using transactional row locks) and features advanced AI integrations (via Gemini) for pre-visit and post-visit summaries.

## Core Features
- Role-based Access Control (Patient, Doctor, Admin)
- Dynamic Slot Generation & Booking Engine
- Double Booking Prevention (Row Locks)
- Gemini AI Pre-visit Symptom Analysis
- Gemini AI Post-visit Summary Translation
- Email Notifications (SendGrid/SMTP)
- Google Calendar Event Sync
- Background Reminder Jobs (APScheduler/Celery)

## Target Audience
Patients needing to book appointments and receive reminders. Doctors managing their schedules, reviewing AI summaries, and writing notes. Admins managing doctor availability and system configuration.

## Technology Stack
- **Frontend**: Next.js (React), Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Neon) via SQLAlchemy
- **Authentication**: JWT
- **AI**: Gemini API
- **Infrastructure**: Vercel (Frontend), Render (Backend), Docker
