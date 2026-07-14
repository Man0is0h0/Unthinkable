from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .api import auth_routes, admin_routes, profile_routes, booking_routes
from .workers.scheduler import start_scheduler, scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    start_scheduler()
    yield
    # Shutdown actions
    scheduler.shutdown()

app = FastAPI(
    title="Healthcare Appointment Manager API",
    description="API for managing patients, doctors, and appointments.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Healthcare Appointment Manager API is running."}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])
app.include_router(profile_routes.router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(booking_routes.router, prefix="/api/appointments", tags=["Appointments"])
