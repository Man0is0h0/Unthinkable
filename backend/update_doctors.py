import asyncio
import sys
sys.path.append('C:\\Users\\MANISH\\Desktop\\Unthinkable\\backend')

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from app.models import Doctor
from app.database import DATABASE_URL

async def update_doctors():
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        docs = await session.execute(select(Doctor))
        for doc in docs.scalars().all():
            doc.working_hours = {
                'monday': {'start': '09:00', 'end': '17:00'},
                'tuesday': {'start': '09:00', 'end': '17:00'},
                'wednesday': {'start': '09:00', 'end': '17:00'},
                'thursday': {'start': '09:00', 'end': '17:00'},
                'friday': {'start': '09:00', 'end': '17:00'}
            }
        await session.commit()
    print('Doctors updated')

asyncio.run(update_doctors())
