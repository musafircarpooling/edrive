
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Car, Camera, FileText, Palette, Loader2, ShieldCheck, CheckCircle, AlertCircle, Clock, IdCard, FileBadge, Image as ImageIcon } from 'lucide-react';
import { RideType, UserProfile } from '../types';
import { RIDE_OPTIONS } from '../constants';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageProcessor';

interface DriverOnboardingProps {
  userProfile: UserProfile;
  onBack: () => void;
}

const DriverOnboarding: React.FC<DriverOnboardingProps> = ({ userProfile, onBack }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [vehicleType, setVehicleType] = useState<RideType>(RideType.MOTO);
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  
  // Document State
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [drivingLicense, setDrivingLicense] = useState<string | null>(null);
  const [registrationCard, setRegistrationCard] = useState<string | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubIcons = onSnapshot(doc(db, 'app_settings', 'ride_icons'), (snap) => {
      if (snap.exists()) {
        setCustomIcons(snap.data() as Record<string, string>);
      }
    });
    return () => unsubIcons();
  }, []);

  const triggerUpload = (target: string) => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) {
      try {
        const compressed = await compressImage(file, (p) => {
          setUploadProgress(prev => ({ ...prev, [uploadTarget]: p }));
        });
        
        if (uploadTarget === 'cnicFront') setCnicFront(compressed);
        if (uploadTarget === 'cnicBack') setCnicBack(compressed);
        if (uploadTarget === 'license') setDrivingLicense(compressed);
        if (uploadTarget === 'regCard') setRegistrationCard(compressed);
        if (uploadTarget === 'vImg') setVehicleImage(compressed);
        
        setTimeout(() => setUploadProgress(prev => ({ ...prev, [uploadTarget]: 0 })), 1000);
      } catch (err) {
        setError("Image optimization failed.");
      }
    }
  };

  const handleApply = async () => {
    setError("");
    if (!vehicleModel || !vehicleNumber || !vehicleColor || !cnicFront || !cnicBack || !drivingLicense || !registrationCard || !vehicleImage) {
      setError("Please complete all fields and document uploads.");
      return;
    }

    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid!);
      const updatedData = {
        isDriver: true,
        driverStatus: 'pending',
        verificationStatus: 'pending',
        vehicleType,
        vehicleModel,
        vehicleNumber,
        vehicleColor,
        cnicFront,
        cnicBack,
        drivingLicense,
        registrationCard,
        vehicleImage,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updatedData);
      
      // Update local session
      const currentSession = JSON.parse(localStorage.getItem('edrive_user_session') || '{}');
      localStorage.setItem('edrive_user_session', JSON.stringify({ ...currentSession, ...updatedData }));
      
      setStep(2);
    } catch (err) {
      setError("Hafizabad HQ Connection Error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const UploadButton = ({ target, label, icon: Icon, current }: { target: string, label: string, icon: any, current: string | null }) => (
    <button 
      onClick={() => triggerUpload(target)}
      className="relative flex flex-col items-center justify-center gap-3 bg-zinc-900/40 p-6 rounded-[2.2rem] border-2 border-dashed border-white/5 hover:border-[#c1ff22]/40 transition-all aspect-square overflow-hidden"
    >
      {current ? (
        <img src={current} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <>
          <Icon className="w-8 h-8 text-zinc-700" />
          <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest text-center leading-tight">{label}</span>
        </>
      )}
      {uploadProgress[target] > 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <span className="text-[10px] font-black text-[#c1ff22]">{uploadProgress[target]}%</span>
        </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <header className="p-6 pt-12 flex items-center gap-4 bg-transparent z-10 shrink-0">
        <button onClick={onBack} className="p-3 bg-zinc-900 rounded-full border border-white/5 active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6 text-[#c1ff22]" />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">
          CAPTAIN <span className="text-[#c1ff22]">MODE</span>
        </h1>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      <div className="flex-1 px-6 pt-8 space-y-10 overflow-y-auto no-scrollbar pb-32">
        {step === 1 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-right duration-500">
             <div className="space-y-1">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                  VEHICLE <span className="text-[#c1ff22]">SETUP</span>
                </h2>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">REGISTER YOUR VEHICLE TO START EARNING</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                {RIDE_OPTIONS.map(opt => {
                  const isSelected = vehicleType === opt.type;
                  const iconUrl = customIcons[opt.type];
                  return (
                    <button 
                      key={opt.type} 
                      onClick={() => setVehicleType(opt.type)} 
                      className={`p-6 rounded-[2.2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${
                        isSelected 
                        ? 'border-[#c1ff22] bg-[#c1ff22]/5 shadow-[0_10px_30px_rgba(193,255,34,0.1)]' 
                        : 'border-white/5 bg-zinc-900/40 opacity-40'
                      }`}
                    >
                      <div className="w-12 h-12 flex items-center justify-center">
                        {iconUrl ? (
                          <img 
                            src={iconUrl} 
                            className="w-full h-full object-contain filter drop-shadow-lg" 
                            alt={opt.label}
                          />
                        ) : (
                          <div className="w-6 h-6 bg-[#c1ff22]/10 rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                    </button>
                  );
                })}
             </div>

             <div className="space-y-4">
                <div className="bg-zinc-900/60 p-7 rounded-[1.8rem] border border-white/5 focus-within:border-[#c1ff22]/20 transition-all">
                  <label className="text-[9px] font-black uppercase text-zinc-600 block mb-2 tracking-widest">Model Name</label>
                  <input 
                    className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-800" 
                    placeholder="e.g. Honda 125, Toyota Corolla" 
                    value={vehicleModel} 
                    onChange={e => setVehicleModel(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/60 p-7 rounded-[1.8rem] border border-white/5 focus-within:border-[#c1ff22]/20 transition-all">
                        <label className="text-[9px] font-black uppercase text-zinc-600 block mb-2 tracking-widest">Color</label>
                        <input 
                            className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-800" 
                            placeholder="Red, White..." 
                            value={vehicleColor} 
                            onChange={e => setVehicleColor(e.target.value)} 
                        />
                    </div>
                    <div className="bg-zinc-900/60 p-7 rounded-[1.8rem] border border-white/5 focus-within:border-[#c1ff22]/20 transition-all">
                        <label className="text-[9px] font-black uppercase text-zinc-600 block mb-2 tracking-widest">Plate No</label>
                        <input 
                            className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-800 uppercase" 
                            placeholder="HFZ-1234" 
                            value={vehicleNumber} 
                            onChange={e => setVehicleNumber(e.target.value)} 
                        />
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <div className="w-1 h-4 bg-[#c1ff22] rounded-full" />
                   <h3 className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Verification Documents</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <UploadButton target="cnicFront" label="CNIC Front" icon={IdCard} current={cnicFront} />
                    <UploadButton target="cnicBack" label="CNIC Back" icon={IdCard} current={cnicBack} />
                    <UploadButton target="license" label="Driving License" icon={FileText} current={drivingLicense} />
                    <UploadButton target="regCard" label="Vehicle Card" icon={FileBadge} current={registrationCard} />
                </div>
                <button 
                  onClick={() => triggerUpload('vImg')}
                  className="relative w-full bg-zinc-900/40 p-10 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 overflow-hidden min-h-[160px]"
                >
                  {vehicleImage ? (
                    <img src={vehicleImage} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 text-[#c1ff22]" />
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Vehicle Photo</span>
                    </>
                  )}
                  {uploadProgress['vImg'] > 0 && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                      <span className="text-xs font-black text-[#c1ff22]">{uploadProgress['vImg']}%</span>
                    </div>
                  )}
                </button>
             </div>

             <div className="space-y-6 pt-4">
                {error && (
                  <div className="flex items-center gap-3 bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 text-rose-500 animate-in shake">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <button 
                  onClick={handleApply} 
                  disabled={isLoading} 
                  className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.5rem] font-black uppercase text-base shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-95 disabled:opacity-30 transition-all italic tracking-tight"
                >
                    {isLoading ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'SUBMIT APPLICATION'}
                </button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10 animate-in zoom-in duration-700">
             <div className="relative">
                <div className="absolute inset-0 bg-[#c1ff22] blur-[80px] opacity-10 animate-pulse" />
                <div className="w-32 h-32 bg-zinc-900 rounded-[3.5rem] flex items-center justify-center relative border-4 border-[#c1ff22]/20 shadow-2xl">
                   <ShieldCheck className="w-16 h-16 text-[#c1ff22]" />
                   <div className="absolute -bottom-2 -right-2 bg-[#c1ff22] p-2.5 rounded-2xl shadow-lg border-4 border-[#0a0a0a]">
                      <CheckCircle className="w-5 h-5 text-black" />
                   </div>
                </div>
             </div>
             <div className="space-y-4">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">APPLICATION <br/> <span className="text-[#c1ff22]">SUCCESSFUL</span></h2>
                <p className="text-zinc-500 text-[11px] px-10 font-black uppercase tracking-widest leading-loose">Hafizabad HQ is verifying your documents. You will be notified once approved.</p>
             </div>
             <button 
               onClick={onBack} 
               className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase text-base shadow-2xl active:scale-95 transition-all italic"
             >
               Go to Home
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverOnboarding;
