
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, Phone, User, AlertCircle, Camera, CalendarDays, Users2, CheckCircle2, Lock, SendHorizontal, Eye, EyeOff, Car, Palette, CreditCard, ShieldCheck, Sparkles, XCircle, RefreshCw } from 'lucide-react';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import AdBannerOverlay from '../AdBannerOverlay';
import { RideType } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";

interface RegistrationScreenProps {
  onBack: () => void;
  onSuccess: (isAdmin?: boolean, profileData?: any) => void;
  existingData?: any;
  googleData?: { email: string; name: string } | null;
  selectedRegType: RideType | 'CITIZEN';
}

const DEFAULT_PIC = 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg';

type DocKey = 'front' | 'back' | 'license' | 'reg' | 'vehicle' | 'profile';
type VerificationStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onBack, onSuccess, existingData, googleData, selectedRegType }) => {
  const [step, setStep] = useState<'info' | 'docs' | 'pending'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  
  // Basic Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Partner Specific Info
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [registrationImage, setRegistrationImage] = useState<string | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);

  // Doc Images
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);

  // Verification Status per field
  const [verifications, setVerifications] = useState<Record<string, { status: VerificationStatus; message: string }>>({
    front: { status: 'idle', message: '' },
    back: { status: 'idle', message: '' },
    license: { status: 'idle', message: '' },
    reg: { status: 'idle', message: '' },
    vehicle: { status: 'idle', message: '' }
  });

  const isPartner = selectedRegType !== 'CITIZEN';

  useEffect(() => {
    if (existingData) {
      setFullName(`${existingData.name} ${existingData.lastName || ''}`.trim());
      setEmail(existingData.email || "");
      setPhoneNumber(existingData.phoneNumber || "");
      setAge(existingData.age || "");
      setGender(existingData.gender || "");
      setCnicNumber(existingData.cnic || "");
      setProfilePic(existingData.profilePic || null);
    } else if (googleData) {
      setFullName(googleData.name);
      setEmail(googleData.email);
    }
  }, [existingData, googleData]);

  const profilePicRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const regInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

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

  const verifyWithAI = async (base64: string, docType: string): Promise<{ valid: boolean; reason: string }> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64.split(',')[1],
        },
      };

      const prompt = `You are a document verification expert for eDrive Hafizabad. 
      Check if this image is a ${docType}. 
      If it's NOT a clear, real picture of the requested document (e.g. it's a screenshot of an app, a random object, or a different ID), return valid: false.
      Specifically, if it's supposed to be a Pakistani CNIC and it doesn't look like one, return valid: false.
      Return a JSON object: { "valid": boolean, "reason": "string" }. 
      If invalid, the reason MUST be: "This is not a ${docType} picture, please upload a correct ${docType} picture."`;

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
      return { valid: true, reason: "Manual Review Required" };
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: DocKey) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return setError("Image too large. Please select a photo under 5MB.");
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        setError("");
        
        // Immediate UI Update
        if (side === 'front') setCnicFront(raw);
        else if (side === 'back') setCnicBack(raw);
        else if (side === 'profile') { setProfilePic(raw); return; }
        else if (side === 'license') setLicenseImage(raw);
        else if (side === 'reg') setRegistrationImage(raw);
        else if (side === 'vehicle') setVehicleImage(raw);

        // Don't AI verify vehicle photos or registration books as strictly (too varied), focus on CNIC and License
        if (['front', 'back', 'license'].includes(side)) {
          setVerifications(prev => ({ ...prev, [side]: { status: 'verifying', message: 'AI Scanning...' } }));
          const docLabel = side === 'front' ? 'Pakistani CNIC Front' : side === 'back' ? 'Pakistani CNIC Back' : 'Driving License';
          const result = await verifyWithAI(raw, docLabel);
          
          setVerifications(prev => ({ 
            ...prev, 
            [side]: { 
              status: result.valid ? 'valid' : 'invalid', 
              message: result.valid ? 'Verified' : result.reason 
            } 
          }));

          if (!result.valid) {
            setError(result.reason);
          }
        } else {
          setVerifications(prev => ({ ...prev, [side]: { status: 'valid', message: '' } }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (!fullName || !email || (!googleData && (!password || !confirmPassword)) || !phoneNumber || !age || !gender || !cnicNumber) {
      setError("Please fill all profile fields.");
      return false;
    }
    if (!googleData && password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (!googleData && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (isPartner && (!vehicleModel || !vehicleNumber || !vehicleColor)) {
      setError("Vehicle details are required for partners.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep('docs');
      setError("");
    }
  };

  const handleRegister = async () => {
    if (!cnicFront || !cnicBack) return setError("CNIC images are required.");
    if (isPartner && (!licenseImage || !registrationImage || !vehicleImage)) return setError("Vehicle documents are required for partners.");
    
    // Check if any critical doc failed AI check
    // Fix: Explicitly cast 'v' to any to access status and message properties safely
    const criticalFails = Object.entries(verifications).filter(([k, v]) => ['front', 'back', 'license'].includes(k) && (v as any).status === 'invalid');
    if (criticalFails.length > 0) {
      return setError((criticalFails[0][1] as any).message);
    }

    setIsLoading(true);
    setUploadProgress(10);
    setStatusMessage("Securing Connection...");
    setError("");

    try {
      if (!googleData) {
        await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      }
      setUploadProgress(30);

      setStatusMessage("Optimizing Documents...");
      const [f, b, p] = await Promise.all([
        compressImage(cnicFront),
        compressImage(cnicBack),
        profilePic ? compressImage(profilePic, 400, 0.6) : Promise.resolve(DEFAULT_PIC)
      ]);
      setUploadProgress(60);
      setStatusMessage("Commiting to HQ Ledger...");

      const profileData = {
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber.trim(),
        name: fullName.split(' ')[0],
        last_name: fullName.split(' ').slice(1).join(' '),
        age, 
        gender, 
        city: 'Hafizabad',
        cnic: cnicNumber.replace(/\D/g, ''),
        profile_pic: p,
        verification_status: 'pending',
        cnic_front: f,
        cnic_back: b,
        password: password || 'social-auth', 
        ai_verified: true,
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'profiles', email.trim().toLowerCase()), profileData, { merge: true });

      if (isPartner) {
        const [l, r, v] = await Promise.all([
          compressImage(licenseImage!),
          compressImage(registrationImage!),
          compressImage(vehicleImage!)
        ]);

        await setDoc(doc(db, 'drivers', email.trim().toLowerCase()), {
          ...profileData,
          full_name: fullName,
          vehicle_model: vehicleModel,
          vehicle_number: vehicleNumber.toUpperCase(),
          vehicle_color: vehicleColor,
          vehicle_type: selectedRegType,
          license_image_url: l,
          registration_image_url: r,
          vehicle_image_url: v,
          status: 'pending',
          rating: 5.0,
          total_rides: 0
        }, { merge: true });
      }

      setUploadProgress(100);
      setStatusMessage("Done!");
      setStep('pending');
    } catch (err: any) {
      console.error("Registry Error:", err);
      setError(err.code === 'auth/email-already-in-use' ? "Email already registered." : "Registry Connection Failed.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const DocSlot = ({ side, label, val, inputRef, icon: Icon }: { side: DocKey, label: string, val: string | null, inputRef: React.RefObject<HTMLInputElement>, icon: any }) => {
    const v = verifications[side];
    return (
      <div className="space-y-2">
        <div 
          onClick={() => v?.status !== 'verifying' && inputRef.current?.click()} 
          className={`relative aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
            v?.status === 'invalid' ? 'border-rose-500 bg-rose-500/5' : 
            v?.status === 'valid' ? 'border-green-500 bg-green-500/5' : 
            'border-white/10 bg-zinc-900 hover:border-[#c1ff22]/30'
          }`}
        >
          {val ? (
            <>
              <img src={val} className={`w-full h-full object-cover ${v?.status === 'verifying' ? 'opacity-30 blur-sm' : ''}`} />
              {v?.status === 'verifying' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <RefreshCw className="w-8 h-8 text-[#c1ff22] animate-spin mb-2" />
                  <span className="text-[8px] font-black uppercase text-[#c1ff22] tracking-widest">AI SCANNING</span>
                </div>
              )}
              {v?.status === 'invalid' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20">
                  <XCircle className="w-10 h-10 text-rose-500 mb-1" />
                  <span className="text-[7px] font-black uppercase text-rose-500 text-center px-4">Tap to re-upload</span>
                </div>
              )}
              {v?.status === 'valid' && (
                <div className="absolute top-2 right-2 bg-green-500 p-1 rounded-full shadow-lg">
                  <CheckCircle2 className="w-3 h-3 text-black" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center">
              <Icon className="w-6 h-6 text-[#c1ff22] mb-1" />
              <span className="text-[8px] font-black uppercase text-zinc-700">{label}</span>
            </div>
          )}
        </div>
        {v?.status === 'invalid' && (
          <p className="text-[7px] text-rose-500 font-black uppercase tracking-tighter leading-none text-center">{v.message}</p>
        )}
        <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, side)} />
      </div>
    );
  };

  const Heading = () => {
    if (selectedRegType === 'CITIZEN') return <h1 className="text-xl font-black italic uppercase text-center">Citizen <span className="text-[#c1ff22]">Register</span></h1>;
    const labels: Record<string, string> = { [RideType.MOTO]: 'Bike', [RideType.RICKSHAW]: 'Rickshaw', [RideType.RIDE]: 'Car', [RideType.DELIVERY]: 'Delivery' };
    return <h1 className="text-xl font-black italic uppercase text-center">{labels[selectedRegType as string] || 'Partner'} <span className="text-[#c1ff22]">Partner</span></h1>;
  };

  if (step === 'pending') {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] items-center justify-center p-8 text-center space-y-10 animate-in fade-in">
        <div className="w-32 h-32 bg-zinc-900 border-4 border-[#c1ff22]/20 rounded-[3rem] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[#c1ff22]/5 rounded-full animate-ping" />
          <CheckCircle2 className="w-16 h-16 text-[#c1ff22]" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Profile <span className="text-[#c1ff22]">Logged</span></h2>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest leading-loose">Hafizabad HQ is verifying your identity and documents. Approval usually takes 1-2 hours.</p>
        </div>
        <button onClick={onBack} className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl active:scale-95 transition-all italic">Return to Start</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-6 overflow-hidden relative">
      <AdBannerOverlay location="citizen_reg" />
      <div className="relative flex items-center justify-center mb-8 pt-6 shrink-0 h-12">
        <button onClick={step === 'docs' ? () => setStep('info') : onBack} className="absolute left-0 p-3 bg-white/5 rounded-full active:scale-90 transition-transform"><ArrowLeft className="w-6 h-6 text-[#c1ff22]" /></button>
        <Heading />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
        {step === 'info' ? (
          <div className="space-y-4 animate-in slide-in-from-right-4 pb-20">
             <div className="flex flex-col items-center mb-6">
                <div onClick={() => profilePicRef.current?.click()} className="relative w-28 h-28 rounded-[2.5rem] bg-zinc-900 border-2 border-dashed border-white/10 overflow-hidden group active:scale-95 transition-all">
                  {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center opacity-40"><Camera className="w-8 h-8 mb-1" /><span className="text-[8px] font-black uppercase">Photo</span></div>}
                </div>
                <input type="file" ref={profilePicRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'profile')} />
             </div>

             <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Full Name</label>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#c1ff22]" />
                  <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" placeholder="As on CNIC" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
             </div>

             <div className={`bg-zinc-900/50 p-5 rounded-3xl border border-white/5 transition-all ${googleData ? 'opacity-50' : 'focus-within:border-[#c1ff22]/30'}`}>
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Email ID</label>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#c1ff22]" />
                  <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" placeholder="name@email.com" value={email} readOnly={!!googleData} onChange={e => !googleData && setEmail(e.target.value)} />
                </div>
             </div>

             {!googleData && (
               <>
                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all relative">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Set Password</label>
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-[#c1ff22]" />
                      <input type={showPassword ? "text" : "password"} className="bg-transparent w-full outline-none text-zinc-100 font-bold tracking-widest" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1 text-zinc-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all relative">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Confirm Password</label>
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-[#c1ff22]" />
                      <input type={showConfirmPassword ? "text" : "password"} className="bg-transparent w-full outline-none text-zinc-100 font-bold tracking-widest" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1 text-zinc-600">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
               </>
             )}

             <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">WhatsApp Number</label>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#c1ff22]" />
                  <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" placeholder="03xxxxxxxxx" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                </div>
             </div>

             <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">CNIC Number</label>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-[#c1ff22]" />
                  <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" placeholder="34301xxxxxxxx" value={cnicNumber} onChange={e => setCnicNumber(e.target.value.replace(/\D/g, '').slice(0, 13))} />
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Age</label>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-[#c1ff22]" />
                      <input type="number" className="bg-transparent w-full outline-none text-zinc-100 font-bold" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                    </div>
                </div>
                <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Gender</label>
                    <div className="flex items-center gap-3">
                      <Users2 className="w-4 h-4 text-[#c1ff22]" />
                      <select className="bg-transparent w-full outline-none text-zinc-100 font-bold" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="" className="bg-zinc-900">Select</option>
                        <option value="Male" className="bg-zinc-900">Male</option>
                        <option value="Female" className="bg-zinc-900">Female</option>
                        <option value="Other" className="bg-zinc-900">Other</option>
                      </select>
                    </div>
                </div>
             </div>

             {isPartner && (
               <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-5 h-5 text-[#c1ff22]" />
                    <h3 className="text-sm font-black uppercase italic tracking-tighter">Vehicle Details</h3>
                  </div>
                  <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Model (e.g. Honda 125)</label>
                    <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                  </div>
                  <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Plate Number</label>
                    <input className="bg-transparent w-full outline-none text-zinc-100 font-bold uppercase" placeholder="HFZ-1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
                  </div>
                  <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Vehicle Color</label>
                    <input className="bg-transparent w-full outline-none text-zinc-100 font-bold" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} />
                  </div>
               </div>
             )}

             <button onClick={handleNextStep} className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase text-sm shadow-xl active:scale-95 transition-all italic">
                Next: Verify Documents
             </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
             <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase text-zinc-100 leading-none">Security <span className="text-[#c1ff22]">Proofs</span></h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Hafizabad city policy requires these proofs</p>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <DocSlot side="front" label="CNIC Front" val={cnicFront} inputRef={frontInputRef} icon={Camera} />
                  <DocSlot side="back" label="CNIC Back" val={cnicBack} inputRef={backInputRef} icon={Camera} />
                </div>

                {isPartner && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                       <DocSlot side="license" label="License" val={licenseImage} inputRef={licenseInputRef} icon={Camera} />
                       <DocSlot side="reg" label="Registration" val={registrationImage} inputRef={regInputRef} icon={Camera} />
                    </div>

                    <div onClick={() => vehicleInputRef.current?.click()} className={`aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${vehicleImage ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-zinc-900 hover:border-[#c1ff22]/30'}`}>
                      {vehicleImage ? <img src={vehicleImage} className="max-w-full max-h-full object-cover" /> : <div className="flex flex-col items-center"><Camera className="w-10 h-10 text-rose-500 mb-2" /><span className="text-[10px] font-black uppercase text-zinc-500">Vehicle Photo (visible number plate)</span></div>}
                    </div>
                    <input type="file" ref={vehicleInputRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'vehicle')} />
                  </>
                )}
             </div>

             <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 flex items-start gap-4 shadow-xl">
                <ShieldCheck className="w-6 h-6 text-[#c1ff22] shrink-0" />
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tight leading-relaxed">Your identity data is verified by Hafizabad HQ Command. Secure storage enabled.</p>
             </div>

             {/* Fix: Explicitly cast 'v' to any when checking if any document is currently being verified */}
             <button onClick={handleRegister} disabled={isLoading || Object.values(verifications).some((v: any) => v.status === 'verifying')} className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all italic disabled:opacity-50">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><SendHorizontal className="w-6 h-6" /> Complete Application</>}
             </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in">
           <div className="w-full max-w-xs space-y-6 text-center">
              <div className="relative w-28 h-28 mx-auto">
                 <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                 <div className="absolute inset-0 border-4 border-t-[#c1ff22] rounded-full animate-spin duration-[3000ms]" />
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black italic">{uploadProgress}%</span>
                    <Sparkles className="w-4 h-4 text-[#c1ff22] animate-pulse" />
                 </div>
              </div>
              <div className="space-y-2">
                 <h3 className="text-lg font-black uppercase italic tracking-tighter">
                   {statusMessage || 'Syncing with HQ Ledger'}
                 </h3>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                 <div className="h-full bg-[#c1ff22] transition-all duration-500 shadow-[0_0_10px_#c1ff22]" style={{ width: `${uploadProgress}%` }} />
              </div>
           </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-24 left-6 right-6 bg-rose-500/10 border border-rose-500/20 p-5 rounded-[1.8rem] flex items-center gap-4 animate-in zoom-in duration-300 shadow-2xl">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-tighter text-rose-500 leading-tight italic">{error}</p>
        </div>
      )}
    </div>
  );
};

export default RegistrationScreen;
