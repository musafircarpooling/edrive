
import React from 'react';
import { ArrowRight, LogIn, ShieldCheck, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-[#c1ff22]/5 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-[#c1ff22]/5 blur-[100px] rounded-full" />

      <div className="flex-1 flex flex-col items-center justify-center space-y-16 animate-in fade-in zoom-in duration-700">
        {/* Static Brand Identity */}
        <div className="relative">
          {/* Static Glow */}
          <div className="absolute inset-0 scale-150 bg-[#c1ff22] opacity-10 rounded-full blur-3xl"></div>
          
          {/* Logo Container - Static Design */}
          <div className="relative bg-[#c1ff22] w-32 h-32 rounded-[32px] flex items-center justify-center shadow-[0_20px_60px_rgba(193,255,34,0.4)] z-10">
            <span className="text-black text-7xl font-black italic tracking-tighter transform -skew-x-6">e</span>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
            e<span className="text-[#c1ff22]">Drive</span>
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[#c1ff22] font-black tracking-[0.4em] uppercase text-xs italic">Ao Chalen</p>
            <div className="h-0.5 w-12 bg-[#c1ff22]/30 rounded-full" />
          </div>
          <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed mt-4">
            Hafizabad's most reliable and affordable city fleet.
          </p>
        </div>
      </div>

      <div className="space-y-4 pb-8 relative z-10 animate-in slide-in-from-bottom-10 duration-1000">
        <button 
          onClick={onGetStarted}
          className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.2rem] font-black text-lg uppercase shadow-[0_20px_40px_rgba(193,255,34,0.2)] flex items-center justify-center gap-3 active:scale-[0.98] transition-all italic tracking-tight"
        >
          Get Started <ArrowRight className="w-6 h-6" />
        </button>

        <button 
          onClick={onLogin}
          className="w-full bg-transparent border-2 border-zinc-800 text-zinc-100 py-6 rounded-[2.2rem] font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-[0.98] active:bg-white/5 transition-all tracking-widest"
        >
          <LogIn className="w-5 h-5 text-[#c1ff22]" />
          I'm already eDrive user
        </button>

        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Secure Registry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">City Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
