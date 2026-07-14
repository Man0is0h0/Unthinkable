from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..services.booking_service import get_available_slots, book_appointment_transaction
from ..services.llm_service import analyze_symptoms, translate_doctor_notes
from fastapi import HTTPException, Query
from sqlalchemy.future import select
from typing import Optional
from ..models import Appointment, AppointmentStatus

router = APIRouter()

class BookingRequest(BaseModel):
    patient_id: int
    doctor_id: int
    date: str
    start_time: str
    symptoms: str = None

class AppointmentSchema(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    date: str
    start_time: str
    end_time: str
    status: str
    symptoms: Optional[str] = None
    urgency: Optional[str] = None
    pre_visit_summary: Optional[str] = None
    post_visit_summary: Optional[str] = None
    doctor_notes: Optional[str] = None
    patient_name: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/slots/{doctor_id}")
async def fetch_slots(doctor_id: int, date: str, db: AsyncSession = Depends(get_db)):
    slots = await get_available_slots(db, doctor_id, date)
    return {"available_slots": slots}

@router.post("/book", response_model=AppointmentSchema)
async def book_appointment(request: BookingRequest, db: AsyncSession = Depends(get_db)):
    appointment = await book_appointment_transaction(
        db=db,
        patient_id=request.patient_id,
        doctor_id=request.doctor_id,
        date_str=request.date,
        start_time=request.start_time
    )
    
    if request.symptoms:
        analysis = await analyze_symptoms(request.symptoms)
        appointment.symptoms = request.symptoms
        appointment.urgency = analysis.get("urgency")
        questions = analysis.get('questions', [])
        formatted_questions = "\n".join([f"- {q}" for q in questions])
        appointment.pre_visit_summary = f"**Chief Complaint:** {analysis.get('chief_complaint')}\n\n**Suggested Questions:**\n{formatted_questions}"
        
        await db.commit()
        await db.refresh(appointment)
        
    # Generate ICS and Send Email
    from ..models import Patient, User, Doctor
    from ..services.calendar_service import generate_ics_event
    from ..services.email_service import send_email
    import asyncio
    
    pat_res = await db.execute(
        select(User.email, User.name)
        .join(Patient, Patient.user_id == User.id)
        .where(Patient.id == request.patient_id)
    )
    pat_row = pat_res.first()
    
    doc_res = await db.execute(
        select(User.email, User.name)
        .join(Doctor, Doctor.user_id == User.id)
        .where(Doctor.id == request.doctor_id)
    )
    doc_row = doc_res.first()
    
    if pat_row:
        pat_email, pat_name = pat_row
        ics_data = generate_ics_event(
            appointment_id=appointment.id,
            date_str=appointment.date,
            start_time=appointment.start_time,
            end_time=appointment.end_time,
            summary="Medical Appointment",
            description=f"Your upcoming appointment with Unthinkable Health. Symptoms noted: {appointment.symptoms}"
        )
        # Send asynchronously so it doesn't block the API response
        asyncio.create_task(
            send_email(
                to_email=pat_email,
                subject="Your Appointment Confirmation & Calendar Invite",
                body=f"Hi {pat_name},\n\nYour appointment is confirmed for {appointment.date} at {appointment.start_time}.\nPlease find the attached calendar invite.\n\nBest,\nUnthinkable Health",
                ics_attachment=ics_data
            )
        )
        
        # Send to doctor
        if doc_row:
            doc_email, doc_name = doc_row
            asyncio.create_task(
                send_email(
                    to_email=doc_email,
                    subject="New Appointment Booked",
                    body=f"Hi Dr. {doc_name},\n\nA new appointment has been booked for you on {appointment.date} at {appointment.start_time} by patient {pat_name}.\nPlease find the attached calendar invite.\n\nBest,\nUnthinkable Health",
                    ics_attachment=ics_data
                )
            )
    
    return appointment

class PrescriptionData(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int

class CompleteRequest(BaseModel):
    doctor_notes: str
    prescriptions: List[PrescriptionData] = []

@router.get("/", response_model=List[AppointmentSchema])
async def list_appointments(
    doctor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    from ..models import Patient
    query = select(Appointment).options(selectinload(Appointment.patient).selectinload(Patient.user))
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if patient_id:
        query = query.where(Appointment.patient_id == patient_id)
        
    query = query.order_by(Appointment.date.desc(), Appointment.start_time.desc())
    result = await db.execute(query)
    appointments = result.scalars().all()
    for appt in appointments:
        if appt.patient and appt.patient.user:
            appt.patient_name = appt.patient.user.name
    return appointments

@router.get("/{appointment_id}", response_model=AppointmentSchema)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.post("/{appointment_id}/complete", response_model=AppointmentSchema)
async def complete_appointment(
    appointment_id: int,
    request: CompleteRequest,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    from ..models import Patient, Doctor

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(Patient.user),
            selectinload(Appointment.doctor).selectinload(Doctor.user)
        )
        .where(Appointment.id == appointment_id)
    )
    appointment = result.scalars().first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appointment.status = AppointmentStatus.completed
    appointment.doctor_notes = request.doctor_notes
    
    patient_name = appointment.patient.user.name if appointment.patient and appointment.patient.user else "Patient"
    doctor_name = appointment.doctor.user.name if appointment.doctor and appointment.doctor.user else "Medical Team"
    
    summary = await translate_doctor_notes(request.doctor_notes, patient_name, doctor_name)
    appointment.post_visit_summary = summary
    
    from ..models import Prescription
    for p in request.prescriptions:
        new_prescription = Prescription(
            appointment_id=appointment.id,
            medication_name=p.medication_name,
            dosage=p.dosage,
            frequency=p.frequency,
            duration_days=p.duration_days
        )
        db.add(new_prescription)
    
    await db.commit()
    await db.refresh(appointment)
    
    import asyncio
    from ..services.email_service import send_email
    
    if appointment.patient and appointment.patient.user and appointment.patient.user.email:
        patient_email = appointment.patient.user.email
        subject = f"Your Checkup Details - Unthinkable Health"
        
        body = f"Hello {patient_name},\n\n"
        body += "Your checkup has been completed. Here is the post-visit summary from your doctor:\n\n"
        body += f"{summary}\n\n"
        
        if request.prescriptions:
            body += "Prescriptions:\n"
            for p in request.prescriptions:
                body += f"- {p.medication_name}: {p.dosage}, {p.frequency} for {p.duration_days} days\n"
            body += "\n"
        
        body += "Thank you for using Unthinkable Health!\n"
        
        # Send email in background
        asyncio.create_task(send_email(patient_email, subject, body))
        
    return appointment

class LeaveRequest(BaseModel):
    doctor_id: int
    date: str
    reason: Optional[str] = None

@router.post("/leave", status_code=status.HTTP_201_CREATED)
async def mark_doctor_leave(request: LeaveRequest, db: AsyncSession = Depends(get_db)):
    from ..models import DoctorLeave, Appointment
    from sqlalchemy import and_
    
    # Check if leave already exists
    leave_query = await db.execute(
        select(DoctorLeave).where(
            and_(DoctorLeave.doctor_id == request.doctor_id, DoctorLeave.date == request.date)
        )
    )
    if leave_query.scalars().first():
        raise HTTPException(status_code=409, detail="Leave already marked for this date")
        
    # Check if there are appointments on this day that are not cancelled
    app_query = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == request.doctor_id, 
                Appointment.date == request.date,
                Appointment.status != AppointmentStatus.cancelled
            )
        )
    )
    if app_query.scalars().first():
        raise HTTPException(status_code=409, detail="Cannot mark leave. You have active appointments on this date. Please cancel them first.")
        
    new_leave = DoctorLeave(
        doctor_id=request.doctor_id,
        date=request.date,
        reason=request.reason
    )
    db.add(new_leave)
    await db.commit()
    return {"message": "Leave marked successfully"}

