# System Design: Concurrency & Reliability

When I was building Unthinkable Health, I wanted to make sure it could handle real-world edge cases in medical scheduling. My main focus was on concurrency control and system reliability. This document outlines the architectural decisions I made to handle double-booking, schedule conflicts, and third-party service failures.

---

## 1. Double-Booking Prevention

In a high-traffic environment, it's very possible that two patients might attempt to book the exact same slot for the same doctor simultaneously. To prevent race conditions, I implemented **Pessimistic Concurrency Control** at the database layer.

When a booking request hits my `POST /book` endpoint, the transaction relies on SQLAlchemy's `with_for_update()` row-level locking mechanism:
1. **Row Lock:** The transaction locks the `Doctor` record. This serializes incoming requests for that specific doctor.
2. **Validation:** Once I acquire the lock, my code queries the `appointments` table to ensure no active appointment exists for that `date` and `start_time`.
3. **Execution:** If the slot is clear, the new appointment is inserted and the transaction is committed, instantly releasing the lock for the next queued request. 

If the slot was taken by a parallel request that acquired the lock first, the validation step fails, the transaction rolls back, and I send the second user an immediate `409 Conflict` error informing them the slot is no longer available.

---

## 2. Doctor Leave Conflict Handling

Doctors obviously need the flexibility to take unexpected time off. However, letting them mark a day as "Leave" while patients are already scheduled creates severe operational conflicts.

Here is how I handled this gracefully:
1. **Validation on Leave Request:** When a doctor attempts to mark a leave via `POST /appointments/leave`, the system explicitly queries the database for any active (non-cancelled) appointments on that specific date for that doctor.
2. **Hard Block:** If conflicts exist, I explicitly reject the leave request with a `409 Conflict: Cannot mark leave. You have active appointments. Please cancel/reschedule them first.` This forces the doctor to resolve the schedule conflict proactively rather than leaving patients in the dark.
3. **Slot Generation:** Once a leave is successfully marked in the `doctor_leaves` table, my `get_available_slots` algorithm automatically filters out that date entirely. If a patient checks availability for that day, the system skips the standard 30-minute interval generation and simply returns an empty array, completely removing the day from the frontend calendar.

---

## 3. Slot Hold Mechanism

While the pessimistic lock handles exact-moment collisions, I wanted the architecture to support a **Transient Slot Hold Mechanism** to prevent user frustration caused by slots disappearing while they fill out symptom forms.

Here is how I designed it to work:
1. When a patient clicks on a time slot, a lightweight `Hold` record is created (or cached in Redis) with a TTL (Time-To-Live) of 5 minutes.
2. This hold temporarily removes the slot from my `get_available_slots` response for all other users.
3. If the patient completes the booking process and the AI triage analysis within 5 minutes, the hold is converted into a permanent `Appointment` record.
4. If the TTL expires (e.g., the user abandons the page), the hold is automatically flushed, returning the slot to the public pool.

Currently, I rely on rapid transaction completion, but the underlying SQLAlchemy architecture I built is fully prepared to integrate a Redis-backed TTL holding state if I need to enhance UX during peak booking hours.

---

## 4. Notification Failure Handling

Unthinkable Health relies heavily on the **Brevo REST API** to dispatch confirmation emails and `.ics` calendar invites. However, I know that third-party network requests are inherently unreliable (e.g., DNS failures, rate limits, or API outages).

To prevent notification failures from breaking my core system functionality, I did the following:
1. **Asynchronous Dispatch:** I decoupled the email tasks from the main HTTP request-response lifecycle. When an appointment is booked or completed, I spawn a background task using `asyncio.create_task()`. The API immediately returns a `200 OK` with the booking details to the user, ensuring the UI remains snappy.
2. **Isolated Execution:** I wrapped the actual HTTP request to Brevo in `loop.run_in_executor()` to prevent the synchronous `urllib.request` from blocking FastAPI's async event loop.
3. **Timeout & Fallback:** The external request is strictly bound by a 10-second timeout. If Brevo fails to respond, or returns a `4xx/5xx` error, I catch the exception, log it securely via the internal logger, and return `False`. The failure is completely isolated; the patient's appointment remains secure in my database, and the system continues operating normally despite the third-party outage.
