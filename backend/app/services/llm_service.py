import os
import json
from groq import AsyncGroq
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Setup Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "dummy_key_for_dev")
client = AsyncGroq(api_key=GROQ_API_KEY)

# Use llama-3.1-8b-instant for fast reasoning tasks
MODEL_NAME = "llama-3.1-8b-instant"

async def analyze_symptoms(symptoms: str) -> dict:
    """
    Analyzes patient symptoms and returns structured JSON with urgency, chief complaint, and questions.
    """
    if not GROQ_API_KEY or GROQ_API_KEY in ["dummy_key_for_dev", "your_groq_api_key_here"]:
        # Return a mocked realistic response for local development
        return {
            "urgency": "medium",
            "chief_complaint": "General Malaise",
            "questions": [
                "When did these symptoms first begin?",
                "Have you taken any medication for this?",
                "Are you experiencing any fever or chills?"
            ]
        }

    prompt = f"""
    You are a medical triage assistant. Analyze the following patient symptoms:
    "{symptoms}"
    
    Return a JSON response with the following keys exactly as written:
    - "urgency": (low, medium, high)
    - "chief_complaint": (a short 3-5 word summary)
    - "questions": (an array of exactly 3 questions a doctor should ask the patient)
    
    Output ONLY valid JSON.
    """
    
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        text = response.choices[0].message.content.strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error in Groq analyze_symptoms: {e}")
        return {
            "urgency": "medium",
            "chief_complaint": "Unknown - AI Error (Rate Limited)",
            "questions": ["Can you describe your symptoms in more detail?"]
        }

async def translate_doctor_notes(notes: str, patient_name: str = "Patient", doctor_name: str = "Medical Team") -> str:
    """
    Translates raw doctor notes into patient-friendly language.
    """
    if not GROQ_API_KEY or GROQ_API_KEY in ["dummy_key_for_dev", "your_groq_api_key_here"]:
        # Return mocked translated notes for local development
        return f"Dear {patient_name},\n\nYour doctor noted the following: {notes}. Please make sure to get plenty of rest and drink lots of fluids!\n\nSincerely, Dr. {doctor_name}"

    prompt = f"""
    You are a friendly, empathetic medical assistant. Convert the following doctor's clinical notes into 
    simple, patient-friendly instructions. Avoid complex medical jargon. Ensure the tone is reassuring.
    
    Address the note to "{patient_name}" and sign off the note with "Dr. {doctor_name}".
    
    Doctor's Notes:
    "{notes}"
    """
    
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in Groq translate_notes: {e}")
        return "Your doctor left notes, but they could not be processed at this time due to AI rate limits."
