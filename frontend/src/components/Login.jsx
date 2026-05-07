import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, User, ChevronRight, Activity, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticating) return;
    const messages = [
      'Connecting...',
      'Checking credentials...',
      'Signing you in...',
      'Welcome back! Loading dashboard...'
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < messages.length) { setStatusText(messages[i]); i++; }
      else { clearInterval(iv); }
    }, 450);
    return () => clearInterval(iv);
  }, [isAuthenticating]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const API_BASE = 'https://amber-backend-flng.onrender.com';
    try {
      setStatusText('Starting server — this may take up to 50 seconds...');
      const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', body: formData, signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setTimeout(() => navigate('/dashboard'), 1800);
      } else {
        setError('Incorrect username or password. Please try again.');
        setIsAuthenticating(false);
        setStatusText('Ready');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setError(err.name === 'AbortError' ? 'Server is starting up. Please wait 30 seconds and try again.' : 'Could not reach the server. Please check your connection.');
      setIsAuthenticating(false);
      setStatusText('Ready');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />
      
      <div className="w-full max-w-[480px] z-10 animate-slide-up">
        <div className="glass-panel p-10 md:p-14 rounded-[40px] shadow-premium border border-white relative overflow-hidden bg-white/70 backdrop-blur-xl">
          <div className="text-center mb-12 relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 shadow-xl shadow-blue-200 mb-8 group transition-all hover:scale-110 hover:rotate-3">
              <ShieldAlert size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">
              AMBER<span className="text-blue-600">-India</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Official Enforcement Access</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-10 relative z-10">
            <Activity size={12} className={`${isAuthenticating ? 'text-blue-600 animate-pulse' : 'text-gray-300'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest font-mono transition-colors ${isAuthenticating ? 'text-blue-600' : 'text-gray-400'}`}>
              {statusText}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs mb-8 text-center font-bold relative z-10 animate-slide-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="group">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Personnel ID</label>
                <div className="relative">
                  <User className="absolute left-5 top-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input type="text" placeholder="e.g. OFFICER_77" required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 text-gray-900 placeholder-gray-300 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm font-bold shadow-sm"
                    value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Security Token</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input type="password" placeholder="••••••••" required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-14 text-gray-900 placeholder-gray-300 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm font-bold shadow-sm"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={isAuthenticating}
              className="w-full bg-gradient-premium hover:opacity-95 text-white py-5 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-3 group active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {isAuthenticating ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-black uppercase tracking-widest">Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-widest">Authorise Session</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-14 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-8 relative z-10">
            <span className="flex items-center gap-2"><Globe size={13} className="text-gray-300" /> Ministry of Home Affairs</span>
            <span className="opacity-50 tracking-tighter font-mono italic">Secure Terminal v3.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
