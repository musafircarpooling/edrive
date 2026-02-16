
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Wallet, Users, Info, ChevronRight, Copy, Check, Share2, 
  Banknote, Smartphone, CreditCard, Loader2, Award, Sparkles, TrendingUp,
  Package, Car, ShieldCheck, AlertCircle
} from 'lucide-react';
import { UserProfile, WithdrawRequest } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';

interface AffiliateProgramScreenProps {
  userProfile: UserProfile;
  onBack: () => void;
}

const AffiliateProgramScreen: React.FC<AffiliateProgramScreenProps> = ({ userProfile, onBack }) => {
  const [activeTab, setActiveTab] = useState<'referrals' | 'withdraw'>('referrals');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'Easypaisa' | 'JazzCash' | 'PayPal' | 'Bank'>('Easypaisa');
  const [accountDetails, setAccountDetails] = useState("");
  const [bankName, setBankName] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  
  // Local state for the referral ID - initialize from profile or empty
  const [activeReferralId, setActiveReferralId] = useState(userProfile.referralId || "");

  // Targets
  const target1 = 10;
  const target2 = 50;
  const currentCount = userProfile.referralCount || 0;
  const progress = Math.min((currentCount / target1) * 100, 100);

  useEffect(() => {
    // Legacy support & Permanence: Ensure ID exists in Firestore and is fixed
    const syncReferralId = async () => {
      if (!userProfile.uid) return;

      try {
        const userRef = doc(db, 'users', userProfile.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.referralId) {
            // Already has a fixed ID
            setActiveReferralId(String(data.referralId));
          } else {
            // Missing ID (Legacy User): Generate a permanent one now
            const newFixedId = "EDR" + Math.floor(10000 + Math.random() * 89999);
            await updateDoc(userRef, { referralId: newFixedId });
            setActiveReferralId(newFixedId);
            
            // Sync local storage so it persists in the session
            const sessionData = JSON.parse(localStorage.getItem('edrive_user_session') || '{}');
            localStorage.setItem('edrive_user_session', JSON.stringify({ ...sessionData, referralId: newFixedId }));
          }
        }
      } catch (e) {
        console.error("Hafizabad HQ: ID Sync Error", e);
      }
    };

    syncReferralId();

    const q = query(collection(db, 'users'), where('parentUserId', '==', userProfile.uid));
    const unsub = onSnapshot(q, (snap) => {
      // STRICT SANITIZATION to avoid circular structure errors
      setReferrals(snap.docs.map(d => {
        const data = d.data();
        return {
          name: String(data.name || ""),
          userType: String(data.userType || "CITIZEN"),
          referralCount: Number(data.referralCount || 0)
        };
      }));
    });
    
    const wQ = query(collection(db, 'withdraw_requests'), where('userId', '==', userProfile.uid));
    const wUnsub = onSnapshot(wQ, (snap) => {
      // STRICT SANITIZATION
      setWithdrawHistory(snap.docs.map(d => {
        const data = d.data();
        return {
          id: String(d.id),
          userId: String(data.userId || ""),
          userName: String(data.userName || ""),
          amount: Number(data.amount || 0),
          method: (data.method || "Easypaisa") as any,
          accountDetails: String(data.accountDetails || ""),
          bankName: data.bankName ? String(data.bankName) : undefined,
          status: (data.status || "pending") as any,
          createdAt: String(data.createdAt || "")
        } as WithdrawRequest;
      }));
    });

    return () => { unsub(); wUnsub(); };
  }, [userProfile.uid]);

  const handleCopyId = () => {
    if (!activeReferralId) return;
    navigator.clipboard.writeText(activeReferralId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!activeReferralId) return;
    const text = `Join eDrive! Use my referral code: *${activeReferralId}* to get exclusive benefits. Hafizabad's best ride sharing app. Download now!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleWithdraw = async () => {
    setWithdrawError("");
    setWithdrawSuccess(false);

    if (userProfile.affiliateBalance < 5000) {
      setWithdrawError("Minimum balance required is PKR 5,000.");
      return;
    }
    const activityCount = (userProfile.totalRides || 0) + (userProfile.totalOrders || 0);
    if (activityCount < 10) {
      setWithdrawError("Minimum 10 completed rides/orders required.");
      return;
    }
    if (!accountDetails) {
      setWithdrawError("Please enter account details.");
      return;
    }

    setIsLoading(true);
    try {
      const amount = userProfile.affiliateBalance;
      await addDoc(collection(db, 'withdraw_requests'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        amount,
        method: withdrawMethod,
        accountDetails,
        bankName: withdrawMethod === 'Bank' ? bankName : "",
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', userProfile.uid!), {
        affiliateBalance: 0
      });

      setWithdrawSuccess(true);
      setAccountDetails("");
      setBankName("");
    } catch (e) {
      setWithdrawError("Transaction failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const RuleItem = ({ text }: { text: string }) => (
    <div className="flex gap-3 items-start">
      <div className="w-1 h-1 bg-[#C6FF00] rounded-full mt-1.5 shrink-0" />
      <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-tight">{text}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#1A0A2E] text-white overflow-hidden animate-in fade-in">
      <header className="px-6 pt-12 pb-4 flex items-center gap-4 shrink-0 bg-[#6A0DAD]/20 backdrop-blur-xl border-b border-white/5">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-2xl text-[#C6FF00] active:scale-90 transition-transform"><ArrowLeft className="w-6 h-6" /></button>
        <div>
          <h1 className="text-xl font-black italic uppercase text-white leading-none">Affiliate <span className="text-[#C6FF00]">Program</span></h1>
          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mt-1">Growth Partnership HQ</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
        {/* Wallet Section */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-[#6A0DAD] to-[#4B0082] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
             <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Wallet className="w-48 h-48" /></div>
             <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">Wallet Balance</p>
                      <h2 className="text-4xl font-black italic text-white mt-1 tracking-tighter">PKR {userProfile.affiliateBalance?.toLocaleString() || 0}</h2>
                   </div>
                   <div className="bg-[#C6FF00] text-black px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Active</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/40 uppercase mb-1">Referrals</p>
                      <p className="text-xl font-black italic text-[#C6FF00]">{userProfile.referralCount || 0}</p>
                   </div>
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-white/40 uppercase mb-1">Target Status</p>
                      <p className="text-xl font-black italic text-[#C6FF00]">{userProfile.levelTargetCompleted || 0}/50</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/60">
                      <span>Level 1 Progress</span>
                      <span>{currentCount}/{target1}</span>
                   </div>
                   <div className="h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-gradient-to-r from-[#C6FF00] to-green-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(198,255,0,0.5)]" style={{ width: `${progress}%` }} />
                   </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex gap-4 text-[8px] font-black uppercase text-white/30 tracking-widest">
                   <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Min 5,000 PKR</span>
                   <span className="flex items-center gap-1"><Award className="w-2.5 h-2.5" /> Min 10 Rides</span>
                </div>
             </div>
          </div>
        </div>

        {/* Affiliate Link Section */}
        <div className="px-6 space-y-3">
           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2 italic">Share & Grow</p>
           <div className="bg-zinc-900/60 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between gap-4">
              <div className="flex-1">
                 <p className="text-[8px] font-black text-zinc-600 uppercase mb-1.5">Your Referral ID</p>
                 <p className="text-xl font-black text-[#C6FF00] tracking-[0.2em] italic">
                   {activeReferralId || "SYNCING..."}
                 </p>
              </div>
              <div className="flex gap-2">
                 <button onClick={handleCopyId} className={`p-4 rounded-2xl transition-all active:scale-90 ${copied ? 'bg-green-500 text-black' : 'bg-white/5 text-[#C6FF00]'}`}>
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                 </button>
                 <button onClick={handleShare} className="p-4 bg-[#C6FF00] text-black rounded-2xl active:scale-90 transition-transform shadow-lg"><Share2 className="w-5 h-5" /></button>
              </div>
           </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 mt-10">
           <div className="flex bg-black/40 p-1.5 rounded-[2rem] border border-white/5">
              <button onClick={() => setActiveTab('referrals')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'referrals' ? 'bg-[#6A0DAD] text-white shadow-xl' : 'text-zinc-600'}`}>My Referrals</button>
              <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdraw' ? 'bg-[#6A0DAD] text-white shadow-xl' : 'text-zinc-600'}`}>Withdraw</button>
           </div>
        </div>

        <div className="p-6">
           {activeTab === 'referrals' ? (
             <div className="space-y-6">
                <div className="space-y-4">
                   {referrals.length === 0 ? (
                     <div className="py-12 text-center opacity-20">
                        <Users className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No partners joined yet</p>
                     </div>
                   ) : (
                     referrals.map((ref, idx) => (
                       <div key={idx} className="bg-zinc-900/40 p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-[#6A0DAD]/30 rounded-2xl flex items-center justify-center border border-[#6A0DAD]/30">
                                {ref.userType === 'PARTNER' ? <Car className="w-6 h-6 text-[#C6FF00]" /> : <Package className="w-6 h-6 text-[#C6FF00]" />}
                             </div>
                             <div>
                                <h4 className="font-black text-sm uppercase italic">{ref.name}</h4>
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">{ref.userType} • {ref.referralCount || 0} REFS</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-lg text-[7px] font-black uppercase">Registered</span>
                          </div>
                       </div>
                     ))
                   )}
                </div>

                <div className="h-px bg-white/5 w-full my-10" />

                <div className="space-y-8">
                   <div>
                      <div className="flex items-center gap-2 mb-4">
                         <Info className="w-4 h-4 text-[#C6FF00]" />
                         <h3 className="text-[10px] font-black uppercase text-[#C6FF00] tracking-[0.3em]">Affiliate Reward Structure</h3>
                      </div>
                      <div className="bg-black/30 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                         <RuleItem text="Refer your first 10 users and earn PKR 50 per user." />
                         <RuleItem text="After completing 10 referrals target, earn PKR 100 per user." />
                         <RuleItem text="After 50 successful referrals, earn PKR 200 per user." />
                         <RuleItem text="Referral reward is counted only when registration completes." />
                         <RuleItem text="Rewards are credited automatically to wallet." />
                      </div>
                   </div>

                   <div>
                      <div className="flex items-center gap-2 mb-4">
                         <TrendingUp className="w-4 h-4 text-[#C6FF00]" />
                         <h3 className="text-[10px] font-black uppercase text-[#C6FF00] tracking-[0.3em]">Level Commission</h3>
                      </div>
                      <div className="bg-black/30 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                         <RuleItem text="Earn 10% commission from your direct referral's rewards." />
                         <RuleItem text="Applies when your referred user hits their first 10-ref milestone." />
                         <RuleItem text="Citizen can refer Citizen only. Partner to Partner only." />
                         <RuleItem text="Cross-type referrals are strictly not allowed." />
                      </div>
                   </div>

                   <div>
                      <div className="flex items-center gap-2 mb-4">
                         <Banknote className="w-4 h-4 text-[#C6FF00]" />
                         <h3 className="text-[10px] font-black uppercase text-[#C6FF00] tracking-[0.3em]">Withdraw Rules</h3>
                      </div>
                      <div className="bg-black/30 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                         <RuleItem text="Wallet Balance ≥ PKR 5,000" />
                         <RuleItem text="Completed Rides/Orders ≥ 10" />
                         <RuleItem text="Processing time: 24–72 official hours." />
                         <RuleItem text="Fraud accounts will be suspended permanently." />
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="space-y-6 animate-in slide-in-from-right">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-2 italic">Select Payout Method</p>
                   <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'Easypaisa', icon: Smartphone },
                        { id: 'JazzCash', icon: Smartphone },
                        { id: 'Bank', icon: Banknote },
                        { id: 'PayPal', icon: CreditCard }
                      ].map(method => (
                        <button key={method.id} onClick={() => setWithdrawMethod(method.id as any)} className={`p-6 rounded-[1.8rem] border-2 flex flex-col items-center justify-center gap-3 transition-all ${withdrawMethod === method.id ? 'border-[#C6FF00] bg-[#C6FF00]/5 text-[#C6FF00]' : 'border-white/5 bg-black/20 text-zinc-600'}`}>
                           <method.icon className="w-6 h-6" />
                           <span className="text-[9px] font-black uppercase tracking-widest">{method.id}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-zinc-900/40 p-7 rounded-[2rem] border border-white/5 space-y-4">
                   <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Account Details</label>
                   {withdrawMethod === 'Bank' && (
                     <input className="bg-black/40 w-full p-5 rounded-2xl border border-white/5 text-sm font-bold outline-none focus:border-[#C6FF00]/30 transition-all mb-4" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
                   )}
                   <input className="bg-black/40 w-full p-5 rounded-2xl border border-white/5 text-sm font-bold outline-none focus:border-[#C6FF00]/30 transition-all" placeholder={withdrawMethod === 'PayPal' ? 'PayPal Email' : 'Account Number / Phone'} value={accountDetails} onChange={e => setAccountDetails(e.target.value)} />
                </div>

                {withdrawError && (
                  <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 flex items-center gap-3 text-rose-500 animate-in shake">
                     <AlertCircle className="w-5 h-5 shrink-0" />
                     <p className="text-[9px] font-black uppercase tracking-widest">{withdrawError}</p>
                  </div>
                )}

                {withdrawSuccess && (
                  <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20 flex items-center gap-3 text-green-500 animate-in bounce">
                     <Check className="w-5 h-5 shrink-0" />
                     <p className="text-[9px] font-black uppercase tracking-widest">Withdrawal Request Submitted!</p>
                  </div>
                )}

                <button onClick={handleWithdraw} disabled={isLoading} className="w-full bg-[#C6FF00] text-black py-7 rounded-[2.2rem] font-black uppercase text-base shadow-[0_20px_40px_rgba(198,255,0,0.2)] active:scale-95 disabled:opacity-30 transition-all italic tracking-tighter">
                   {isLoading ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'Confirm Payout Request'}
                </button>

                <div className="mt-10 space-y-4">
                   <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2 italic">Payout History</p>
                   {withdrawHistory.length === 0 ? (
                     <p className="text-[10px] text-zinc-700 italic px-2">No previous withdrawals found.</p>
                   ) : (
                     withdrawHistory.map((req, i) => (
                       <div key={i} className="bg-black/20 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div>
                             <p className="text-[10px] font-black italic">PKR {req.amount.toLocaleString()}</p>
                             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">{req.method} • {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-lg ${req.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>{req.status}</span>
                       </div>
                     ))
                   )}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateProgramScreen;