class RescheduleRequest(BaseModel):
    start_time: str

@router.post("/{appointment_id}/reschedule-tomorrow", response_model=AppointmentSchema)
async def reschedule_tomorrow(
    appointment_id: int, 
    request: RescheduleRequest,
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime, timedelta
    from sqlalchemy import and_
    
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalars().first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appointment.status != AppointmentStatus.scheduled:
        raise HTTPException(status_code=400, detail="Only scheduled appointments can be rescheduled")
        
    tomorrow_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    from ..models import Doctor
    
    async with db.begin_nested():
        # Lock the doctor record to serialize rescheduling attempts
        await db.execute(select(Doctor).with_for_update().where(Doctor.id == appointment.doctor_id))
        
        # Check if doctor has a booking at same time tomorrow
        conflict_query = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.doctor_id == appointment.doctor_id,
                    Appointment.date == tomorrow_date,
                    Appointment.start_time == request.start_time,
                    Appointment.status != AppointmentStatus.cancelled
                )
            )
        )
        if conflict_query.scalars().first():
            raise HTTPException(status_code=409, detail="That slot is already booked for tomorrow")
            
        appointment.date = tomorrow_date
        appointment.start_time = request.start_time
        await db.commit()
        
    await db.refresh(appointment)
    
    from ..models import Patient, User
    from ..services.email_service import send_email
    import asyncio
    
    pat_res = await db.execute(
        select(User.email, User.name)
        .join(Patient, Patient.user_id == User.id)
        .where(Patient.id == appointment.patient_id)
    )
    pat_row = pat_res.first()
    
    doc_res = await db.execute(
        select(User.email, User.name)
        .join(Doctor, Doctor.user_id == User.id)
        .where(Doctor.id == appointment.doctor_id)
    )
    doc_row = doc_res.first()
    
    if pat_row:
        pat_email, pat_name = pat_row
        asyncio.create_task(
            send_email(
                to_email=pat_email,
                subject="Appointment Rescheduled",
                body=f"Hi {pat_name},\n\nYour appointment has been successfully rescheduled to tomorrow ({tomorrow_date}) at {request.start_time}.\n\nBest,\nUnthinkable Health"
            )
        )
        
    if doc_row:
        doc_email, doc_name = doc_row
        asyncio.create_task(
            send_email(
                to_email=doc_email,
                subject="Appointment Rescheduled",
                body=f"Hi Dr. {doc_name},\n\nAn appointment has been rescheduled to tomorrow ({tomorrow_date}) at {request.start_time}.\n\nBest,\nUnthinkable Health"
            )
        )
    
    return appointment
