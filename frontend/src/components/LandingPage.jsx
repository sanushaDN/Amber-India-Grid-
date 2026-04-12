import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Focus, Fingerprint, Globe, ChevronRight, Search, Activity, ScanFace, Lock } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-['Outfit'] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#020617] to-[#020617] -z-10" />
      <div className="security-grid" />
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Navigation Layer */}
      <nav className="w-full flex justify-between items-center px-8 py-6 z-10 border-b border-indigo-500/20 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShieldAlert size={32} className="text-amber-500" />
            <div className="absolute -inset-1 bg-amber-500/20 blur rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-100">AMBER<span className="text-teal-400">GRID</span></h1>
            <p className="text-[10px] tracking-widest text-slate-400 font-monouppercase">Sovereign Missing Person Network</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/80 transition-all font-mono text-sm tracking-wider group"
        >
          <Lock size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" /> 
          OFFICER PORTAL
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-mono tracking-wider mb-8 animate-fade-in-up">
          <Activity size={14} className="animate-pulse" />
          SYSTEM ONLINE • GLOBALLY SYNCED
        </div>
        
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 animate-slide-up leading-tight">
          Crowdsourced Intelligence.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500">
            Real-Time Interception.
          </span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          AMBER-India is the first decentralized biometric tracking grid. 
          Upload a live sighting to instantly ping law enforcement tactical dashboards with a 99.8% precision facial hash match.
        </p>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <button 
            onClick={() => navigate('/report')}
            className="group relative px-8 py-4 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_40px_-5px_rgba(45,212,191,0.5)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <ScanFace className="relative z-10" />
            <span className="relative z-10 tracking-wide">REPORT A SIGHTING</span>
            <ChevronRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-24 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          
          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 hover:border-teal-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Fingerprint size={28} className="text-teal-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-wide">Neural Biometrics</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">
              Our advanced DeepFace algorithm securely hashes facial coordinates instead of images, preserving privacy while ensuring perfect accuracy.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 hover:border-amber-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe size={28} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-wide">Socket Mapping</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">
              Sightings are triangulated using GPS coordinates and pushed over WebSockets to live Tactical Dashboards without reloading.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 hover:border-indigo-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-wide">Tactical Recovery</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">
              Active cases remain encrypted in an immutable SQL grid until law enforcement securely overrides the system to dispatch units.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-800/50 mt-12 bg-slate-950/80 z-10">
        <p className="text-slate-500 text-sm font-mono tracking-wider">
          © 2026 AMBER-India GRID • Government Internal Protocol • Sentinel Elite V7.0
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
