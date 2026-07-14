from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.future import select
from sqlalchemy import and_
from datetime import datetime, timedelta

from ..database import AsyncSessionLocal
from ..models import Appointment, AppointmentStatus, Patient, User
from ..services.email_service import send_email

scheduler = AsyncIOScheduler()

async def send_appointment_reminders():
    """
    Finds appointments that are coming up exactly tomorrow and sends an email reminder.
    """
    print("Running background job: send_appointment_reminders")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    async with AsyncSessionLocal() as session:
        from ..models import Doctor
        from sqlalchemy.orm import aliased
        
        PatUser = aliased(User)
        DocUser = aliased(User)
        
        query = await session.execute(
            select(Appointment, PatUser.email, PatUser.name, DocUser.email, DocUser.name)
            .join(Patient, Patient.id == Appointment.patient_id)
            .join(PatUser, PatUser.id == Patient.user_id)
            .join(Doctor, Doctor.id == Appointment.doctor_id)
            .join(DocUser, DocUser.id == Doctor.user_id)
            .where(
                and_(
                    Appointment.date == tomorrow,
                    Appointment.status == AppointmentStatus.scheduled
                )
            )
        )
        upcoming_appointments = query.all()
        
        for appt, pat_email, pat_name, doc_email, doc_name in upcoming_appointments:
            # Send to Patient
            subject = "Reminder: Your Appointment is Tomorrow"
            body = f"<h2>Hello {pat_name}!</h2><p>This is a reminder that you have an appointment booked for tomorrow ({tomorrow}) at {appt.start_time} with Dr. {doc_name}.</p>"
            await send_email(to_email=pat_email, subject=subject, body=body)
            
            # Send to Doctor
            doc_subject = "Reminder: Upcoming Appointment Tomorrow"
            doc_body = f"<h2>Hello Dr. {doc_name}!</h2><p>This is a reminder that you have an appointment booked for tomorrow ({tomorrow}) at {appt.start_time} with patient {pat_name}.</p>"
            await send_email(to_email=doc_email, subject=doc_subject, body=doc_body)

async def send_medication_reminders():
    """
    Finds active prescriptions and sends reminders at 8 AM and 8 PM.
    """
    print("Running background job: send_medication_reminders")
    now = datetime.now()
    
    async with AsyncSessionLocal() as session:
        from ..models import Prescription
        query = await session.execute(
            select(Prescription, User.email, User.name)
            .join(Appointment, Appointment.id == Prescription.appointment_id)
            .join(Patient, Patient.id == Appointment.patient_id)
            .join(User, User.id == Patient.user_id)
        )
        prescriptions_data = query.all()
        
        for prescription, pat_email, pat_name in prescriptions_data:
            # Check if active
            # SQLite created_at might not have tzinfo if we didn't specify, but let's be safe.
            created_dt = prescription.created_at
            if created_dt.tzinfo:
                created_dt = created_dt.replace(tzinfo=None)
                
            end_date = created_dt + timedelta(days=prescription.duration_days)
            if now > end_date:
                continue
                
            # Check frequency matches current hour
            should_send = False
            if now.hour == 8 and prescription.frequency in ["Morning", "Twice Daily"]:
                should_send = True
            elif now.hour == 20 and prescription.frequency in ["Night", "Twice Daily"]:
                should_send = True
                
            if should_send:
                subject = f"Medication Reminder: {prescription.medication_name}"
                body = f"<h2>Hello {pat_name}!</h2><p>This is a reminder to take your medication: <b>{prescription.medication_name}</b>.</p><p>Dosage: {prescription.dosage}</p><p>Stay healthy!</p>"
                
                await send_email(to_email=pat_email, subject=subject, body=body)

def start_scheduler():
    """Start the APScheduler for background jobs"""
    # Run every day at 8:00 AM
    scheduler.add_job(
        send_appointment_reminders,
        trigger=CronTrigger(hour=8, minute=0),
        id="daily_appointment_reminders",
        replace_existing=True
    )
    
    # Run at 8:00 AM and 8:00 PM for medications
    scheduler.add_job(
        send_medication_reminders,
        trigger=CronTrigger(hour='8,20', minute=0),
        id="medication_reminders",
        replace_existing=True
    )
    
    scheduler.start()
