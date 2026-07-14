import requests
import json

API_URL = 'http://localhost:8000/api'

try:
    print("--- ADMIN FETCHES DOCTORS ---")
    res = requests.get(f'{API_URL}/admin/doctors')
    print(f"Current doctors count: {len(res.json())}")

    print("\n--- ADMIN ONBOARDS NEW DOCTOR ---")
    # 1. Signup the user
    user_payload = {
        "name": "Dr. Test AdminFlow",
        "email": "drtest_admin1@example.com",
        "password": "securepw",
        "role": "doctor"
    }
    user_res = requests.post(f'{API_URL}/auth/signup', json=user_payload)
    if user_res.status_code != 201:
        print("Signup Failed:", user_res.json())
    else:
        user_id = user_res.json()["user_id"]
        print(f"Created User ID: {user_id}")

        # 2. Create the Doctor Profile
        doc_payload = {
            "user_id": user_id,
            "specialization": "Neurology",
            "experience_years": 10,
            "slot_duration": 30,
            "working_hours": { "monday": { "start": "09:00", "end": "17:00" } }
        }
        doc_res = requests.post(f'{API_URL}/admin/doctors', json=doc_payload)
        if doc_res.status_code != 201:
            print("Doctor Profile Creation Failed:", doc_res.json())
        else:
            doc = doc_res.json()
            print(f"Created Doctor ID: {doc['id']} - Specialization: {doc['specialization']}")

    print("\n--- ADMIN RE-FETCHES DOCTORS ---")
    res = requests.get(f'{API_URL}/admin/doctors')
    print(f"Updated doctors count: {len(res.json())}")
    
    print("\nADMIN E2E FLOW SUCCESSFUL")

except Exception as e:
    print(f"Error: {e}")
