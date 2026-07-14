"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      
      // HttpOnly cookie is set automatically.
      const { role } = response.data;
      
      // Store user info in localStorage for UI purposes (not auth purposes)
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", response.data.user_id);

      if (role === "admin") router.push("/admin");
      else if (role === "doctor") router.push("/doctor");
      else router.push("/patient");

    } catch (err: any) {
      let errorMsg = "Login failed. Check your credentials.";
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
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center mt-4 text-sm text-muted-foreground">
            Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
