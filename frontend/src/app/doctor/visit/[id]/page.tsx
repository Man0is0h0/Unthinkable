"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Stethoscope, Sparkles, FileText, Activity } from "lucide-react";

export default function DoctorVisitDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [apt, setApt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await api.get(`/appointments/${id}`);
        setApt(res.data);
      } catch (err) {
        console.error(err);
        alert("Error fetching appointment details");
        router.push("/doctor");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!apt) return <div className="min-h-screen flex items-center justify-center">Appointment not found.</div>;

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center glass-panel p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3"><Stethoscope className="w-8 h-8" /> Visit Details</h1>
            <p className="text-muted-foreground mt-1">Review clinical notes and summaries</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/doctor")} className="flex items-center gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </header>

        <div className="glass-panel p-8 rounded-3xl space-y-8 shadow-lg animate-fade-in-up">
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold text-primary">{apt.date} at {apt.start_time}</h2>
              {apt.patient_name && <p className="text-muted-foreground mt-1">Patient: <span className="font-medium text-foreground">{apt.patient_name}</span></p>}
            </div>
            <span className={`px-4 py-2 rounded-full font-bold shadow-sm bg-green-500/20 text-green-700 dark:text-green-400`}>
              {apt.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-6">
            {apt.symptoms && (
              <div className="animate-fade-in-up delay-100">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-muted-foreground" /> Reported Symptoms</h3>
                <p className="text-muted-foreground p-5 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5">{apt.symptoms}</p>
              </div>
            )}

            {apt.pre_visit_summary && (
              <div className="animate-fade-in-up delay-200">
                <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-400 flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Pre-Visit Summary</h3>
                <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-sm text-sm [&>p]:mb-2 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                  <ReactMarkdown>{apt.pre_visit_summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {apt.doctor_notes && (
              <div className="animate-fade-in-up delay-300">
                <h3 className="text-lg font-semibold mb-2 text-primary flex items-center gap-2"><FileText className="w-5 h-5" /> Clinical Notes</h3>
                <p className="text-foreground p-5 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5 whitespace-pre-wrap">{apt.doctor_notes}</p>
              </div>
            )}
            
            {apt.post_visit_summary && (
              <div className="animate-fade-in-up delay-400">
                <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400 flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Post-Visit Summary (Patient Facing)</h3>
                <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl shadow-sm text-sm [&>p]:mb-4 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6">
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
