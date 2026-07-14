"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";

export default function DoctorPatientHistory({ params }: { params: Promise<{ patient_id: string }> }) {
  const router = useRouter();
  const { patient_id } = use(params);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const docsRes = await api.get("/admin/doctors");
        const myDoc = docsRes.data.find((d: any) => d.user_id === Number(userId));
        
        if (myDoc) {
          const aptsRes = await api.get(`/appointments?doctor_id=${myDoc.id}&patient_id=${patient_id}`);
          setAppointments(aptsRes.data);
          
          if (aptsRes.data.length > 0 && aptsRes.data[0].patient_name) {
            setPatientName(aptsRes.data[0].patient_name);
          }
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching patient history");
        router.push("/doctor");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patient_id, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center glass-panel p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3"><History className="w-8 h-8 text-primary" /> Patient History</h1>
            <p className="text-muted-foreground mt-1">Visit records for {patientName}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/doctor")} className="flex items-center gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </header>

        <div className="glass-panel p-6 rounded-3xl flex flex-col shadow-lg">
          {appointments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-8 text-center min-h-[200px]">
              <p>No historical appointments found for this patient.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt, index) => {
                const delayClass = `delay-${((index % 5) + 1) * 100}`;
                const todayStr = new Date().toISOString().split('T')[0];
                const isMissed = apt.status === 'scheduled' && apt.date < todayStr;
                return (
                  <div key={apt.id} className={`p-5 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up ${delayClass}`}>
                    <div>
                      <span className="font-bold text-primary block text-lg">{apt.date} at {apt.start_time}</span>
                      {apt.symptoms && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2"><span className="font-semibold text-foreground">Symptoms:</span> {apt.symptoms}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase shadow-sm ${apt.status === 'completed' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : isMissed ? 'bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                        {isMissed ? 'MISSED' : apt.status}
                      </span>
                      {apt.status === 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => router.push(`/doctor/visit/${apt.id}`)} className="rounded-lg shadow-sm hover:shadow-md transition-all">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
