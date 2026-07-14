"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Control Panel</h1>
            <p className="text-muted-foreground mt-1">Manage system configurations and personnel</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4">Doctor Management</h2>
            <p className="text-muted-foreground mb-6">Onboard new doctors and view existing ones.</p>
            
            {!showForm ? (
              <div className="space-y-4">
                <Button onClick={() => setShowForm(true)} variant="default" className="w-full">Onboard New Doctor</Button>
                
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Doctor Directory ({doctors.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {doctors.map(d => (
                      <div key={d.id} className="p-3 bg-secondary rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">Doctor ID: {d.id}</p>
                          <p className="text-sm text-muted-foreground">{d.specialization} - {d.experience_years} YOE</p>
                        </div>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                      </div>
                    ))}
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

          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4">System Health</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                <span className="font-medium text-sm">Background Scheduler</span>
                <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded-full">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                <span className="font-medium text-sm">Gemini AI Service</span>
                <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded-full">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                <span className="font-medium text-sm">PostgreSQL Serverless</span>
                <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded-full">ONLINE</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
