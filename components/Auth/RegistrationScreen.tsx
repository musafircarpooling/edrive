
import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2, Mail, Phone, User, Camera, ShieldCheck, Sparkles, AlertCircle, Lock, CalendarDays, CheckCircle2, IdCard, FileBadge, Car, Eye, EyeOff, UserPlus } from 'lucide-react';
import { RideType, UserProfile } from '../../types';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, increment, updateDoc, addDoc } from 'firebase/firestore';
import { compressImage } from '../../utils/imageProcessor';

interface RegistrationScreenProps {
  onBack: () => void;
  onSuccess: (isAdmin?: boolean, profileData?: any) => void;
  googleData?: { email: string; name: string } | null;
  selectedRegType: RideType | 'CITIZEN';
}

const DEFAULT_PIC = 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg';

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onBack, onSuccess, selectedRegType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Basic Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [referralIdInput, setReferralIdInput] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [drivingLicense, setDrivingLicense] = useState<string | null>(null);
  const [registrationCard, setRegistrationCard] = useState<string | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);

  const [uploadingState, setUploadingState] = useState<{
    profile: number;
    cnicFront: number;
    cnicBack: number;
    drivingLicense: number;
    registrationCard: number;
    vehicleImage: number;
  }>({ 
    profile: 0, 
    cnicFront: 0, 
    cnicBack: 0, 
    drivingLicense: 0, 
    registrationCard: 0, 
    vehicleImage: 0 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'profile' | 'cnicFront' | 'cnicBack' | 'drivingLicense' | 'registrationCard' | 'vehicleImage' | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) {
      try {
        const compressed = await compressImage(file, (p) => {
          setUploadingState(prev => ({ ...prev, [uploadTarget]: p }));
        });
        
        if (uploadTarget === 'profile') setProfilePic(compressed);
        if (uploadTarget === 'cnicFront') setCnicFront(compressed);
        if (uploadTarget === 'cnicBack') setCnicBack(compressed);
        if (uploadTarget === 'drivingLicense') setDrivingLicense(compressed);
        if (uploadTarget === 'registrationCard') setRegistrationCard(compressed);
        if (uploadTarget === 'vehicleImage') setVehicleImage(compressed);
        
        setTimeout(() => {
          setUploadingState(prev => ({ ...prev, [uploadTarget]: 0 }));
        }, 800);
      } catch (err) {
        setError("Image optimization failed. Try another photo.");
      }
    }
  };

  const triggerUpload = (type: 'profile' | 'cnicFront' | 'cnicBack' | 'drivingLicense' | 'registrationCard' | 'vehicleImage') => {
    if (uploadingState[type] > 0 && uploadingState[type] < 100) return;
    setUploadTarget(type);
    fileInputRef.current?.click();
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Improved random fixed ID generator
  const generateReferralId = () => {
    return "EDR" + Math.floor(10000 + Math.random() * 89999);
  };

  const calculateReferralReward = (count: number) => {
    if (count <= 10) return 50;
    if (count <= 50) return 100;
    return 200;
  };

  const handleRegister = async () => {
    setError("");
    
    if (!fullName || !email || !password || !phoneNumber) {
      setError("Please fill all required basic fields.");
      return;
    }
    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phoneNumber.length !== 11 || !phoneNumber.startsWith("03")) {
      setError("Mobile number must be 11 digits starting with 03");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const isPartner = selectedRegType !== 'CITIZEN';
    const currentUserType = isPartner ? 'PARTNER' : 'CITIZEN';

    let parentUid = "";
    if (referralIdInput.trim()) {
      const refQuery = query(collection(db, 'users'), where('referralId', '==', referralIdInput.trim().toUpperCase()));
      const refSnap = await getDocs(refQuery);
      if (refSnap.empty) {
        setError("Invalid Referral ID.");
        return;
      }
      const parentData = refSnap.docs[0].data();
      if (parentData.userType !== currentUserType) {
        setError(`${currentUserType} can only use Referral ID of another ${currentUserType}.`);
        return;
      }
      parentUid = refSnap.docs[0].id;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Guaranteed generation of fixed Referral ID
      const myPermanentRefId = generateReferralId();
      
      const profileData: any = {
        uid: user.uid,
        name: fullName,
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber,
        age: age,
        gender: gender,
        profilePic: profilePic || DEFAULT_PIC,
        city: 'Hafizabad',
        registrationType: selectedRegType,
        userType: currentUserType,
        verificationStatus: isPartner ? 'pending' : 'approved',
        isDriver: isPartner,
        driverStatus: isPartner ? 'pending' : 'none',
        createdAt: new Date().toISOString(),
        // Affiliate fields - correctly stored
        referralId: myPermanentRefId,
        referralIdUsed: referralIdInput.trim().toUpperCase() || null,
        parentUserId: parentUid || null,
        referralCount: 0,
        affiliateBalance: 0,
        totalRides: 0,
        totalOrders: 0,
        levelTargetCompleted: 0
      };

      await setDoc(doc(db, 'users', user.uid), profileData);

      if (parentUid) {
        const parentRef = doc(db, 'users', parentUid);
        const parentSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', parentUid)));
        if (!parentSnap.empty) {
          const parentData = parentSnap.docs[0].data();
          const newCount = (parentData.referralCount || 0) + 1;
          const reward = calculateReferralReward(newCount);
          
          await updateDoc(parentRef, {
            referralCount: increment(1),
            affiliateBalance: increment(reward)
          });

          await addDoc(collection(db, 'referral_rewards'), {
            parentUserId: parentUid,
            childUserId: user.uid,
            referralId: referralIdInput.trim().toUpperCase(),
            rewardAmount: reward,
            createdAt: new Date().toISOString()
          });
        }
      }

      localStorage.setItem('edrive_user_session', JSON.stringify(profileData));
      onSuccess(false, profileData);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
      else setError(err.message || "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputContainerStyle = "bg-[#0c0c0c] p-6 rounded-[2rem] border-2 border-white/80 focus-within:border-[#c1ff22] focus-within:shadow-[0_0_25px_rgba(193,255,34,0.1)] transition-all shadow-[0_0_15px_rgba(255,255,255,0.03)]";

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden animate-in fade-in">
      <header className="flex items-center gap-4 px-6 pt-12 pb-4 bg-[#0a0a0a]/80 backdrop-blur-md z-30 shrink-0">
        <button onClick={onBack} className="p-3 bg-white/5 rounded-full text-[#c1ff22] active:scale-90 transition-transform"><ArrowLeft className="w-6 h-6" /></button>
        <div>
           <h1 className="text-xl font-black italic uppercase leading-none">Register</h1>
           <p className="text-[10px] text-[#c1ff22] font-black uppercase tracking-widest mt-1">As {selectedRegType}</p>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 space-y-8 no-scrollbar pb-12 overscroll-contain">
        <div className="flex flex-col items-center py-6">
           <button onClick={() => triggerUpload('profile')} className="relative group">
              <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-2 border-[#c1ff22]/50 bg-zinc-900 flex items-center justify-center relative">
                 {profilePic ? (
                   <img src={profilePic} className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-10 h-10 text-zinc-700" />
                 )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#c1ff22] p-2 rounded-xl text-black shadow-lg z-10">
                 <Camera className="w-4 h-4" />
              </div>
           </button>
           <p className="text-[10px] font-black uppercase text-zinc-200 mt-4 tracking-[0.2em]">Profile Photo</p>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase text-[#c1ff22] tracking-[0.3em] px-2 italic">Basic Information</h3>
           
           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Full Name</label>
              <input className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" placeholder="Enter Full Name" value={fullName} onChange={e => setFullName(e.target.value)} onFocus={handleInputFocus}/>
           </div>

           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">WhatsApp / Phone</label>
              <input className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" placeholder="03000000000" type="tel" value={phoneNumber} onChange={e => {const val = e.target.value.replace(/\D/g, ''); if (val.length <= 11) setPhoneNumber(val);}} onFocus={handleInputFocus}/>
           </div>

           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Email Address</label>
              <input className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" placeholder="example@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={handleInputFocus}/>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className={inputContainerStyle}>
                 <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Age</label>
                 <input className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" placeholder="24" type="number" value={age} onChange={e => setAge(e.target.value)} onFocus={handleInputFocus}/>
              </div>
              <div className={inputContainerStyle}>
                 <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Gender</label>
                 <select className="bg-transparent w-full outline-none text-base font-bold text-white appearance-none tracking-tight" value={gender} onChange={e => setGender(e.target.value)} onFocus={handleInputFocus}>
                    <option value="" className="bg-zinc-900">Select</option>
                    <option value="male" className="bg-zinc-900">Male</option>
                    <option value="female" className="bg-zinc-900">Female</option>
                 </select>
              </div>
           </div>

           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Referral ID (Optional)</label>
              <div className="flex items-center gap-3">
                <UserPlus className="w-4 h-4 text-[#c1ff22]" />
                <input className="bg-transparent w-full outline-none text-base font-bold text-[#c1ff22] placeholder:text-zinc-700 tracking-[0.1em] uppercase" placeholder="e.g. EDR12345" value={referralIdInput} onChange={e => setReferralIdInput(e.target.value)} onFocus={handleInputFocus}/>
              </div>
           </div>

           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Password</label>
              <div className="flex items-center gap-2">
                <input type={showPassword ? "text" : "password"} placeholder="Enter Password"  className="bg-transparent flex-1 outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" value={password} onChange={e => setPassword(e.target.value)} onFocus={handleInputFocus}/>
                <button onClick={() => setShowPassword(!showPassword)} className="text-zinc-400 hover:text-[#c1ff22] transition-colors p-1">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
           </div>

           <div className={inputContainerStyle}>
              <label className="text-[9px] text-zinc-100 uppercase font-black tracking-[0.2em] block mb-2">Confirm Password</label>
              <div className="flex items-center gap-2">
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" className="bg-transparent flex-1 outline-none text-base font-bold text-white placeholder:text-zinc-500 tracking-tight" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onFocus={handleInputFocus}/>
                <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-zinc-400 hover:text-[#c1ff22] transition-colors p-1">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
           </div>
        </div>

        <div className="pt-10 pb-20">
          <button onClick={handleRegister} disabled={isLoading} className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black uppercase text-lg shadow-[0_20px_60px_rgba(193,255,34,0.2)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 italic tracking-tight">
             {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : (<><span>Register Account</span><CheckCircle2 className="w-6 h-6" /></>)}
          </button>
          {error && (<div className="flex items-center gap-2 mt-6 text-rose-500 justify-center animate-in shake px-4"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{error}</p></div>)}
        </div>
      </div>
    </div>
  );
};

export default RegistrationScreen;