@router.post("/{appointment_id}/cancel", response_model=AppointmentSchema)
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db)
):
    from ..models import Patient, Doctor, User
    from ..services.email_service import send_email
    import asyncio
    
    # 1. Start a nested transaction and lock the appointment
    async with db.begin_nested():
        result = await db.execute(
            select(Appointment).with_for_update().where(Appointment.id == appointment_id)
        )
        appointment = result.scalars().first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        if appointment.status == AppointmentStatus.cancelled:
            raise HTTPException(status_code=400, detail="Appointment is already cancelled")
            
        appointment.status = AppointmentStatus.cancelled
        
        # 2. Get patient email
        pat_res = await db.execute(
            select(User.email, User.name)
            .join(Patient, Patient.user_id == User.id)
            .where(Patient.id == appointment.patient_id)
        )
        pat_row = pat_res.first()
        
        # 3. Get doctor email
        doc_res = await db.execute(
            select(User.email, User.name)
            .join(Doctor, Doctor.user_id == User.id)
            .where(Doctor.id == appointment.doctor_id)
        )
        doc_row = doc_res.first()
        
        await db.commit()
        
    await db.refresh(appointment)
    
    # 4. Send emails
    if pat_row:
        pat_email, pat_name = pat_row
        asyncio.create_task(
            send_email(
                to_email=pat_email,
                subject="Appointment Cancelled",
                body=f"Hi {pat_name},\n\nYour appointment on {appointment.date} at {appointment.start_time} has been cancelled.\n\nBest,\nUnthinkable Health"
            )
        )
        
    if doc_row:
        doc_email, doc_name = doc_row
        asyncio.create_task(
            send_email(
                to_email=doc_email,
                subject="Appointment Cancelled",
                body=f"Hi Dr. {doc_name},\n\nThe appointment on {appointment.date} at {appointment.start_time} has been cancelled by the patient.\n\nBest,\nUnthinkable Health"
            )
        )
        
    return appointment
