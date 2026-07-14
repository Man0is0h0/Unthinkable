"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Stethoscope, AlertTriangle, FileText } from "lucide-react";

export default function VisitDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [apt, setApt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string>('');

  const fetchAppointment = async () => {
    try {
      const res = await api.get(`/appointments/${id}`);
      setApt(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching appointment details");
      router.push("/patient");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const handleStartReschedule = async () => {
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

  const handleConfirmReschedule = async () => {
    if (!selectedRescheduleSlot) return;
    try {
      await api.post(`/appointments/${apt.id}/reschedule-tomorrow`, {
        start_time: selectedRescheduleSlot
      });
      alert("Rescheduled to tomorrow!");
      setReschedulingId(null);
      setSelectedRescheduleSlot('');
      fetchAppointment();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reschedule.");
    }
  };

  const handleCancelAppointment = async () => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.post(`/appointments/${apt.id}/cancel`);
      alert("Appointment cancelled successfully.");
      fetchAppointment();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to cancel.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!apt) return <div className="min-h-screen flex items-center justify-center">Appointment not found.</div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const isMissed = apt.status === 'scheduled' && apt.date < todayStr;

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center glass-panel p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3"><Stethoscope className="w-8 h-8" /> Visit Details</h1>
            <p className="text-muted-foreground mt-1">Review your appointment information</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/patient")} className="flex items-center gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </header>

        <div className="glass-panel p-8 rounded-3xl shadow-lg animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{apt.date} at {apt.start_time}</h2>
            <span className={`px-4 py-2 rounded-full font-bold shadow-sm ${apt.status === 'completed' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : isMissed ? 'bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
              {isMissed ? 'MISSED' : apt.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-6">
            {isMissed && (
              <div className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20">
                <h3 className="text-red-700 dark:text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> You missed this appointment</h3>
                {reschedulingId === apt.id ? (
                  <div className="space-y-3 mt-4">
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
                      <Button onClick={handleConfirmReschedule} disabled={!selectedRescheduleSlot} className="flex-1">
                        Confirm Reschedule
                      </Button>
                      <Button variant="ghost" onClick={() => setReschedulingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleStartReschedule} variant="destructive" className="mt-2">
                    Reschedule to Tomorrow
                  </Button>
                )}
              </div>
            )}
            
            {apt.status === 'scheduled' && !isMissed && (
              <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                <p className="mb-4">This appointment is upcoming.</p>
                <Button onClick={handleCancelAppointment} variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  Cancel Appointment
                </Button>
              </div>
            )}
            
            {apt.post_visit_summary && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl shadow-sm">
                <span className="text-lg font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Doctor's Follow-up Note</span>
                <div className="text-foreground [&>p]:mb-4 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6">
                  <ReactMarkdown>{apt.post_visit_summary}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
