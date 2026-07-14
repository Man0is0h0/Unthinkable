"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Create the base User
      const userRes = await api.post("/auth/signup", { name, email, password, role });
      const userId = userRes.data.user_id;

      // 2. Create the specific Profile based on role
      if (role === "patient") {
        await api.post("/profiles/patients", { user_id: userId, age: 30, gender: "Other", blood_group: "O+" });
      } else if (role === "doctor") {
        await api.post("/admin/doctors", { user_id: userId, specialization: "General", experience_years: 5, slot_duration: 30 });
      }

      // 3. Log them in automatically
      const loginRes = await api.post("/auth/login", { email, password });
      localStorage.setItem("userRole", loginRes.data.role);
      localStorage.setItem("userId", loginRes.data.user_id);

      if (role === "admin") router.push("/admin");
      else if (role === "doctor") router.push("/doctor");
      else router.push("/patient");

    } catch (err: any) {
      let errorMsg = "Signup failed. Please try again.";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => `${d.loc[d.loc.length-1]}: ${d.msg}`).join(', ');
        } else {
          errorMsg = err.response.data.detail;
        }
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Unthinkable Health</h1>
          <p className="text-muted-foreground mt-2">Create a new account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2 pb-2">
            <label className="text-sm font-medium">I am a...</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
            >
              <option value="patient" className="bg-background">Patient</option>
              <option value="admin" className="bg-background">Admin</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>

          <div className="text-center mt-4 text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
