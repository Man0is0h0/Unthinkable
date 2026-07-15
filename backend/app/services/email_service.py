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
    
    # Real Email Logic via Brevo HTTP API
    brevo_api_key = os.environ.get("BREVO_API_KEY")
    from_email = os.environ.get("FROM_EMAIL", "noreply@unthinkable-health.com")

    import asyncio
    import urllib.request
    import json
    import base64

    def send_email_sync():
        if not brevo_api_key:
            logger.error("BREVO_API_KEY missing. Email not sent.")
            return False

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json"
        }

        data = {
            "sender": {"name": "Unthinkable Health", "email": from_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "textContent": body
        }

        if ics_attachment:
            data["attachment"] = [{
                "name": "invite.ics",
                "content": base64.b64encode(ics_attachment).decode('utf-8')
            }]

        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status in (200, 201, 202):
                    logger.info(f"Email sent successfully to {to_email} via Brevo")
                    return True
                else:
                    logger.error(f"Failed to send email. Status: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Error sending email via Brevo API: {e}")
            return False

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email_sync)
