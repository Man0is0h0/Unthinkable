import Link from "next/link";
import { ArrowRight, HeartPulse, Shield, Clock, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            Unthinkable
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-medium mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Next-Gen Healthcare Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          Healthcare management,{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
            reimagined.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          Connect patients and doctors seamlessly. Manage appointments, track health records, and streamline your medical practice with Unthinkable.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <Link
            href="/signup"
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-semibold text-lg hover:scale-105 transition-all shadow-xl"
          >
            Join as a Patient
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-full font-semibold text-lg hover:scale-105 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            Doctor Portal
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Instant Booking</h3>
            <p className="text-slate-600 dark:text-slate-400">Schedule appointments in seconds. Real-time availability tracking for all our medical professionals.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Secure Records</h3>
            <p className="text-slate-600 dark:text-slate-400">Your health data is encrypted and securely stored. Only accessible by you and your authorized doctors.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Expert Care</h3>
            <p className="text-slate-600 dark:text-slate-400">Connect with top-rated medical professionals. Read reviews and find the right specialist for your needs.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
