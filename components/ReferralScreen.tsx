
import React, { useState } from 'react';
import { ArrowLeft, Gift, Share2, Copy, Check, MessageSquare, Star, Sparkles, TrendingUp } from 'lucide-react';
import { UserProfile } from '../types';

interface ReferralScreenProps {
  userProfile: UserProfile;
  onBack: () => void;
}

const ReferralScreen: React.FC<ReferralScreenProps> = ({ userProfile, onBack }) => {
  const [copied, setCopied] = useState(false);
  const referralCode = userProfile.referralCode || (userProfile.name ? userProfile.name.toUpperCase().slice(0, 4) : "EDRV") + Math.floor(1000 + Math.random() * 9000);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const appUrl = window.location.origin;
    const message = `Assalam-o-Alaikum! eDrive Hafizabad join kren aur behtareen rides payen. Mera referral code use kren: *${referralCode}* aur reward points hasil kren! Download eDrive now: ${appUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'eDrive Hafizabad', text: message }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      <header className="p-6 pt-12 flex items-center gap-5 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-2xl text-[#c1ff22] active:scale-90 transition-transform">
          <ArrowLeft className="w-7 h-7" />
        </button>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">Refer & <span className="text-[#c1ff22]">Earn</span></h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        <div className="relative py-10 flex flex-col items-center justify-center text-center space-y-6">
           <div className="relative">
              <div className="absolute inset-0 bg-[#c1ff22] blur-[80px] opacity-10 animate-pulse" />
              <div className="w-32 h-32 bg-[#c1ff22]/10 border-2 border-[#c1ff22]/30 rounded-[3rem] flex items-center justify-center relative shadow-2xl">
                 <Gift className="w-16 h-16 text-[#c1ff22]" />
                 <div className="absolute -top-2 -right-2 bg-[#c1ff22] p-2 rounded-xl shadow-lg border-2 border-black">
                    <Sparkles className="w-4 h-4 text-black animate-spin duration-[4000ms]" />
                 </div>
              </div>
           </div>
           
           <div className="space-y-2">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Share the <br/> <span className="text-[#c1ff22]">Hafizabad Spirit</span></h2>
              <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest leading-relaxed px-6">Invite friends to eDrive. Both will get reward points after their first trip!</p>
           </div>
        </div>

        <div className="bg-zinc-900/50 rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center space-y-6 shadow-2xl">
           <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">Your Unique Code</p>
           <div className="w-full flex items-center gap-3">
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-5 text-center font-black text-2xl tracking-[0.2em] text-[#c1ff22] italic">
                 {referralCode}
              </div>
              <button 
                onClick={handleCopy}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${copied ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}
              >
                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 space-y-2">
              <div className="w-10 h-10 bg-[#c1ff22]/10 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#c1ff22]" /></div>
              <p className="text-xl font-black text-white italic">{userProfile.rewardPoints || 0}</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Total Earned</p>
           </div>
           <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 space-y-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><Star className="w-5 h-5 text-blue-500" /></div>
              <p className="text-xl font-black text-white italic">0</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Successful Referrals</p>
           </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent fixed bottom-0 left-0 right-0 z-50">
         <button 
           onClick={handleShare}
           className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.2rem] font-black uppercase text-base shadow-[0_20px_40px_rgba(193,255,34,0.3)] flex items-center justify-center gap-4 active:scale-95 transition-all"
         >
           <Share2 className="w-6 h-6" />
           Invite via WhatsApp
         </button>
      </div>
    </div>
  );
};

export default ReferralScreen;
