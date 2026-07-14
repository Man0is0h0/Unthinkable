from datetime import datetime
from uuid import uuid4

def generate_ics_event(appointment_id: int, date_str: str, start_time: str, end_time: str, summary: str, description: str) -> bytes:
    """
    Generates a basic iCalendar (.ics) string as bytes for attaching to emails.
    """
    # Parse times
    start_dt = datetime.strptime(f"{date_str} {start_time}", "%Y-%m-%d %H:%M")
    end_dt = datetime.strptime(f"{date_str} {end_time}", "%Y-%m-%d %H:%M")
    
    # Format to ICS timezone format (UTC)
    dtstart = start_dt.strftime("%Y%m%dT%H%M%S")
    dtend = end_dt.strftime("%Y%m%dT%H%M%S")
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Healthcare Appointment Manager//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uuid4()}
DTSTAMP:{dtstamp}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:{summary}
DESCRIPTION:{description}
END:VEVENT
END:VCALENDAR"""

    return ics_content.encode('utf-8')
