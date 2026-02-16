
import React, { useState, useEffect } from 'react';
import { Download, X, Zap, ShieldCheck, Sparkles, Share, Check, ArrowRight, LayoutGrid } from 'lucide-react';

const PWAInstallOverlay: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // 2. Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 3. Capture the install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // If we have the prompt, definitely show the overlay
      if (!isPWA) setShowOverlay(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Persistence Logic: If not installed, show overlay after 2.5 seconds
    if (!isPWA) {
      const timer = setTimeout(() => {
        const hasDismissed = sessionStorage.getItem('edrive_install_dismissed');
        if (!hasDismissed) {
          setShowOverlay(true);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert("To install: Tap the 'Share' icon in your browser and select 'Add to Home Screen'.");
      setShowOverlay(false);
      return;
    }

    if (!deferredPrompt) {
      alert("Please open your browser menu and select 'Install App' or 'Add to Home Screen'.");
      setShowOverlay(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowOverlay(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('edrive_install_dismissed', 'true');
    setShowOverlay(false);
  };

  if (isStandalone || !showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center p-4 animate-in fade-in duration-500 overflow-hidden pb-safe">
      {/* Backdrop with heavy blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleDismiss} />
      
      {/* The Stylish UI Container - Restored height and prominence */}
      <div className="relative w-full max-w-sm bg-zinc-950 rounded-[3.5rem] border border-[#c1ff22]/20 shadow-[0_-20px_80px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-bottom-10 duration-700 max-h-[96vh] flex flex-col">
        
        {/* Top Gradient/Glow Effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#c1ff22]/15 to-transparent pointer-events-none" />
        
        <div className="p-8 space-y-7 relative z-10 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-start">
             <div className="relative">
                <div className="absolute inset-0 bg-[#c1ff22] blur-3xl opacity-20 animate-pulse" />
                <div className="relative bg-[#c1ff22] w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-black shadow-[0_15px_30px_rgba(193,255,34,0.4)]">
                  <span className="text-4xl font-black italic transform -skew-x-6">e</span>
                </div>
             </div>
             <button onClick={handleDismiss} className="p-3.5 bg-white/5 rounded-2xl text-zinc-500 active:scale-90 transition-transform">
               <X className="w-6 h-6" />
             </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-[#c1ff22]" />
               <span className="text-[10px] font-black uppercase text-[#c1ff22] tracking-[0.3em]">Hafizabad Official App</span>
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
              Get the Full <br/> <span className="text-[#c1ff22]">Experience</span>
            </h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed italic">
              Enjoy faster rides and zero browser delays.
            </p>
          </div>

          {/* Urdu Text Area - Restored Padding */}
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2.5rem] text-center shadow-inner">
             <p className="text-[17px] text-zinc-100 leading-relaxed font-medium italic" dir="rtl">
               اب آپ کے شہر <span className="font-black text-[#c1ff22] not-italic">حافظ آباد</span> میں eDrive بالکل مفت، ابھی انسٹال کریں
             </p>
          </div>

          {isIOS ? (
            <div className="bg-[#3b82f6]/10 p-6 rounded-[2rem] border border-[#3b82f6]/20 flex items-center gap-5">
              <div className="p-3 bg-[#3b82f6] rounded-2xl shadow-lg">
                <Share className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black text-white uppercase tracking-widest leading-tight">
                  Tap 'Share' and <br/> <span className="text-[#c1ff22]">Add to Home Screen</span>
                </p>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleInstall}
              className="group w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase text-base shadow-[0_20px_50px_rgba(193,255,34,0.3)] flex items-center justify-center gap-4 active:scale-95 transition-all relative overflow-hidden italic tracking-tighter"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
              <Download className="w-6 h-6" />
              <span>Install eDrive</span>
              <ArrowRight className="w-5 h-5 opacity-30" />
            </button>
          )}

          <div className="text-center pt-2">
             <p className="text-[8px] font-black text-zinc-800 uppercase tracking-[0.5em]">eDrive Hafizabad HQ • Version 1.2</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallOverlay;
