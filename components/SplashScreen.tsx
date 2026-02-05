import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50 overflow-hidden">
      <div className="relative">
        {/* Animated Glow */}
        <div className="absolute inset-0 scale-150 bg-[#c1ff22] opacity-5 rounded-full animate-pulse blur-3xl"></div>
        
        {/* Logo Container - Jumping Animation Added */}
        <div className="relative bg-[#c1ff22] w-32 h-32 rounded-[32px] flex items-center justify-center shadow-[0_20px_60px_rgba(193,255,34,0.4)] animate-jump">
          <span className="text-black text-7xl font-black italic tracking-tighter transform -skew-x-6">e</span>
        </div>
        
        {/* Shadow below the jumping logo */}
        <div className="w-24 h-2 bg-black/40 blur-md rounded-full mx-auto mt-4 animate-shadow-scale"></div>
      </div>

      <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-white text-5xl font-black tracking-tighter italic">
          e<span className="text-[#c1ff22]">Drive</span>
        </h1>
        <p className="text-[#c1ff22] mt-3 font-black tracking-[0.4em] uppercase text-[10px] animate-pulse">
          Ao Chalen
        </p>
      </div>

      <div className="absolute bottom-12 text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">
        Hafizabad City Fleet
      </div>

      <style>{`
        @keyframes jump {
          0%, 100% {
            transform: translateY(0);
            animation-timing-function: ease-out;
          }
          50% {
            transform: translateY(-40px);
            animation-timing-function: ease-in;
          }
        }
        @keyframes shadow-scale {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.4;
          }
          50% {
            transform: scaleX(0.5);
            opacity: 0.1;
          }
        }
        .animate-jump {
          animation: jump 0.8s infinite;
        }
        .animate-shadow-scale {
          animation: shadow-scale 0.8s infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;