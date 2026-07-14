from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from ..database import get_db
from ..models import Patient, User, RoleEnum

router = APIRouter()

class PatientCreate(BaseModel):
    user_id: int
    age: int
    gender: str
    blood_group: str

class PatientResponse(BaseModel):
    id: int
    user_id: int
    age: int
    gender: str
    blood_group: str

    class Config:
        from_attributes = True

@router.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(patient_data: PatientCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == patient_data.user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != RoleEnum.patient:
        raise HTTPException(status_code=400, detail="User is not assigned the patient role")
        
    new_patient = Patient(**patient_data.model_dump())
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)
    return new_patient

@router.get("/patients/{user_id}", response_model=PatientResponse)
async def get_patient_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.user_id == user_id))
    patient = result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

class DoctorPublicResponse(BaseModel):
    id: int
    name: str
    specialization: str
    experience_years: int
    slot_duration: int
    
@router.get("/doctors", response_model=list[DoctorPublicResponse])
async def get_all_doctors(db: AsyncSession = Depends(get_db)):
    from ..models import Doctor
    
    query = select(Doctor, User.name).join(User, Doctor.user_id == User.id)
    result = await db.execute(query)
    rows = result.all()
    
    doctors = []
    for doc, name in rows:
        doctors.append({
            "id": doc.id,
            "name": name,
            "specialization": doc.specialization,
            "experience_years": doc.experience_years,
            "slot_duration": doc.slot_duration
        })
    return doctors
