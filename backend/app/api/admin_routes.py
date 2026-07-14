from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import Doctor, User, RoleEnum

# NOTE: In a real app, you would add a dependency here to verify the current user is an Admin
router = APIRouter()

class DoctorCreate(BaseModel):
    user_id: int
    specialization: str
    experience_years: int
    slot_duration: int = 30
    working_hours: dict = {
        "monday": {"start": "09:00", "end": "17:00"},
        "tuesday": {"start": "09:00", "end": "17:00"},
        "wednesday": {"start": "09:00", "end": "17:00"},
        "thursday": {"start": "09:00", "end": "17:00"},
        "friday": {"start": "09:00", "end": "17:00"}
    }

class DoctorResponse(BaseModel):
    id: int
    user_id: int
    specialization: str
    experience_years: int
    slot_duration: int
    working_hours: dict

    class Config:
        from_attributes = True

@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(doctor_data: DoctorCreate, db: AsyncSession = Depends(get_db)):
    # Verify user exists and is a doctor role
    result = await db.execute(select(User).where(User.id == doctor_data.user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != RoleEnum.doctor:
        raise HTTPException(status_code=400, detail="User is not assigned the doctor role")
        
    new_doctor = Doctor(**doctor_data.model_dump())
    db.add(new_doctor)
    await db.commit()
    await db.refresh(new_doctor)
    return new_doctor

@router.get("/doctors", response_model=List[DoctorResponse])
async def list_doctors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor))
    doctors = result.scalars().all()
    return doctors

@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doctor(doctor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    await db.delete(doctor)
    await db.commit()
    return None
