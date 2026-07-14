from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from ..database import get_db
from ..models import User, RoleEnum
from ..auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: RoleEnum = RoleEnum.patient
    phone: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalars().first()
    
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        phone=user.phone
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    from ..services.email_service import send_email
    import asyncio
    asyncio.create_task(
        send_email(
            to_email=new_user.email,
            subject="Welcome to Unthinkable Health",
            body=f"Hi {new_user.name},\n\nWelcome to Unthinkable Health! Your {new_user.role.value} account has been successfully created.\n\nBest,\nUnthinkable Health"
        )
    )
    
    return {"message": "User created successfully", "user_id": new_user.id}

@router.post("/login")
async def login(response: Response, user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    query = await db.execute(select(User).where(User.email == user_data.email))
    user = query.scalars().first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    
    # Set HttpOnly cookie for production-grade security
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True, # Will be true in production (HTTPS)
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    
    return {"message": "Login successful", "role": user.role, "user_id": user.id}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}
