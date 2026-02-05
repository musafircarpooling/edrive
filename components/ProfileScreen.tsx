
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Pencil, ChevronRight, Camera, Loader2, AlertCircle, CheckCircle2, Star, ShieldCheck, X } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userProfile, onSave, onBack }) => {
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string, maxWidth = 800, quality = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const fetchMyReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const q = query(
        collection(db, 'ride_reviews'),
        where('reviewee_id', '==', userProfile.email)
      );
      
      const querySnapshot = await getDocs(q);
      const rawReviews = querySnapshot.docs.map(d => d.data());
      
      const sortedReviews = rawReviews.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      const reviewsData = await Promise.all(sortedReviews.map(async (data) => {
        const reviewerSnap = await getDocs(query(collection(db, 'profiles'), where('email', '==', data.reviewer_id)));
        const reviewer = reviewerSnap.docs[0]?.data();
        return { ...data, reviewer };
      }));
      
      setReviews(reviewsData || []);
    } catch (err: any) {
      console.error("Error fetching my reviews:", err);
      alert("Ledger Error: Connection failed or registry unavailable.");
      setShowReviews(false);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return setError("Image too large. Please select a photo under 5MB.");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePic: reader.result as string }));
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setSyncProgress(20);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.email) {
        throw new Error("No identifier found to update profile.");
      }

      setSyncProgress(50);
      const optimizedPic = await compressImage(formData.profilePic);
      setSyncProgress(80);

      await setDoc(doc(db, 'profiles', formData.email), {
        name: formData.name,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        city: formData.city,
        profile_pic: optimizedPic,
        updated_at: new Date().toISOString()
      }, { merge: true });

      setSyncProgress(100);
      setSuccess(true);
      setTimeout(() => {
        onSave({...formData, profilePic: optimizedPic});
      }, 800);

    } catch (err: any) {
      if (err.message?.includes('longer than 1048487 bytes')) {
        setError("Optimized image still too large. Try a different photo.");
      } else {
        setError(err.message || "Failed to sync profile.");
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

      <div className="p-6 pt-12 flex items-center gap-4 bg-black/40 backdrop-blur-md border-b border-white/5 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-8 h-8 text-[#c1ff22]" />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter flex-1 text-center mr-8">
          Profile <span className="text-[#c1ff22] not-italic">Settings</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-8 mt-4 no-scrollbar">
        <div className="flex justify-center relative py-4">
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#c1ff22]/30 shadow-[0_0_40px_rgba(193,255,34,0.2)] relative bg-zinc-900">
              <img src={formData.profilePic} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="Profile" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); triggerFileInput(); }} className="absolute bottom-1 right-1 bg-[#c1ff22] p-3 rounded-full border-4 border-[#121212] shadow-xl text-black active:scale-95 transition-transform"><Pencil className="w-5 h-5" /></button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Optimizing & Syncing</span>
                <span className="text-[9px] font-black text-[#c1ff22] italic">{syncProgress}%</span>
             </div>
             <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div 
                   className="h-full bg-[#c1ff22] transition-all duration-300"
                   style={{ width: `${syncProgress}%` }}
                />
             </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight text-rose-500 leading-tight">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button onClick={() => { setShowReviews(true); fetchMyReviews(); }} className="w-full bg-[#c1ff22]/10 border border-[#c1ff22]/30 p-5 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-[#c1ff22] rounded-2xl flex items-center justify-center shadow-lg"><Star className="w-6 h-6 text-black" /></div>
               <div className="text-left">
                  <p className="text-white font-black uppercase italic text-sm tracking-tighter">Verified Reviews</p>
                  <p className="text-[8px] font-black text-[#c1ff22] uppercase tracking-widest mt-1">Hafizabad HQ Ledger</p>
               </div>
             </div>
             <ChevronRight className="w-6 h-6 text-[#c1ff22]" />
          </button>

          <div className="bg-zinc-900/50 p-4 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-colors">
            <label className="text-[10px] text-[#c1ff22] uppercase font-black tracking-widest block mb-1.5 opacity-70">First Name</label>
            <input className="bg-transparent w-full outline-none text-xl font-bold text-white placeholder:text-zinc-800" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-colors">
            <label className="text-[10px] text-[#c1ff22] uppercase font-black tracking-widest block mb-1.5 opacity-70">Last Name</label>
            <input className="bg-transparent w-full outline-none text-xl font-bold text-white placeholder:text-zinc-800" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#121212] border-t border-white/5 shrink-0">
        <button onClick={handleSaveChanges} disabled={isLoading} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black text-xl shadow-[0_15px_35px_rgba(193,255,34,0.3)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save Changes'}
        </button>
      </div>

      {showReviews && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
           <header className="p-6 pt-12 flex items-center justify-between border-b border-white/5 bg-zinc-900/40">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-[#c1ff22]" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Your <span className="text-[#c1ff22]">Ledger</span></h3>
              </div>
              <button onClick={() => setShowReviews(false)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition-transform"><X className="w-6 h-6" /></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-20">
              {isLoadingReviews ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#c1ff22]" /><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Syncing with HQ Registry...</p></div>
              ) : reviews.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-20"><Star className="w-20 h-20 mx-auto" /><p className="font-black uppercase text-xs">No city reviews found yet</p></div>
              ) : (
                reviews.map((rev, idx) => (
                  <div key={idx} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <img src={(rev.reviewer as any)?.profile_pic || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                          <div>
                            <p className="text-white font-black uppercase italic text-xs leading-none">{(rev.reviewer as any)?.name} {(rev.reviewer as any)?.last_name}</p>
                            <div className="flex text-[#c1ff22] mt-1.5">{Array(rev.rating).fill(0).map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}</div>
                          </div>
                       </div>
                       <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-zinc-300 text-xs font-medium italic leading-relaxed">"{rev.comment}"</p>
                  </div>
                ))
              )}
           </div>
           <footer className="p-6 bg-black/60 backdrop-blur-md border-t border-white/5 text-center shrink-0">
              <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em]">Hafizabad Verified Citizens Ledger</p>
           </footer>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
