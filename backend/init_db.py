import asyncio
from dotenv import load_dotenv
load_dotenv()
from app.database import engine, Base
from app import models  # This ensures the models are imported and registered with Base

async def init_models():
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_models())
