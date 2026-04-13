import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Focus, Fingerprint, Globe, ChevronRight, Search, Activity, ScanFace, Lock, Bell, X, ShieldCheck } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showMock, setShowMock] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Mock Notification Trigger
  const triggerDemo = () => {
    setShowMock(true);
    setTimeout(() => {
      const audio = new Audio('https://www.soundjay.com/buttons/beep-07a.mp3');
      audio.play().catch(() => {});
    }, 500);
  };

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

        {/* NEW: Sovereign Grid Enrollment */}
        <div className="mt-20 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="glass-panel p-1 border border-white/5 bg-white/[0.02]">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 py-10">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-4 text-amber-500">
                  <Bell size={20} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">Real-Time Broadcast Enrollment</span>
                </div>
                <h3 className="text-3xl font-bold mb-4">Join the Sovereign Watch.</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Enroll your device in the AMBER-India national grid to receive instant, 
                  location-based push alerts even when your browser is closed. 
                  Zero latency. Infinite vigilance.
                </p>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setSubscribed(true); triggerDemo(); }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${subscribed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                  >
                    {subscribed ? <ShieldCheck size={20} /> : <Bell size={20} />}
                    {subscribed ? 'GRID LINKED' : 'ENROLL DEVICE'}
                  </button>
                  {!subscribed && (
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest animate-pulse">
                      AWAITING HANDSHAKE...
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full md:w-[320px] h-[160px] rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center group cursor-pointer" onClick={triggerDemo}>
                <div className="scanline" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Activity size={18} className="text-amber-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Preview Background Intel</p>
                  <p className="text-[10px] text-slate-600 italic">Click to simulate lock-screen alert</p>
                </div>
              </div>
            </div>
          </div>
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

      {/* NATIVE LOCK-SCREEN MOCKUP OVERLAY */}
      {showMock && (
        <div className="mock-lock-screen" onClick={() => setShowMock(false)}>
          <div className="lock-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="lock-date">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          
          <div className="mock-notification" onClick={(e) => e.stopPropagation()}>
            <div className="notification-header">
              <div className="notification-icon">
                <ShieldAlert size={12} />
              </div>
              <span className="notification-title">AMBER GRID • SYSTEM BROADCAST</span>
              <span className="notification-time">1m ago</span>
            </div>
            <div className="notification-body">
              <h4 className="notification-body-title">⚠️ AMBER ALERT: CRITICAL BROADCAST</h4>
              <p className="notification-body-text">
                A new missing person case has been registered in the Sovereign Grid. 
                Intelligence indicates sightings in your proximity. Tap for biometric coordinates.
              </p>
            </div>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-2 text-white/40 animate-bounce">
            <ChevronRight size={24} className="-rotate-90" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tap anywhere to dismiss</span>
          </div>

          <button 
            onClick={() => setShowMock(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/60"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
