"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

export default function PatientDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string>('');

  const fetchAppointments = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const pat = await api.get(`/profiles/patients/${userId}`);
      if (pat.data) {
        const aptsRes = await api.get(`/appointments?patient_id=${pat.data.id}`);
        setAppointments(aptsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStartReschedule = async (apt: any) => {
    setReschedulingId(apt.id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    try {
      const res = await api.get(`/appointments/slots/${apt.doctor_id}?date=${tomorrowStr}`);
      setRescheduleSlots(res.data.available_slots);
      setSelectedRescheduleSlot('');
    } catch (err) {
      alert("Error fetching slots for tomorrow.");
    }
  };

  const handleConfirmReschedule = async (apt: any) => {
    if (!selectedRescheduleSlot) return;
    try {
      await api.post(`/appointments/${apt.id}/reschedule-tomorrow`, {
        start_time: selectedRescheduleSlot
      });
      alert("Rescheduled to tomorrow!");
      setReschedulingId(null);
      setSelectedRescheduleSlot('');
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reschedule.");
    }
  };

  const handleCancelAppointment = async (aptId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post(`/appointments/${aptId}/cancel`);
      alert("Appointment cancelled successfully.");
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to cancel.");
    }
  };

  const handleLogout = async () => {
    await api.post("/auth/logout");
    localStorage.clear();
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div>
            <h1 className="text-3xl font-bold text-primary">Patient Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your health and appointments</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl hover-lift">
            <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>
            <p className="text-muted-foreground mb-6">Schedule a new visit with one of our specialized doctors.</p>
            <Button onClick={() => router.push("/patient/book")} className="w-full">
              Book Now
            </Button>
          </div>

          <div className="glass p-6 rounded-2xl hover-lift flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Your Visits</h2>
            {appointments.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-4 text-center">
                <p>No appointments found.<br/>Book a slot to get started.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-4 bg-secondary/50 rounded-xl border border-border">
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isMissed = apt.status === 'scheduled' && apt.date < todayStr;
                      return (
                        <>
                          <div className="flex justify-between mb-2">
                            <span className="font-bold text-primary">{apt.date}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${apt.status === 'completed' ? 'bg-green-500/20 text-green-600' : isMissed ? 'bg-red-500/20 text-red-600' : 'bg-orange-500/20 text-orange-600'}`}>
                              {isMissed ? 'MISSED' : apt.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Time: {apt.start_time}</p>
                          
                          {isMissed && (
                            <div className="mt-4 pt-4 border-t border-border">
                              {reschedulingId === apt.id ? (
                                <div className="space-y-3">
                                  <label className="text-sm font-medium">Select Time for Tomorrow</label>
                                  <select 
                                    className="w-full p-2 border rounded-md bg-background focus:ring-primary outline-none text-sm"
                                    value={selectedRescheduleSlot}
                                    onChange={e => setSelectedRescheduleSlot(e.target.value)}
                                  >
                                    <option value="" disabled>Select a time slot</option>
                                    {rescheduleSlots.length === 0 && <option disabled>No slots available tomorrow</option>}
                                    {rescheduleSlots.map(slot => (
                                      <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                  </select>
                                  <div className="flex gap-2">
                                    <Button onClick={() => handleConfirmReschedule(apt)} disabled={!selectedRescheduleSlot} className="flex-1">
                                      Confirm Reschedule
                                    </Button>
                                    <Button variant="ghost" onClick={() => setReschedulingId(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button onClick={() => handleStartReschedule(apt)} variant="destructive" className="w-full">
                                  Reschedule to Tomorrow
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {apt.status === 'scheduled' && !isMissed && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <Button onClick={() => handleCancelAppointment(apt.id)} variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">
                                Cancel Appointment
                              </Button>
                            </div>
                          )}
                          
                          {apt.post_visit_summary && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <span className="text-xs font-bold text-green-600 uppercase mb-1 block">Doctor's Follow-up Note</span>
                              <div className="text-sm text-foreground [&>p]:mb-2 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                                <ReactMarkdown>{apt.post_visit_summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
