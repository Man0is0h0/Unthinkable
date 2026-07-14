"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

export default function DoctorDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Completion Modal State
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Leave Management State
  const [leaveDate, setLeaveDate] = useState("");
  const [markingLeave, setMarkingLeave] = useState(false);
  const [myDoctorId, setMyDoctorId] = useState<number | null>(null);

  // Reschedule State
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string>('');

  const [prescriptions, setPrescriptions] = useState<{
    medication_name: string;
    dosage: string;
    frequency: string;
    duration_days: number | string;
  }[]>([]);

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

  const fetchAppointments = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const docsRes = await api.get("/admin/doctors");
      const myDoc = docsRes.data.find((d: any) => d.user_id === Number(userId));
      if (myDoc) {
        setMyDoctorId(myDoc.id);
        const aptsRes = await api.get(`/appointments?doctor_id=${myDoc.id}`);
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

  const handleLogout = async () => {
    await api.post("/auth/logout");
    localStorage.clear();
    router.push("/login");
  };

  const handleMarkLeave = async () => {
    if (!leaveDate || !myDoctorId) return;
    setMarkingLeave(true);
    try {
      await api.post("/appointments/leave", {
        doctor_id: myDoctorId,
        date: leaveDate,
        reason: "Personal Leave"
      });
      alert("Leave successfully marked for " + leaveDate);
      setLeaveDate("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to mark leave.");
    } finally {
      setMarkingLeave(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingId || !doctorNotes) return;
    
    setSubmitting(true);
    try {
      await api.post(`/appointments/${completingId}/complete`, { 
        doctor_notes: doctorNotes,
        prescriptions: prescriptions
      });
      setCompletingId(null);
      setDoctorNotes("");
      setPrescriptions([]);
      await fetchAppointments();
    } catch (err) {
      console.error(err);
      alert("Failed to complete appointment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div>
            <h1 className="text-3xl font-bold text-primary">Doctor Dashboard</h1>
            <p className="text-muted-foreground mt-1">Review your agenda and AI pre-visit summaries</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl hover-lift col-span-1 h-fit">
            <h2 className="text-xl font-semibold mb-4">Leave Management</h2>
            <p className="text-sm text-muted-foreground mb-4">Need a day off? Mark your calendar as unavailable.</p>
            <div className="space-y-3">
              <input 
                type="date" 
                className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-primary outline-none"
                value={leaveDate}
                onChange={e => setLeaveDate(e.target.value)}
              />
              <Button variant="destructive" onClick={handleMarkLeave} disabled={!leaveDate || markingLeave} className="w-full">
                {markingLeave ? "Marking..." : "Mark Date as Leave"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">Patients won't be able to book slots on this date.</p>
          </div>

          <div className="glass p-6 rounded-2xl hover-lift md:col-span-2 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Today's Agenda</h2>
            {appointments.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-8 text-center">
                <p>No appointments booked yet.<br/>Your schedule is clear.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-4 bg-secondary/50 rounded-xl border border-border">
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isMissed = apt.status === 'scheduled' && apt.date < todayStr;
                      return (
                        <>
                          <div className="flex justify-between mb-2">
                            <span className="font-bold text-primary">{apt.date} at {apt.start_time}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${apt.status === 'completed' ? 'bg-green-500/20 text-green-600' : isMissed ? 'bg-red-500/20 text-red-600' : 'bg-orange-500/20 text-orange-600'}`}>
                              {isMissed ? 'MISSED' : apt.status.toUpperCase()}
                            </span>
                          </div>
                          {apt.symptoms && (
                            <p className="text-sm text-muted-foreground mt-2"><span className="font-semibold text-foreground">Symptoms:</span> {apt.symptoms}</p>
                          )}
                          {apt.pre_visit_summary && (
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <span className="text-xs font-bold text-blue-600 uppercase mb-1 block">AI Pre-Visit Summary</span>
                              <div className="text-sm [&>p]:mb-2 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                                <ReactMarkdown>{apt.pre_visit_summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          
                          {apt.status !== 'completed' && (
                            <div className="mt-4 pt-4 border-t border-border">
                              {isMissed ? (
                                reschedulingId === apt.id ? (
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
                                )
                              ) : (
                                completingId === apt.id ? (
                                  <form onSubmit={handleComplete} className="space-y-3">
                                      <label className="text-sm font-medium">Doctor's Clinical Notes</label>
                                      <textarea 
                                        className="w-full p-2 text-sm border rounded-md bg-background focus:ring-primary outline-none"
                                        rows={3}
                                        placeholder="Enter your clinical findings..."
                                        value={doctorNotes}
                                        onChange={e => setDoctorNotes(e.target.value)}
                                        required
                                      />
                                      
                                      <div className="space-y-2 mt-4 pb-4">
                                        <label className="text-sm font-medium">Prescriptions (Optional)</label>
                                        {prescriptions.map((p, idx) => (
                                          <div key={idx} className="flex gap-2 items-center text-sm">
                                            <input className="p-2 border rounded flex-1 bg-background" placeholder="Medication (e.g. Paracetamol)" value={p.medication_name} onChange={e => { const newP = [...prescriptions]; newP[idx].medication_name = e.target.value; setPrescriptions(newP); }} required />
                                            <input className="p-2 border rounded w-24 bg-background" placeholder="Dosage" value={p.dosage} onChange={e => { const newP = [...prescriptions]; newP[idx].dosage = e.target.value; setPrescriptions(newP); }} required />
                                            <select className="p-2 border rounded bg-background" value={p.frequency} onChange={e => { const newP = [...prescriptions]; newP[idx].frequency = e.target.value; setPrescriptions(newP); }}>
                                              <option value="Morning">Morning</option>
                                              <option value="Night">Night</option>
                                              <option value="Twice Daily">Twice Daily</option>
                                            </select>
                                            <input className="p-2 border rounded w-28 bg-background" type="number" placeholder="No Of Days" value={p.duration_days} onChange={e => { const newP = [...prescriptions]; newP[idx].duration_days = e.target.value === '' ? '' : parseInt(e.target.value); setPrescriptions(newP); }} required min={1} />
                                            <button type="button" className="text-red-500 hover:text-red-700 font-bold p-2" onClick={() => { const newP = [...prescriptions]; newP.splice(idx, 1); setPrescriptions(newP); }}>X</button>
                                          </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => setPrescriptions([...prescriptions, { medication_name: "", dosage: "", frequency: "Morning", duration_days: "" }])}>
                                          + Add Medication
                                        </Button>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button type="submit" disabled={submitting} className="flex-1">
                                          {submitting ? "Processing AI Summary..." : "Complete Checkup"}
                                        </Button>
                                        <Button type="button" variant="ghost" onClick={() => {
                                          setCompletingId(null);
                                          setPrescriptions([]);
                                        }}>Cancel</Button>
                                      </div>
                                  </form>
                                ) : (
                                  <Button onClick={() => setCompletingId(apt.id)} variant="default" className="w-full">
                                    Begin Checkup
                                  </Button>
                                )
                              )}
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
