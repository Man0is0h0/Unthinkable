import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# Expects DATABASE_URL from environment variables, e.g., provided by Neon
# Ensure it uses the asyncpg driver: postgresql+asyncpg://user:pass@host/db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db") 

# Temporary fallback to sqlite for initial scaffolding if URL not provided
engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
