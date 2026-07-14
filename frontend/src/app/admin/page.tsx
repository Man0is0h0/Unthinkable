"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { LogOut, UserPlus, Server, ShieldCheck, Activity } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    experience_years: 5,
    slot_duration: 30
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get("/admin/doctors");
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors", err);
    }
  };

  const handleLogout = async () => {
    await api.post("/auth/logout");
    localStorage.clear();
    router.push("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // 1. Create User
      const userRes = await api.post("/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "doctor"
      });

      // 2. Create Doctor Profile
      await api.post("/admin/doctors", {
        user_id: userRes.data.user_id,
        specialization: formData.specialization,
        experience_years: formData.experience_years,
        slot_duration: formData.slot_duration,
        working_hours: { "monday": { "start": "09:00", "end": "17:00" }, "tuesday": { "start": "09:00", "end": "17:00" }, "wednesday": { "start": "09:00", "end": "17:00" }, "thursday": { "start": "09:00", "end": "17:00" }, "friday": { "start": "09:00", "end": "17:00" } }
      });

      setShowForm(false);
      fetchDoctors();
      setFormData({ name: "", email: "", password: "", specialization: "", experience_years: 5, slot_duration: 30 });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to onboard doctor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center glass-panel p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3"><ShieldCheck className="w-8 h-8" /> Admin Portal</h1>
            <p className="text-muted-foreground mt-1">Platform operations and management</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 rounded-xl">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-3xl shadow-lg animate-fade-in-up">
            <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2"><UserPlus className="w-6 h-6 text-primary" /> Doctor Management</h2>
            <p className="text-muted-foreground mb-6">Onboard new doctors and view existing ones.</p>
            
            {!showForm ? (
              <div className="space-y-4">
                <Button onClick={() => setShowForm(true)} variant="default" className="w-full rounded-xl h-12 shadow-md">
                  <UserPlus className="w-5 h-5 mr-2" /> Onboard New Doctor
                </Button>
                
                <div className="mt-8">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">Doctor Directory <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{doctors.length}</span></h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {doctors.map((d, index) => {
                      const delayClass = `delay-${((index % 5) + 1) * 100}`;
                      return (
                      <div key={d.id} className={`p-4 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5 flex justify-between items-center animate-fade-in-up ${delayClass}`}>
                        <div>
                          <p className="font-bold text-primary">Doctor ID: {d.id}</p>
                          <p className="text-sm text-muted-foreground">{d.specialization} • {d.experience_years} YOE</p>
                        </div>
                        <span className="text-xs font-bold shadow-sm bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          Active
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <input
                  required
                  placeholder="Full Name"
                  className="w-full p-2 rounded border bg-background"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  className="w-full p-2 rounded border bg-background"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
                <input
                  required
                  type="password"
                  placeholder="Temporary Password"
                  className="w-full p-2 rounded border bg-background"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <input
                  required
                  placeholder="Specialization (e.g. Cardiology)"
                  className="w-full p-2 rounded border bg-background"
                  value={formData.specialization}
                  onChange={e => setFormData({...formData, specialization: e.target.value})}
                />
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 rounded border bg-background"
                      value={formData.experience_years}
                      onChange={e => setFormData({...formData, experience_years: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Slot Duration (Mins)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      className="w-full p-2 rounded border bg-background"
                      value={formData.slot_duration}
                      onChange={e => setFormData({...formData, slot_duration: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Creating..." : "Save Doctor"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="glass-panel p-8 rounded-3xl shadow-lg animate-fade-in-up delay-100">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><Server className="w-6 h-6 text-primary" /> System Health</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5">
                <span className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Background Scheduler</span>
                <span className="text-green-700 dark:text-green-400 font-bold text-xs bg-green-500/20 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ACTIVE
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5">
                <span className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Gemini AI Service</span>
                <span className="text-green-700 dark:text-green-400 font-bold text-xs bg-green-500/20 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/30 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/5">
                <span className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Email Service</span>
                <span className="text-green-700 dark:text-green-400 font-bold text-xs bg-green-500/20 px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> OPERATIONAL
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
