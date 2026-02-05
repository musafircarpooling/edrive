
import React, { useState, useEffect } from 'react';
/* Added Check to the imports from lucide-react */
import { Download, X, Zap, ShieldCheck, Sparkles, Share, Check } from 'lucide-react';

const PWAInstallOverlay: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // 2. Check if iOS (iOS doesn't support beforeinstallprompt)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 3. Listen for the Chrome/Android install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isPWA) setShowOverlay(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Show manual instructions for iOS if not installed
    if (ios && !isPWA) {
      const hasShownPrompt = localStorage.getItem('ios-pwa-prompt-shown');
      if (!hasShownPrompt) {
        setShowOverlay(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert("To install: Tap the 'Share' icon in your browser and select 'Add to Home Screen'.");
      localStorage.setItem('ios-pwa-prompt-shown', 'true');
      setShowOverlay(false);
      return;
    }

    if (!deferredPrompt) {
      alert("App is already installed or your browser doesn't support instant installation.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowOverlay(false);
    }
  };

  if (isStandalone || !showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-sm bg-zinc-900 rounded-[3rem] p-8 border border-[#c1ff22]/20 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start">
          <div className="bg-[#c1ff22] w-14 h-14 rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(193,255,34,0.3)]">
            <Zap className="w-8 h-8 fill-current" />
          </div>
          <button onClick={() => setShowOverlay(false)} className="p-2 bg-white/5 rounded-full text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
            Install <span className="text-[#c1ff22]">eDrive</span>
          </h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-loose">
            {isIOS 
              ? "Add eDrive to your home screen for the full Hafizabad experience." 
              : "Install now for faster access, offline maps, and instant ride alerts."}
          </p>
        </div>

        {isIOS ? (
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Share className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase leading-tight">
              Tap share button and then <br/> <span className="text-white">"Add to Home Screen"</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2">
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#c1ff22]" />
              <span className="text-[8px] font-black uppercase text-zinc-400">Secure</span>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c1ff22]" />
              <span className="text-[8px] font-black uppercase text-zinc-400">Fast</span>
            </div>
          </div>
        )}

        <button 
          onClick={handleInstall}
          className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {isIOS ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          {isIOS ? "Got it" : "Install eDrive"}
        </button>
      </div>
    </div>
  );
};

export default PWAInstallOverlay;
