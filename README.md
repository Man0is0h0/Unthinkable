# Unthinkable Health

I built Unthinkable Health to be a modern, AI-powered healthcare scheduling and consultation platform. My goal was to connect patients with doctors, streamline appointment booking, and leverage AI (specifically the Groq API) to extract vital clinical summaries from raw patient symptoms before the doctor even begins the checkup.

For the stack, I went with a **Next.js (React)** frontend and a **FastAPI (Python)** backend, all powered by a **Neon Serverless Postgres** database.

---

## 1. Local Setup Guide

If you want to run this locally, here is how I set it up:

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL database (I recommend spinning up a free Neon Postgres instance)
- API Keys for Groq (for the LLM features) and Brevo (for transactional emails)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:3000`.

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
The backend API runs on `http://localhost:8000`. You can view the auto-generated Swagger UI docs I set up at `http://localhost:8000/docs`.

---

## 2. API Documentation

I organized the API into several modular routes. Here is a quick overview of what I built:

### Authentication (`/api/auth`)
- `POST /register`: Registers a new patient or doctor.
- `POST /login`: Authenticates the user and sets an HttpOnly JWT cookie for security.
- `POST /logout`: Clears the session.

### Profiles (`/api/profile`)
- `GET /me`: Fetches the current authenticated user's details and role.

### Bookings & Appointments (`/api/appointments`)
- `GET /slots/{doctor_id}`: Dynamically generates available 30-min slots for a given date.
- `POST /book`: Books a new appointment, triggers the AI symptom analysis, and dispatches the email confirmation.
- `GET /`: Lists all appointments for the logged-in user.
- `POST /{id}/complete`: Completes a checkup, saves the prescription, and triggers the AI to generate a patient-friendly summary.
- `POST /{id}/reschedule-tomorrow`: Reschedules a missed appointment.
- `POST /{id}/cancel`: Cancels an upcoming appointment.
- `POST /leave`: Allows doctors to mark days they are unavailable.

---

## 3. Database Schema

I designed the database using PostgreSQL and mapped it out with the SQLAlchemy ORM.

### Key Tables
1. **users**: The base table for authentication.
   - `id`, `name`, `email`, `hashed_password`, `role` (patient, doctor, admin)
2. **patients**: Links back to `users`.
   - `id`, `user_id`, `date_of_birth`, `phone`, `blood_group`
3. **doctors**: Links back to `users`.
   - `id`, `user_id`, `specialty`, `qualifications`, `experience_years`, `availability_schedule`
4. **appointments**: The core table tracking visits.
   - `id`, `patient_id`, `doctor_id`, `date`, `start_time`, `end_time`, `status`, `symptoms`, `urgency`
   - `pre_visit_summary`: The AI-generated clinical summary I built for the doctor.
   - `post_visit_summary`: The AI-translated friendly summary I built for the patient.
   - `doctor_notes`: The raw medical notes.
5. **prescriptions**: Tracks medications issued during an appointment.
   - `id`, `appointment_id`, `medication_name`, `dosage`, `frequency`, `duration_days`
6. **doctor_leaves**: Tracks the days doctors are unavailable.
   - `id`, `doctor_id`, `date`, `reason`

---

## 4. LLM Prompts & AI Integration

To make the AI features as fast as possible, I used the **Groq API** (running `llama3-8b-8192`). 

### Pre-Visit Triage (For Doctors)
When a patient books an appointment, they describe their symptoms in plain text. I wrote this prompt to have the LLM act as a triage assistant:
> *"You are a medical triage assistant. Analyze the following patient symptoms. Extract the 'Chief Complaint', determine the 'Urgency' (Low, Medium, High), and suggest 3 relevant follow-up questions for the doctor to ask. Format as JSON."*

### Post-Visit Translation (For Patients)
After the doctor writes raw clinical notes (e.g., "Dx: Viral pharyngitis, DDx: Strep. Tx: supportive"), I use the LLM to translate it into plain English for the patient dashboard so they actually understand what the doctor wrote:
> *"You are a friendly, empathetic medical assistant. Translate the following doctor's clinical notes into a simple, reassuring summary that the patient can easily understand without medical jargon."*

---

## 5. Google Calendar Setup Steps

I wanted to make sure appointments automatically synced to the users' native calendar apps (like Google Calendar). Instead of dealing with complex OAuth2 flows, I built a much cleaner solution.

**How I built the calendar integration:**
1. When an appointment is booked, the backend generates an `.ics` (iCalendar) file on the fly using the `ics` Python library.
2. I then attach this `.ics` file to the confirmation email and dispatch it via the **Brevo API**.
3. **Google Calendar Magic:** When the patient opens the email in Gmail, Google automatically parses the attached `invite.ics` file and displays a rich "Add to Calendar" button at the top of the email. Clicking it syncs the appointment natively to their Google Calendar instantly!

---

## 6. Environment Configuration

If you're deploying this, just copy the `.env.example` file to `.env` in the `backend/` directory and fill in your keys.
