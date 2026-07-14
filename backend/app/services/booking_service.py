from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from fastapi import HTTPException

from ..models import Doctor, Appointment, DoctorLeave, AppointmentStatus

def generate_slots(start_time_str: str, end_time_str: str, slot_duration: int) -> List[str]:
    """Generates a list of slot start times between start and end time"""
    slots = []
    start_time = datetime.strptime(start_time_str, "%H:%M")
    end_time = datetime.strptime(end_time_str, "%H:%M")
    
    current_time = start_time
    while current_time + timedelta(minutes=slot_duration) <= end_time:
        slots.append(current_time.strftime("%H:%M"))
        current_time += timedelta(minutes=slot_duration)
    return slots

async def get_available_slots(db: AsyncSession, doctor_id: int, date_str: str) -> List[str]:
    """Calculate available slots by generating all slots and filtering out booked/leave ones"""
    
    # 1. Check if doctor is on leave
    leave_query = await db.execute(
        select(DoctorLeave).where(
            and_(DoctorLeave.doctor_id == doctor_id, DoctorLeave.date == date_str)
        )
    )
    if leave_query.scalars().first():
        return [] # Doctor is on leave, no slots available

    # 2. Get doctor profile for working hours
    doc_query = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = doc_query.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Determine day of week string (e.g. "monday")
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_name = date_obj.strftime("%A").lower()

    working_hours = doctor.working_hours or {}
    if day_name not in working_hours:
        return [] # Doctor doesn't work on this day

    start_str = working_hours[day_name].get("start", "09:00")
    end_str = working_hours[day_name].get("end", "17:00")
    slot_duration = doctor.slot_duration or 30

    # 3. Generate all possible slots
    all_slots = generate_slots(start_str, end_str, slot_duration)

    # 4. Filter out already booked appointments
    booked_query = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.date == date_str,
                Appointment.status != AppointmentStatus.cancelled
            )
        )
    )
    booked_appointments = booked_query.scalars().all()
    booked_times = {app.start_time for app in booked_appointments}

    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    # 5. Filter out past times if the date is today
    today_str = datetime.now().strftime("%Y-%m-%d")
    if date_str == today_str:
        current_time = datetime.now().strftime("%H:%M")
        available_slots = [slot for slot in available_slots if slot > current_time]

    return available_slots

async def book_appointment_transaction(
    db: AsyncSession, patient_id: int, doctor_id: int, date_str: str, start_time: str
) -> Appointment:
    """Books an appointment using a transactional row lock to prevent double booking."""
    
    # Calculate end time based on doctor's slot duration
    doc_query = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = doc_query.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    start_dt = datetime.strptime(start_time, "%H:%M")
    end_dt = start_dt + timedelta(minutes=doctor.slot_duration)
    end_time = end_dt.strftime("%H:%M")

    # Start a nested transaction (savepoint) for the booking attempt
    async with db.begin_nested():
        # 1. Lock the Doctor record to serialize all bookings for this doctor
        # This prevents double-booking when two concurrent requests try to insert the same slot.
        await db.execute(
            select(Doctor).with_for_update().where(Doctor.id == doctor_id)
        )
        
        # Apply a row-level lock FOR UPDATE on any existing appointment for this exact slot
        # If it exists (and is not cancelled), we cannot book.
        conflict_query = await db.execute(
            select(Appointment)
            .with_for_update()
            .where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.date == date_str,
                    Appointment.start_time == start_time,
                    Appointment.status != AppointmentStatus.cancelled
                )
            )
        )
        conflict = conflict_query.scalars().first()
        
        if conflict:
            raise HTTPException(status_code=409, detail="This slot is already booked.")
            
        # Check leave again just in case it was added concurrently
        leave_query = await db.execute(
            select(DoctorLeave).with_for_update().where(
                and_(DoctorLeave.doctor_id == doctor_id, DoctorLeave.date == date_str)
            )
        )
        if leave_query.scalars().first():
            raise HTTPException(status_code=409, detail="Doctor is on leave this day.")

        # If no conflict, create the appointment
        new_appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            date=date_str,
            start_time=start_time,
            end_time=end_time,
            status=AppointmentStatus.scheduled
        )
        db.add(new_appointment)
        
    await db.commit()
    await db.refresh(new_appointment)
    return new_appointment
