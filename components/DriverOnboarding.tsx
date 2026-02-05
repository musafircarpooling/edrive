
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Camera, FileText, Car, Palette, CalendarDays, Loader2, AlertCircle, Clock, Users2, RefreshCw, XCircle, ShieldCheck, CheckCircle2, CheckCircle
} from 'lucide-react';
import { RideType, DriverData, UserProfile } from '../types';
import { RIDE_OPTIONS } from '../constants';
import { db } from '../firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

interface DriverOnboardingProps {
  userProfile: UserProfile;
  onBack: () => void;
}

interface ExtendedDriverData extends DriverData {
  age?: string;
  gender?: string;
  vehicleColor?: string;
  vehicleImageUrl?: string | null;
}

type VerificationStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

const DriverOnboarding: React.FC<DriverOnboardingProps> = ({ userProfile, onBack }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  // Verification Status per field
  const [verifications, setVerifications] = useState<Record<string, { status: VerificationStatus; message: string }>>({
    licenseImage: { status: 'idle', message: '' },
    registrationImage: { status: 'idle', message: '' },
    vehicleImageUrl: { status: 'idle', message: '' }
  });

  // Initialize form with existing profile data
  const [formData, setFormData] = useState<ExtendedDriverData>({
    id: 'd-' + Math.random().toString(36).substr(2, 9),
    fullName: `${userProfile.name} ${userProfile.lastName || ''}`.trim(),
    phoneNumber: userProfile.phoneNumber || '',
    cnic: '', 
    age: userProfile.age || '',
    gender: userProfile.gender || '',
    vehicleModel: '',
    vehicleNumber: '',
    vehicleColor: '',
    vehicleType: RideType.MOTO,
    licenseImage: null,
    registrationImage: null,
    cnicFront: userProfile.cnicFront || null,
    cnicBack: userProfile.cnicBack || null,
    vehicleImageUrl: null,
    status: 'pending',
    rating: 0,
    totalRides: 0
  });

  const licenseRef = useRef<HTMLInputElement>(null);
  const regRef = useRef<HTMLInputElement>(null);
  const vehiclePicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncProfile = async () => {
      if (!userProfile.email) {
        setErrorMessage("Authentication session expired. Please log in again.");
        setIsFetchingProfile(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'profiles', userProfile.email));
        if (snap.exists()) {
          const data = snap.data();
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || `${data.name} ${data.last_name || ''}`.trim(),
            phoneNumber: prev.phone_number || data.phone_number || prev.phoneNumber,
            cnic: data.cnic || prev.cnic,
            cnicFront: data.cnic_front || prev.cnicFront,
            cnicBack: data.cnic_back || prev.cnicBack,
            age: data.age || prev.age,
            gender: data.gender || prev.gender
          }));
        } else {
          setErrorMessage("Citizen profile not found in registry. Please complete registration first.");
        }
      } catch (err) {
        console.error("Registry Sync Error:", err);
        setErrorMessage("Failed to connect to Hafizabad Registry.");
      } finally {
        setIsFetchingProfile(false);
      }
    };

    syncProfile();
  }, [userProfile.email]);

  const verifyWithAI = async (base64: string, docType: string): Promise<{ valid: boolean; reason: string }> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64.split(',')[1],
        },
      };

      const prompt = `You are a vehicle and document verification expert for eDrive Hafizabad. 
      Check if this image is a ${docType}. 
      If it's NOT a clear, real picture of the requested item (e.g. it's a screenshot, a random object, or a completely different document), return valid: false.
      For "Vehicle Photo", ensure a car or bike is clearly visible with a number plate.
      For "Driving License", ensure it looks like a real license.
      Return a JSON object: { "valid": boolean, "reason": "string" }. 
      If invalid, the reason MUST be: "This is not a valid ${docType} picture, please upload a correct picture."`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [imagePart, { text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              valid: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["valid", "reason"]
          }
        }
      });

      return JSON.parse(response.text || '{"valid":false, "reason":"Verification Error"}');
    } catch (err) {
      console.error("AI Validation Error:", err);
      // Fallback to manual review if AI fails
      return { valid: true, reason: "Manual Review Required" };
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
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

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        setFormData(prev => ({ ...prev, [key]: raw }));
        setErrorMessage(null);

        // Define AI Label for the doc
        let aiLabel = "";
        if (key === 'licenseImage') aiLabel = "Driving License";
        else if (key === 'registrationImage') aiLabel = "Vehicle Registration Document";
        else if (key === 'vehicleImageUrl') aiLabel = "Vehicle Photo (with visible plate)";

        if (aiLabel) {
          setVerifications(prev => ({ ...prev, [key]: { status: 'verifying', message: 'AI Scanning...' } }));
          const result = await verifyWithAI(raw, aiLabel);
          
          setVerifications(prev => ({ 
            ...prev, 
            [key]: { 
              status: result.valid ? 'valid' : 'invalid', 
              message: result.valid ? 'Verified' : result.reason 
            } 
          }));

          if (!result.valid) {
            setErrorMessage(result.reason);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    if (step === 1) {
      if (!formData.vehicleModel || !formData.vehicleNumber || !formData.vehicleColor) return "Please enter all vehicle details.";
      if (!formData.cnicFront || !formData.cnicBack) return "Identity documents missing from Citizen profile. Please update your profile first.";
    }
    if (step === 2) {
      if (!formData.licenseImage || !formData.registrationImage || !formData.vehicleImageUrl) {
        return "License, Registration, and Vehicle photos are required.";
      }
      // Check AI fails
      // Fix: cast v to any to access status property safely
      const fails = Object.entries(verifications).filter(([k, v]) => (v as any).status === 'invalid');
      // Fix: cast fails[0][1] to any to access message property safely
      if (fails.length > 0) return (fails[0][1] as any).message;
    }
    return null;
  };

  const handleApply = async () => {
    const err = validate();
    if (err) return setErrorMessage(err);
    
    setIsSubmitting(true);
    setProgressText("Securing Documents...");
    setErrorMessage(null);
    try {
      const [cLicense, cReg, cVehicle] = await Promise.all([
        compressImage(formData.licenseImage!),
        compressImage(formData.registrationImage!),
        compressImage(formData.vehicleImageUrl!)
      ]);

      setProgressText("Syncing with HQ...");

      if (!userProfile.email) throw new Error("Identifier missing");
      
      const submissionDate = new Date().toISOString();
      
      await setDoc(doc(db, 'drivers', userProfile.email), {
        email: userProfile.email,
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        cnic: formData.cnic || 'VERIFIED_BY_PROFILE',
        age: formData.age,
        gender: formData.gender,
        vehicle_model: formData.vehicleModel,
        vehicle_number: formData.vehicleNumber.toUpperCase(),
        vehicle_color: formData.vehicleColor,
        vehicle_type: formData.vehicleType,
        profile_pic: userProfile.profilePic,
        cnic_front: formData.cnicFront,
        cnic_back: formData.cnicBack,
        license_image_url: cLicense,
        registration_image_url: cReg,
        vehicle_image_url: cVehicle,
        status: 'pending',
        created_at: submissionDate,
        updated_at: submissionDate
      }, { merge: true });

      setStep(3);
    } catch (e: any) { 
      setErrorMessage(e.message || "Registry submission failed. Try again."); 
    } finally { 
      setIsSubmitting(false); 
      setProgressText("");
    }
  };

  const DocCard = ({ label, keyName, val, iRef, aspect = 'aspect-video' }: any) => {
    const camInputRef = useRef<HTMLInputElement>(null);
    const v = verifications[keyName];
    
    return (
      <div className="space-y-2 w-full">
        <div className={`relative ${aspect} rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${
          v?.status === 'invalid' ? 'border-rose-500 bg-rose-500/5' :
          v?.status === 'valid' ? 'border-green-500 bg-green-500/5' :
          val ? 'border-[#c1ff22] bg-[#c1ff22]/5 shadow-[0_0_20px_rgba(193,255,34,0.05)]' : 
          'border-white/10 bg-zinc-900/50'
        }`}>
           {val ? (
             <>
               <img src={val} className={`w-full h-full object-cover ${v?.status === 'verifying' ? 'opacity-30 blur-sm' : ''}`} alt={label} />
               
               {v?.status === 'verifying' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                   <RefreshCw className="w-8 h-8 text-[#c1ff22] animate-spin mb-2" />
                   <span className="text-[8px] font-black uppercase text-[#c1ff22] tracking-widest">AI SCANNING</span>
                 </div>
               )}

               {v?.status === 'invalid' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20">
                   <XCircle className="w-10 h-10 text-rose-500 mb-1" />
                   <span className="text-[7px] font-black uppercase text-rose-500 text-center px-4">Invalid document</span>
                 </div>
               )}

               {v?.status === 'valid' && (
                 <div className="absolute top-3 left-3 bg-green-500 p-1 rounded-full shadow-lg">
                   <CheckCircle className="w-4 h-4 text-black" />
                 </div>
               )}

               <button 
                onClick={() => {
                  setFormData(prev => ({ ...prev, [keyName]: null }));
                  setVerifications(prev => ({ ...prev, [keyName]: { status: 'idle', message: '' } }));
                }}
                className="absolute top-3 right-3 bg-black/80 backdrop-blur-xl p-3 rounded-2xl text-[#c1ff22] border border-white/10 active:scale-90 transition-all shadow-2xl"
               >
                  <RefreshCw className="w-4 h-4" />
               </button>
             </>
           ) : (
             <div className="flex flex-col items-center gap-5 p-6 w-full max-w-[240px]">
               <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                 <Camera className="w-7 h-7 text-[#c1ff22]" />
               </div>
               
               <div className="flex gap-2 w-full">
                 <button 
                  onClick={() => iRef.current?.click()}
                  className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
                 >
                   Gallery
                 </button>
                 <button 
                  onClick={() => camInputRef.current?.click()}
                  className="flex-1 bg-[#c1ff22] text-black py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#c1ff22]/10 active:scale-95 transition-all"
                 >
                   Camera
                 </button>
               </div>
               
               <p className="text-[10px] font-black uppercase text-center text-zinc-600 tracking-widest">{label}</p>
             </div>
           )}
           <input type="file" ref={iRef} className="hidden" accept="image/*" onChange={e => handleImage(e, keyName)} />
           {/* Back Camera Default: capture="environment" */}
           <input type="file" ref={camInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => handleImage(e, keyName)} />
        </div>
        {v?.status === 'invalid' && (
          <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter text-center italic">{v.message}</p>
        )}
      </div>
    );
  };

  if (isFetchingProfile) {
    return (
      <div className="flex flex-col h-full bg-[#121212] items-center justify-center p-10 space-y-4">
        <Loader2 className="w-10 h-10 text-[#c1ff22] animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Syncing with Registry...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white overflow-hidden relative">
      <div className="p-6 pt-12 flex items-center border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <button onClick={onBack} className="p-2 mr-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6 text-[#c1ff22]" />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Captain <span className="text-[#c1ff22]">Onboarding</span></h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar pb-32">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-[#c1ff22]/5 border border-[#c1ff22]/20 p-5 rounded-[2rem] flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#c1ff22] shrink-0">
                  <img src={userProfile.profilePic} className="w-full h-full object-cover" alt="Profile" />
               </div>
               <div className="min-w-0">
                  <h3 className="font-black text-white uppercase text-xs truncate italic">{formData.fullName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#c1ff22]" />
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Profile Linked Smoothly</p>
                  </div>
               </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white leading-none">Vehicle <span className="text-[#c1ff22]">Setup</span></h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select your category and add details</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {RIDE_OPTIONS.map(opt => (
                <button key={opt.type} onClick={() => setFormData({...formData, vehicleType: opt.type})} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all ${formData.vehicleType === opt.type ? 'border-[#c1ff22] bg-[#c1ff22]/10' : 'border-white/5 bg-zinc-900'}`}>
                  <img src={opt.icon} className="w-10 h-10 object-contain" alt={opt.label} />
                  <span className={`text-[8px] font-black uppercase ${formData.vehicleType === opt.type ? 'text-[#c1ff22]' : 'text-zinc-500'}`}>{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
               <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
                  <Car className="w-5 h-5 text-zinc-600" />
                  <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Model (e.g. Honda 125)" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} />
               </div>
               <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
                  <Palette className="w-5 h-5 text-zinc-600" />
                  <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Color (e.g. Red/Black)" value={formData.vehicleColor} onChange={e => setFormData({...formData, vehicleColor: e.target.value})} />
               </div>
               <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
                  <span className="text-[#c1ff22] font-black text-xs">NO.</span>
                  <input className="bg-transparent w-full outline-none text-white font-bold uppercase" placeholder="Plate No (e.g. HFZ-1234)" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} />
               </div>
            </div>

            <button onClick={() => {
              const err = validate();
              if(err) setErrorMessage(err);
              else setStep(2);
            }} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase shadow-lg shadow-[#c1ff22]/10 active:scale-95 transition-all">Next: Documents</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Vehicle <span className="text-[#c1ff22]">Proofs</span></h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Provide documentation for the selected vehicle</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-zinc-900/50 p-1 rounded-[2rem] border border-white/5">
                <DocCard label="Vehicle Photo (Visible Number Plate)" keyName="vehicleImageUrl" val={formData.vehicleImageUrl} iRef={vehiclePicRef} aspect="aspect-[1.5/1]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <DocCard label="Driving License" keyName="licenseImage" val={formData.licenseImage} iRef={licenseRef} aspect="aspect-square" />
                 <DocCard label="Registration Card" keyName="registrationImage" val={formData.registrationImage} iRef={regRef} aspect="aspect-square" />
              </div>

              <div className="p-4 bg-[#c1ff22]/10 rounded-2xl border border-[#c1ff22]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#c1ff22]" />
                  <span className="text-[10px] font-black uppercase text-[#c1ff22]">Identity Proofs Synced</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#c1ff22]" />
              </div>
            </div>

            <button 
              onClick={handleApply} 
              // Fix: cast v to any to access status property safely
              disabled={isSubmitting || Object.values(verifications).some((v: any) => v.status === 'verifying')} 
              className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase shadow-xl shadow-[#c1ff22]/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply for Captaincy'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10 animate-in zoom-in">
             <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[#c1ff22]/5 rounded-full animate-ping" />
                <Clock className="w-10 h-10 text-[#c1ff22] animate-pulse" />
             </div>
             <div className="space-y-3">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Review <span className="text-[#c1ff22]">Pending</span></h2>
                <p className="text-zinc-500 text-[10px] px-6 uppercase font-black tracking-widest leading-loose">Hafizabad HQ is reviewing your vehicle details. Verification usually takes 1-2 hours.</p>
             </div>
             <button onClick={onBack} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-[#c1ff22]/10 active:scale-95 transition-all">Return Home</button>
          </div>
        )}
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
           <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
              <Loader2 className="w-12 h-12 text-[#c1ff22] animate-spin mx-auto" />
              <div className="space-y-2">
                 <p className="text-[#c1ff22] text-xs font-black uppercase tracking-[0.3em]">{progressText}</p>
                 <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Syncing Captain Profile...</p>
              </div>
           </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-24 left-6 right-6 p-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase shadow-[0_10px_30px_rgba(225,29,72,0.3)] flex items-center gap-3 animate-in slide-in-from-bottom-4 border border-white/10 z-[1500]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="leading-tight">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><XCircle className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

export default DriverOnboarding;
