"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { CalendarPlus, LogOut, ChevronRight } from "lucide-react";

export default function PatientDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // No local state for details needed

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

  // Action handlers moved to visit details page

  const handleLogout = async () => {
    await api.post("/auth/logout");
    localStorage.clear();
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center glass-panel p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-bold text-primary">Patient Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your health and appointments</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 rounded-xl">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </header>

        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-2xl font-semibold text-primary">Your Appointments</h2>
          <Button onClick={() => router.push("/patient/book")} className="w-full md:w-auto shrink-0 shadow-lg hover:shadow-xl transition-all rounded-xl flex items-center gap-2">
            <CalendarPlus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex flex-col min-h-[400px]">
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];

            if (appointments.length === 0) {
              return (
                <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-8 text-center">
                  <p>No appointments found.</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {appointments.map((apt, index) => {
                  const isMissed = apt.status === 'scheduled' && apt.date < todayStr;
                  const delayClass = `delay-${((index % 5) + 1) * 100}`;
                  
                  return (
                    <div 
                      key={apt.id} 
                      className={`p-5 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5 cursor-pointer group hover:bg-secondary/60 hover:shadow-md transition-all animate-fade-in-up ${delayClass}`}
                      onClick={() => router.push(`/patient/visit/${apt.id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-primary text-lg">{apt.date}</span>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-sm ${apt.status === 'completed' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : isMissed ? 'bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                              {isMissed ? 'MISSED' : apt.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-primary/50"></span>
                            Time: {apt.start_time}
                          </p>
                        </div>
                        <span className="text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 flex items-center gap-1 font-semibold">
                          View Details <ChevronRight className="w-5 h-5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
