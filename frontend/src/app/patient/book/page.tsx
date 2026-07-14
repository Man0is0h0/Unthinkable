"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";

export default function BookAppointment() {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get("/profiles/doctors");
        setDoctors(res.data);
        const specs: string[] = Array.from(new Set(res.data.map((d: any) => d.specialization)));
        setSpecializations(specs);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      }
    };
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors
    .filter(d => (selectedSpecialization ? d.specialization === selectedSpecialization : true))
    .filter(d => (searchQuery ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name));

  const fetchSlots = async () => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setHasSearched(false);
    try {
      const res = await api.get(`/appointments/slots/${doctorId}?date=${date}`);
      setSlots(res.data.available_slots || []);
      setSelectedSlot("");
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
      setHasSearched(true);
    }
  };

  const handleBook = async () => {
    setBooking(true);
    try {
      const userId = localStorage.getItem("userId");
      // Fetch the actual Patient Profile ID
      const patRes = await api.get(`/profiles/patients/${userId}`);
      const patientProfileId = patRes.data.id;

      await api.post("/appointments/book", {
        patient_id: patientProfileId,
        doctor_id: doctorId,
        date,
        start_time: selectedSlot,
        symptoms
      });
      setSuccess(true);
    } catch (err: any) {
      let errorMsg = "Failed to book slot";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => `${d.loc[d.loc.length-1]}: ${d.msg}`).join(', ');
        } else {
          errorMsg = err.response.data.detail;
        }
      }
      alert(errorMsg);
    } finally {
      setBooking(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="glass p-10 rounded-2xl text-center max-w-md hover-lift">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-8">Your appointment has been secured. Our AI has generated your pre-visit summary.</p>
          <Button onClick={() => router.push("/patient")} className="w-full">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">← Back</Button>
        
        <div className="glass p-8 rounded-2xl shadow-sm">
          <h1 className="text-3xl font-bold text-primary mb-2">Book an Appointment</h1>
          <p className="text-muted-foreground mb-8">Select a doctor, choose an available time slot, and tell us your symptoms.</p>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <label className="text-sm font-medium">Select a Doctor</label>
                <div className="flex gap-2 flex-1 sm:max-w-md sm:justify-end">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="w-full sm:w-auto px-3 py-1 text-sm border rounded-md bg-transparent focus:ring-primary outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <select 
                    className="w-full sm:w-auto px-3 py-1 text-sm border rounded-md bg-transparent focus:ring-primary outline-none"
                    value={selectedSpecialization}
                    onChange={e => setSelectedSpecialization(e.target.value)}
                  >
                    <option value="">All Specializations</option>
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2 max-h-64 overflow-y-auto p-1">
                {filteredDoctors.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => setDoctorId(doc.id.toString())}
                    className={`p-4 flex items-center justify-between rounded-xl border cursor-pointer transition-all ${doctorId === doc.id.toString() ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card hover:border-primary/50'}`}
                  >
                    <div>
                      <div className="font-bold">{doc.name}</div>
                      <div className="text-sm text-muted-foreground">{doc.specialization}</div>
                    </div>
                    <div className="text-xs bg-secondary px-3 py-1 rounded font-medium">Exp: {doc.experience_years} yrs</div>
                  </div>
                ))}
                {filteredDoctors.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">No doctors found.</div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border/50">
              <label className="text-sm font-medium">Select Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-primary outline-none"
                value={date} onChange={e => setDate(e.target.value)} 
              />
            </div>

            <Button onClick={fetchSlots} disabled={!doctorId || !date || loadingSlots} variant="secondary">
              {loadingSlots ? "Searching..." : "Find Available Slots"}
            </Button>

            {hasSearched && slots.length === 0 && (
              <div className="pt-4 border-t border-border/50 text-center">
                <p className="text-muted-foreground text-sm">No slots available for this date. The doctor might be fully booked or on leave.</p>
              </div>
            )}

            {slots.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <label className="text-sm font-medium">Available Time Slots</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 text-sm rounded-md transition-all ${selectedSlot === slot ? 'bg-primary text-white shadow-md scale-105' : 'bg-secondary text-secondary-foreground hover:bg-primary/20'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSlot && (
              <div className="space-y-3 pt-4 border-t border-border/50 transition-all">
                <label className="text-sm font-medium">Please describe your symptoms</label>
                <p className="text-xs text-muted-foreground">Our AI will analyze this to prepare your doctor for the visit.</p>
                <textarea 
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="I have been experiencing a mild headache for the last two days..."
                  value={symptoms} onChange={e => setSymptoms(e.target.value)}
                />
                
                <Button onClick={handleBook} disabled={!symptoms || booking} className="w-full mt-4 h-12 text-lg">
                  {booking ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing symptoms & Booking...
                    </span>
                  ) : "Confirm Booking"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
