
import React, { useState, useRef } from 'react';
import { ArrowLeft, Pencil, Camera, Loader2, AlertCircle, ShieldCheck, User, Star } from 'lucide-react';
import { UserProfile } from '../types';
import { compressImage } from '../utils/imageProcessor';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userProfile, onSave, onBack }) => {
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, (p) => {
          setUploadProgress(p);
        });
        setFormData(prev => ({ ...prev, profilePic: compressed }));
        
        // Brief delay before hiding progress for smoothness
        setTimeout(() => setUploadProgress(0), 800);
      } catch (err) {
        alert("Image optimization failed.");
        setUploadProgress(0);
      }
    }
  };

  const handleSave = async () => {
    if (uploadProgress > 0 && uploadProgress < 100) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const updated = { ...formData };
    localStorage.setItem(`edrive_user_${updated.email.toLowerCase()}`, JSON.stringify(updated));
    localStorage.setItem('edrive_user_session', JSON.stringify(updated));
    onSave(updated);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      <header className="p-6 pt-12 flex items-center justify-between border-b border-white/5 bg-black/40">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft className="w-6 h-6 text-[#c1ff22]" /></button>
        <h1 className="text-xl font-black uppercase italic">Profile <span className="text-[#c1ff22]">Settings</span></h1>
        <div className="w-10" />
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
        <div className="flex justify-center py-4">
           <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-[#c1ff22]/30 overflow-hidden relative">
                <img src={formData.profilePic} className="w-full h-full object-cover" />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-in fade-in">
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * uploadProgress) / 100} className="text-[#c1ff22] transition-all duration-300" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress > 0 && uploadProgress < 100}
                className="absolute bottom-1 right-1 bg-[#c1ff22] p-2 rounded-full text-black border-4 border-[#121212] active:scale-90 transition-transform"
              >
                <Camera className="w-5 h-5" />
              </button>
           </div>
        </div>

        <div className="space-y-4">
           <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
              <label className="text-[10px] text-zinc-600 uppercase font-black block mb-1">Name</label>
              <input className="bg-transparent w-full outline-none text-lg font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
           </div>
           <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
              <label className="text-[10px] text-zinc-600 uppercase font-black block mb-1">Email</label>
              <input className="bg-transparent w-full outline-none text-zinc-500 font-bold" value={formData.email} disabled />
           </div>
           <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
              <label className="text-[10px] text-zinc-600 uppercase font-black block mb-1">WhatsApp</label>
              <input className="bg-transparent w-full outline-none text-lg font-bold" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
           </div>
        </div>
      </div>

      <div className="p-6 pb-12">
         <button 
           onClick={handleSave} 
           disabled={isLoading || (uploadProgress > 0 && uploadProgress < 100)} 
           className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
         >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save Profile'}
         </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
