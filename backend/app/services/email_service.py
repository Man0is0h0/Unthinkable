import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

MOCK_EMAIL = os.environ.get("MOCK_EMAIL", "True").lower() in ("true", "1", "yes")

async def send_email(to_email: str, subject: str, body: str, ics_attachment: bytes = None):
    """
    Sends an email with an optional .ics calendar attachment.
    Defaults to MOCK_EMAIL=True for testing environments without SMTP credentials.
    """
    if MOCK_EMAIL:
        logger.info(f"========== MOCK EMAIL DISPATCH ==========")
        logger.info(f"TO: {to_email}")
        logger.info(f"SUBJECT: {subject}")
        logger.info(f"BODY:\n{body}")
        if ics_attachment:
            logger.info(f"ATTACHMENT: invite.ics ({len(ics_attachment)} bytes)")
            # Print a snippet of the ICS to prove it exists
            logger.info(f"ICS PREVIEW: {ics_attachment[:50].decode('utf-8')}...")
        logger.info(f"=========================================")
        return True
    
    # Real SMTP Logic (Requires environment variables)
    smtp_host = os.environ.get("SMTP_HOST", "smtp.sendgrid.net")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    from_email = os.environ.get("FROM_EMAIL", "noreply@unthinkable-health.com")

    if not smtp_user or not smtp_pass:
        logger.error("SMTP credentials missing. Email not sent.")
        return False

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    msg.set_content(body)

    if ics_attachment:
        msg.add_attachment(
            ics_attachment,
            maintype='text',
            subtype='calendar',
            filename='invite.ics',
            method='REQUEST'
        )

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
