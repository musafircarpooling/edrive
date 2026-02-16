
import React, { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  "Your city app is loading...",
  "Routing to Hafizabad...",
  "Setting up data...",
  "Connecting to city fleet...",
  "Almost there...",
  "Ao Chalen!"
];

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const duration = 6000; // 6 seconds total
    const intervalTime = 60; // Update every 60ms
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    // Rotate messages every 1.2 seconds
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);

    return () => {
      clearInterval(timer);
      clearInterval(messageTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50 overflow-hidden">
      <div className="relative mb-12">
        {/* Subtle static Glow */}
        <div className="absolute inset-0 scale-150 bg-[#c1ff22] opacity-5 rounded-full blur-3xl"></div>
        
        {/* Static Logo Container */}
        <div className="relative bg-[#c1ff22] w-32 h-32 rounded-[32px] flex items-center justify-center shadow-[0_20px_60px_rgba(193,255,34,0.3)]">
          <span className="text-black text-7xl font-black italic tracking-tighter transform -skew-x-6">e</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-white text-5xl font-black tracking-tighter italic leading-none">
          e<span className="text-[#c1ff22]">Drive</span>
        </h1>
        <h2 className="text-white/80 text-xl font-bold uppercase tracking-tight italic">Hafizabad</h2>
        <p className="text-[#c1ff22] font-black tracking-[0.3em] uppercase text-[10px] opacity-80 pt-2">
          Your City Your Ride
        </p>
      </div>

      {/* Progress Container */}
      <div className="absolute bottom-24 w-full px-12 flex flex-col items-center gap-4">
        {/* Status Message */}
        <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] h-4 animate-pulse">
          {LOADING_MESSAGES[messageIndex]}
        </p>

        {/* Progress Bar Background */}
        <div className="w-full max-w-xs h-1 bg-zinc-900 rounded-full overflow-hidden relative border border-white/5">
          {/* Progress Bar Fill */}
          <div 
            className="h-full bg-[#c1ff22] shadow-[0_0_15px_#c1ff22] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage Counter */}
        <span className="text-zinc-700 text-[10px] font-black tabular-nums tracking-widest">
          {Math.floor(progress)}%
        </span>
      </div>

      <div className="absolute bottom-12 text-zinc-800 text-[8px] font-black uppercase tracking-[0.5em]">
        Official Fleet Console
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
