import requests
import time
import json

API_URL = 'http://localhost:8000/api'

try:
    print("--- PATIENT LOGS IN ---")
    res = requests.post(f'{API_URL}/auth/login', json={'email': 'qa123@example.com', 'password': 'pw'})
    patient_user = res.json()
    patient_user_id = patient_user['user_id']
    print(f"Logged in User ID: {patient_user_id}")

    res = requests.get(f'{API_URL}/profiles/patients/{patient_user_id}')
    patient_id = res.json()['id']
    print(f"Patient Profile ID: {patient_id}")

    print("\n--- PATIENT BOOKS APPOINTMENT ---")
    apt_payload = {
        'patient_id': patient_id,
        'doctor_id': 1,
        'date': '2026-10-16',
        'start_time': '13:00',
        'symptoms': 'I have a terrible headache.'
    }
    res = requests.post(f'{API_URL}/appointments/book', json=apt_payload)
    if res.status_code != 200:
        print(res.json())
    apt = res.json()
    apt_id = apt['id']
    print(f"Booked appointment ID {apt_id} with status {apt.get('status')}")
    print(f"Pre-visit summary generated: {apt.get('pre_visit_summary')}")

    print("\n--- DOCTOR CHECKS AGENDA ---")
    res = requests.get(f'{API_URL}/appointments?doctor_id=1')
    apts = res.json()
    print(f"Doctor 1 has {len(apts)} appointments. First one ID: {apts[0]['id']}")

    print("\n--- DOCTOR COMPLETES CHECKUP ---")
    res = requests.post(
        f'{API_URL}/appointments/{apt_id}/complete',
        json={'doctor_notes': 'Patient has a migraine. Advised rest and prescribed ibuprofen.'}
    )
    completed_apt = res.json()
    print(f"Status is now: {completed_apt.get('status')}")
    print(f"Doctor Notes: {completed_apt.get('doctor_notes')}")
    print(f"Post-visit summary from AI: {completed_apt.get('post_visit_summary')}")

    print("\n--- PATIENT REVIEWS DASHBOARD ---")
    res = requests.get(f'{API_URL}/appointments?patient_id={patient_id}')
    pat_apts = res.json()
    print(f"Patient 1 sees {len(pat_apts)} appointments. Status of recent: {pat_apts[0]['status']}")
    print(f"Patient can read: {pat_apts[0]['post_visit_summary']}")

    print("\nE2E FLOW SUCCESSFUL")
except Exception as e:
    print(f"Error: {e}")
