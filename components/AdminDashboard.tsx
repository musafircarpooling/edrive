
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Car, BarChart3, LogOut, ChevronLeft, 
  RefreshCw, MapPin, Database, Server, Globe, Activity, ShieldCheck, Info, Key, Terminal,
  ImageIcon, Check, X, AlertCircle, Settings, Layers, Megaphone, Loader2, Plus, Trash2, Search as SearchIcon,
  Phone, Mail, Calendar, User, UserCheck, UserX, ShieldAlert, Award, Lock, Clock, Send, Navigation, Target, Zap, Upload, Sparkles, Image as ImageIconLucide,
  Flag, History, Wallet, CheckCircle2, MoreVertical, Edit2, Printer, Menu, LifeBuoy, ExternalLink, ZoomIn, Banknote, CreditCard, Smartphone
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, setDoc, deleteDoc, addDoc, limit, orderBy, getDoc, deleteField } from 'firebase/firestore';
import { UserProfile, RideType, AppAd, DynamicLocation, PasswordResetRequest, RealtimeRideRequest, AdminTab, UserReport, WithdrawRequest } from '../types';
import { RIDE_OPTIONS } from '../constants';
import { compressImage } from '../utils/imageProcessor';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [dynamicAreas, setDynamicAreas] = useState<DynamicLocation[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [pendingRides, setPendingRides] = useState<RealtimeRideRequest[]>([]);
  const [activeRides, setActiveRides] = useState<RealtimeRideRequest[]>([]);
  const [allReports, setAllReports] = useState<UserReport[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<WithdrawRequest[]>([]);
  const [supportWhatsApp, setSupportWhatsApp] = useState("");
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  
  const [systemStats, setSystemStats] = useState({ 
    users: 0, 
    captains: 0, 
    activeRides: 0, 
    pendingRides: 0,
    pendingApprovals: 0,
    resetRequests: 0,
    reports: 0,
    payoutsPending: 0
  });

  const [ads, setAds] = useState<Record<string, string>>({});
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const sliderInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIconType, setUploadingIconType] = useState<string | null>(null);
  const [iconProgress, setIconProgress] = useState(0);

  // Data Cleaners - CRITICAL for preventing Circular Reference Errors
  const cleanProfile = (data: any, id: string): UserProfile => ({
    uid: String(id),
    name: String(data.name || ""),
    lastName: String(data.lastName || ""),
    email: String(data.email || ""),
    city: String(data.city || "Hafizabad"),
    phoneNumber: String(data.phoneNumber || ""),
    profilePic: String(data.profilePic || ""),
    age: String(data.age || ""),
    gender: String(data.gender || ""),
    isDisabled: !!data.isDisabled,
    isDriver: !!data.isDriver,
    driverStatus: (data.driverStatus || "none") as any,
    verificationStatus: (data.verificationStatus || "none") as any,
    vehicleType: data.vehicleType,
    vehicleModel: String(data.vehicleModel || ""),
    vehicleNumber: String(data.vehicleNumber || ""),
    vehicleColor: String(data.vehicleColor || ""),
    referralCode: String(data.referralCode || ""),
    rewardPoints: Number(data.rewardPoints || 0),
    cnicFront: String(data.cnicFront || ""),
    cnicBack: String(data.cnicBack || ""),
    drivingLicense: String(data.drivingLicense || ""),
    registrationCard: String(data.registrationCard || ""),
    vehicleImage: String(data.vehicleImage || ""),
    referralId: String(data.referralId || ""),
    referralCount: Number(data.referralCount || 0),
    affiliateBalance: Number(data.affiliateBalance || 0),
    totalRides: Number(data.totalRides || 0),
    totalOrders: Number(data.totalOrders || 0),
    levelTargetCompleted: Number(data.levelTargetCompleted || 0),
    userType: (data.userType || 'CITIZEN') as any
  });

  const cleanRide = (data: any, id: string): RealtimeRideRequest => ({
    id: String(id),
    passenger_id: String(data.passenger_id || ""),
    passenger_name: String(data.passenger_name || ""),
    pickup_address: String(data.pickup_address || ""),
    dest_address: String(data.dest_address || ""),
    pickup_lat: Number(data.pickup_lat || 0),
    pickup_lng: Number(data.pickup_lng || 0),
    dest_lat: Number(data.dest_lat || 0),
    dest_lng: Number(data.dest_lng || 0),
    base_fare: Number(data.base_fare || 0),
    final_fare: data.final_fare ? Number(data.final_fare) : undefined,
    ride_type: data.ride_type,
    status: data.status,
    created_at: String(data.created_at || ""),
    driver_id: data.driver_id ? String(data.driver_id) : undefined
  });

  const cleanLocation = (data: any, id: string): DynamicLocation => ({
    id: String(id),
    name: String(data.name || ""),
    address: String(data.address || ""),
    category: String(data.category || ""),
    lat: Number(data.lat || 0),
    lng: Number(data.lng || 0),
    created_at: String(data.created_at || "")
  });

  const cleanReset = (data: any, id: string): PasswordResetRequest => ({
    id: String(id),
    name: String(data.name || ""),
    phone: String(data.phone || ""),
    email: String(data.email || ""),
    status: (data.status || "pending") as any,
    created_at: String(data.created_at || ""),
    assigned_password: data.assigned_password ? String(data.assigned_password) : undefined
  });

  const cleanReport = (data: any, id: string): UserReport => ({
    id: String(id),
    reporter_id: String(data.reporter_id || ""),
    reported_id: String(data.reported_id || ""),
    reason: String(data.reason || ""),
    details: String(data.details || ""),
    ride_request_id: String(data.ride_request_id || ""),
    created_at: String(data.created_at || "")
  });

  const cleanPayout = (data: any, id: string): WithdrawRequest => ({
    id: String(id),
    userId: String(data.userId || ""),
    userName: String(data.userName || ""),
    amount: Number(data.amount || 0),
    method: (data.method || "Easypaisa") as any,
    accountDetails: String(data.accountDetails || ""),
    bankName: data.bankName ? String(data.bankName) : undefined,
    status: (data.status || "pending") as any,
    createdAt: String(data.createdAt || "")
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => cleanProfile(d.data(), d.id)));
    });

    const unsubPending = onSnapshot(query(collection(db, 'ride_requests'), where('status', '==', 'pending')), (snap) => {
      setPendingRides(snap.docs.map(d => cleanRide(d.data(), d.id)));
    });

    const unsubActive = onSnapshot(query(collection(db, 'ride_requests'), where('status', 'in', ['accepted', 'arrived', 'ongoing'])), (snap) => {
      setActiveRides(snap.docs.map(d => cleanRide(d.data(), d.id)));
    });

    const unsubAreas = onSnapshot(collection(db, 'city_locations'), (snap) => {
      setDynamicAreas(snap.docs.map(d => cleanLocation(d.data(), d.id)));
    });

    const unsubResets = onSnapshot(collection(db, 'password_resets'), (snap) => {
      setResetRequests(snap.docs.map(d => cleanReset(d.data(), d.id)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      setAllReports(snap.docs.map(d => cleanReport(d.data(), d.id)));
    });

    const unsubPayouts = onSnapshot(collection(db, 'withdraw_requests'), (snap) => {
      setPayoutRequests(snap.docs.map(d => cleanPayout(d.data(), d.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    const unsubAds = onSnapshot(collection(db, 'app_ads'), (snap) => {
      const adData: Record<string, string> = {};
      snap.docs.forEach(doc => adData[doc.id] = String(doc.data().image_url || ""));
      setAds(adData);
    });

    const unsubIcons = onSnapshot(doc(db, 'app_settings', 'ride_icons'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const cleaned: Record<string, string> = {};
        Object.keys(data).forEach(k => { if (typeof data[k] === 'string') cleaned[k] = data[k]; });
        setCustomIcons(cleaned);
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'support'), (snap) => {
      if (snap.exists()) setSupportWhatsApp(String(snap.data().whatsapp || ""));
    });

    const unsubSlider = onSnapshot(doc(db, 'app_settings', 'slider_images'), (snap) => {
      if (snap.exists()) setSliderImages(snap.data().images || []);
    });

    return () => { 
      unsubUsers(); unsubPending(); unsubActive(); unsubAreas(); unsubAds(); unsubResets(); unsubIcons(); unsubReports(); unsubSettings(); unsubSlider(); unsubPayouts();
    };
  }, []);

  useEffect(() => {
    setSystemStats({
      users: allUsers.filter(u => !u.isDriver).length,
      captains: allUsers.filter(u => u.isDriver && u.driverStatus === 'approved').length,
      activeRides: activeRides.length,
      pendingRides: pendingRides.length,
      pendingApprovals: allUsers.filter(u => u.isDriver && u.verificationStatus === 'pending').length,
      resetRequests: resetRequests.filter(r => r.status === 'pending').length,
      reports: allReports.length,
      payoutsPending: payoutRequests.filter(p => p.status === 'pending').length
    });
  }, [allUsers, activeRides, pendingRides, resetRequests, allReports, payoutRequests]);

  const handlePayoutStatus = async (payoutId: string, status: 'approved' | 'rejected') => {
    setIsUpdating(payoutId);
    try {
      await updateDoc(doc(db, 'withdraw_requests', payoutId), { status });
    } catch (e) {
      alert("Action failed.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateWhatsApp = async () => {
    setIsUpdating('whatsapp');
    try {
      await setDoc(doc(db, 'app_settings', 'support'), { whatsapp: supportWhatsApp }, { merge: true });
      alert("WhatsApp number updated.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleStatusChange = async (userId: string, status: 'approved' | 'rejected') => {
    setIsUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: status,
        driverStatus: status === 'approved' ? 'approved' : 'none'
      });
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, verificationStatus: status, driverStatus: status === 'approved' ? 'approved' : 'none' } : null);
      }
    } catch (err) {
      alert("Update failed");
    } finally {
      setIsUpdating(null);
    }
  };

  const triggerIconUpload = (type: string) => { setUploadingIconType(type); iconInputRef.current?.click(); };
  const triggerSliderUpload = () => { sliderInputRef.current?.click(); };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingIconType) {
      try {
        const compressed = await compressImage(file, (p) => setIconProgress(p));
        const iconRef = doc(db, 'app_settings', 'ride_icons');
        await setDoc(iconRef, { [uploadingIconType]: compressed }, { merge: true });
      } catch (err) {
        alert("Upload failed.");
      } finally { setUploadingIconType(null); setIconProgress(0); }
    }
  };

  const handleDeleteIcon = async (type: string) => {
    if (!confirm(`Clear icon for ${type}?`)) return;
    try {
      const iconRef = doc(db, 'app_settings', 'ride_icons');
      await updateDoc(iconRef, { [type]: deleteField() });
    } catch (err) {
      alert("Reset failed.");
    }
  };

  const handleSliderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUpdating('slider');
      try {
        const compressed = await compressImage(file, () => {});
        const current = [...sliderImages, compressed];
        await setDoc(doc(db, 'app_settings', 'slider_images'), { images: current }, { merge: true });
      } finally { setIsUpdating(null); }
    }
  };

  const deleteSliderImage = async (idx: number) => {
    if (!confirm("Remove banner?")) return;
    const current = sliderImages.filter((_, i) => i !== idx);
    await setDoc(doc(db, 'app_settings', 'slider_images'), { images: current }, { merge: true });
  };

  const NavItem = ({ tab, icon: Icon, label, badge = 0 }: { tab: AdminTab, icon: any, label: string, badge?: number }) => (
    <button 
      onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }}
      className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${activeTab === tab ? 'bg-[#c1ff22] text-black shadow-lg scale-105' : 'text-zinc-400 hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-4">
        <Icon className="w-5 h-5" />
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      {badge > 0 && <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${activeTab === tab ? 'bg-black text-[#c1ff22]' : 'bg-[#c1ff22] text-black animate-pulse'}`}>{badge}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden relative">
      <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
      <input type="file" ref={sliderInputRef} className="hidden" accept="image/*" onChange={handleSliderUpload} />
      
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[1100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-4/5 max-w-[320px] bg-[#0c0c0c] border-r border-white/5 p-8 flex flex-col animate-in slide-in-from-left duration-500 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="bg-[#c1ff22] w-10 h-10 rounded-xl flex items-center justify-center text-black font-black italic transform -skew-x-6 text-xl">e</div>
                <h2 className="text-sm font-black uppercase tracking-tighter italic">HQ Menu</h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 active:scale-90 transition-transform"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
              <NavItem tab="metrics" icon={BarChart3} label="Operations HQ" />
              <NavItem tab="fleet" icon={Car} label="Fleet Partners" />
              <NavItem tab="citizens" icon={Users} label="Citizen Registry" />
              <NavItem tab="approvals" icon={ShieldCheck} label="Pending Approvals" badge={systemStats.pendingApprovals} />
              <NavItem tab="affiliate_payouts" icon={Wallet} label="Affiliate Payouts" badge={systemStats.payoutsPending} />
              <NavItem tab="passwords" icon={Key} label="Password Resets" badge={systemStats.resetRequests} />
              <NavItem tab="reports" icon={ShieldAlert} label="Safety Reports" badge={systemStats.reports} />
              <NavItem tab="registry" icon={MapPin} label="Map Registry" />
              <NavItem tab="settings" icon={Settings} label="System Settings" />
            </div>
            <div className="mt-10 pt-8 border-t border-white/5">
              <button onClick={onLogout} className="w-full flex items-center gap-4 p-5 rounded-2xl text-rose-500 hover:bg-rose-500/5 transition-all">
                <LogOut className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-widest">Exit HQ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white/5 rounded-2xl text-[#c1ff22] active:scale-90 transition-all"><Menu className="w-6 h-6" /></button>
          <div>
            <h1 className="text-[11px] font-black uppercase tracking-widest leading-none">Hafizabad HQ</h1>
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1 italic">{activeTab.replace('_', ' ').toUpperCase()}</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-[#c1ff22]/10 rounded-2xl border border-[#c1ff22]/20 flex items-center justify-center"><Database className="w-5 h-5 text-[#c1ff22]" /></div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 no-scrollbar pb-12">
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-gradient-to-br from-[#c1ff22] to-[#a8e010] p-10 rounded-[3rem] text-black shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Database className="w-48 h-48" /></div>
               <div className="relative z-10"><p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Live City Status</p><p className="text-4xl font-black tracking-tighter mt-1 italic uppercase leading-none">Fleet <br/>Intelligence</p></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-2 text-left"><p className="text-3xl font-black italic">{systemStats.activeRides}</p><p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Active Trips</p></div>
                <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-2 text-left"><p className="text-3xl font-black italic">{systemStats.captains}</p><p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Verified Captains</p></div>
                <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-2 text-left"><p className="text-3xl font-black italic">{systemStats.pendingApprovals}</p><p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Pending Partners</p></div>
                <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-2 text-left"><p className="text-3xl font-black italic">{systemStats.payoutsPending}</p><p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Payout Requests</p></div>
             </div>
          </div>
        )}

        {activeTab === 'affiliate_payouts' && (
          <div className="space-y-6 animate-in slide-in-from-right">
             <h2 className="text-xl font-black uppercase italic">Affiliate <span className="text-[#c1ff22]">Payouts</span></h2>
             <div className="space-y-4">
                {payoutRequests.length === 0 ? (
                  <div className="py-20 text-center opacity-20"><Wallet className="w-16 h-16 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">No payout requests</p></div>
                ) : (
                  payoutRequests.map(req => (
                    <div key={req.id} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-5">
                       <div className="flex justify-between items-start">
                          <div>
                             <h4 className="font-black text-white text-sm uppercase italic">{req.userName}</h4>
                             <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-[#c1ff22] italic">Rs {req.amount.toLocaleString()}</p>
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : req.status === 'pending' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-rose-500/10 text-rose-500'}`}>{req.status}</span>
                          </div>
                       </div>
                       
                       <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                             {req.method === 'Easypaisa' || req.method === 'JazzCash' ? <Smartphone className="w-5 h-5 text-green-400" /> : <Banknote className="w-5 h-5 text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{req.method} Details</p>
                             <p className="text-xs font-bold text-white truncate">{req.accountDetails} {req.bankName ? `(${req.bankName})` : ''}</p>
                          </div>
                       </div>

                       {req.status === 'pending' && (
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handlePayoutStatus(req.id!, 'rejected')} className="bg-rose-500/10 text-rose-500 py-4 rounded-xl text-[9px] font-black uppercase active:scale-95 border border-rose-500/20">Reject</button>
                            <button onClick={() => handlePayoutStatus(req.id!, 'approved')} className="bg-[#c1ff22] text-black py-4 rounded-xl text-[9px] font-black uppercase active:scale-95 flex items-center justify-center">
                               {isUpdating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve & Clear'}
                            </button>
                         </div>
                       )}
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in slide-in-from-right">
            <h2 className="text-xl font-black uppercase italic">HQ <span className="text-[#c1ff22]">Config</span></h2>
            
            <div className="bg-zinc-900/60 p-8 rounded-[3rem] border border-white/5 space-y-6">
               <div className="flex items-center gap-3"><Car className="w-5 h-5 text-[#c1ff22]" /><h3 className="text-[10px] font-black uppercase text-[#c1ff22] tracking-widest">Fleet Service Icons</h3></div>
               <p className="text-[9px] text-zinc-500 uppercase font-bold italic">Upload custom PNG/JPG icons for Moto, Rickshaw, Car, and Delivery. These are visible during ride selection.</p>
               
               <div className="grid grid-cols-2 gap-4">
                  {RIDE_OPTIONS.map(option => (
                    <div key={option.type} className="bg-black/40 p-5 rounded-[2rem] border border-white/5 space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">{option.label}</p>
                          {customIcons[option.type] && (
                            <button onClick={() => handleDeleteIcon(option.type)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                          )}
                       </div>
                       <div className="aspect-square bg-zinc-900/50 rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/5 shadow-inner group">
                          {customIcons[option.type] ? (
                            <img src={customIcons[option.type]} className="w-16 h-16 object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 opacity-10">
                               <ImageIconLucide className="w-8 h-8" />
                               <span className="text-[7px] font-black uppercase">Not Set</span>
                            </div>
                          )}
                          {uploadingIconType === option.type && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                               <div className="text-center">
                                  <Loader2 className="w-6 h-6 animate-spin text-[#c1ff22] mx-auto mb-1" />
                                  <span className="text-[9px] font-black text-[#c1ff22]">{iconProgress}%</span>
                               </div>
                            </div>
                          )}
                       </div>
                       <button 
                        onClick={() => triggerIconUpload(option.type)}
                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${customIcons[option.type] ? 'bg-[#c1ff22]/10 text-[#c1ff22] border border-[#c1ff22]/20' : 'bg-zinc-800 text-zinc-400'}`}
                       >
                         {customIcons[option.type] ? 'Update Icon' : 'Upload Icon'}
                       </button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-zinc-900/60 p-8 rounded-[3rem] border border-white/5 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-[#c1ff22]" /><h3 className="text-[10px] font-black uppercase text-[#c1ff22] tracking-widest">Home Slider Banners</h3></div>
                  <button onClick={triggerSliderUpload} className="p-3 bg-[#c1ff22] text-black rounded-xl active:scale-95 transition-all">
                    {isUpdating === 'slider' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  {sliderImages.map((img, i) => (
                    <div key={i} className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-white/5 group bg-zinc-800">
                       <img src={img} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => deleteSliderImage(i)} className="p-3 bg-rose-500 rounded-2xl text-white shadow-xl scale-90 active:scale-75 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                  ))}
                  {sliderImages.length === 0 && <div className="col-span-2 py-10 text-center opacity-10 italic uppercase font-black text-[9px]">No custom banners active</div>}
               </div>
            </div>

            <div className="bg-zinc-900/60 p-8 rounded-[3rem] border border-white/5 space-y-6">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><LifeBuoy className="w-5 h-5 text-[#c1ff22]" /><h3 className="text-[10px] font-black uppercase text-[#c1ff22] tracking-widest">Contact Support</h3></div><button onClick={handleUpdateWhatsApp} className="bg-[#c1ff22] text-black px-6 py-2 rounded-xl font-black uppercase text-[9px] active:scale-95 transition-all">{isUpdating === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}</button></div>
              <input className="w-full bg-black/40 p-5 rounded-2xl text-sm font-bold border border-white/5 outline-none focus:border-[#c1ff22]/20" placeholder="+92 300 0000000" value={supportWhatsApp} onChange={e => setSupportWhatsApp(e.target.value)} />
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <h2 className="text-xl font-black uppercase italic">Fleet <span className="text-[#c1ff22]">Database</span></h2>
            <div className="space-y-4">
              {allUsers.filter(u => u.isDriver && u.driverStatus === 'approved').map(driver => (
                <div key={driver.uid} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={driver.profilePic} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                    <div>
                      <h4 className="font-black text-white text-sm uppercase italic">{driver.name}</h4>
                      <p className="text-[10px] font-black text-zinc-500 uppercase">{driver.vehicleModel} • {driver.vehicleNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(driver)} className="p-3 bg-white/5 rounded-xl text-[#c1ff22]"><ExternalLink className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'citizens' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <h2 className="text-xl font-black uppercase italic">Citizen <span className="text-[#c1ff22]">Registry</span></h2>
            <div className="space-y-4">
              {allUsers.filter(u => !u.isDriver).map(user => (
                <div key={user.uid} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <img src={user.profilePic} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                     <div><h4 className="font-black text-white text-sm uppercase italic">{user.name}</h4><p className="text-[9px] font-bold text-zinc-600 uppercase">{user.phoneNumber}</p></div>
                   </div>
                   <button onClick={() => setSelectedUser(user)} className="p-3 bg-white/5 rounded-xl text-[#c1ff22]"><User className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6 animate-in slide-in-from-right">
             <h2 className="text-xl font-black uppercase italic">Pending <span className="text-[#c1ff22]">Approvals</span></h2>
             <div className="space-y-4">
                {allUsers.filter(u => u.isDriver && u.verificationStatus === 'pending').map(user => (
                   <div key={user.uid} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <img src={user.profilePic} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                         <div><h4 className="font-black text-white text-sm uppercase italic">{user.name}</h4><p className="text-[9px] font-bold text-[#c1ff22] uppercase">{user.vehicleType} Application</p></div>
                      </div>
                      <button onClick={() => setSelectedUser(user)} className="p-3 bg-[#c1ff22] text-black rounded-xl active:scale-95 transition-all"><ShieldCheck className="w-5 h-5" /></button>
                   </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Official Profile View Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1200] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-300">
          <header className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/40 shrink-0">
            <button onClick={() => setSelectedUser(null)} className="p-2 bg-white/5 rounded-xl text-[#c1ff22]"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-base font-black italic uppercase leading-none">Identity <span className="text-[#c1ff22]">Review</span></h2>
            <button onClick={() => setSelectedUser(null)} className="p-2 bg-white/5 rounded-xl text-zinc-500"><X className="w-5 h-5" /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar pb-32 bg-white text-black">
             <div className="border-[4px] border-black p-8 relative">
                <div className="absolute top-4 right-4 opacity-10"><Database className="w-20 h-20" /></div>
                <div className="flex items-center gap-6 mb-10 border-b-2 border-black pb-6">
                   <img src={selectedUser.profilePic} className="w-24 h-24 rounded-2xl object-cover border-2 border-black shadow-md" />
                   <div>
                      <h3 className="text-2xl font-black uppercase italic leading-none">{selectedUser.name}</h3>
                      <p className="text-[10px] font-black uppercase text-zinc-500 mt-2">Verified Citizen Registry</p>
                      <p className="text-[8px] font-bold uppercase mt-1">UID: {selectedUser.uid?.toUpperCase()}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 text-left">
                   <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contact No</p><p className="text-sm font-bold">{selectedUser.phoneNumber}</p></div>
                   <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Email ID</p><p className="text-sm font-bold break-all">{selectedUser.email}</p></div>
                   <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Affiliate ID</p><p className="text-sm font-bold text-[#c1ff22] bg-black px-2 py-0.5 inline-block rounded">{selectedUser.referralId || 'NONE'}</p></div>
                   <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">City</p><p className="text-sm font-bold">Hafizabad</p></div>
                </div>

                {selectedUser.isDriver && (
                  <div className="mt-10 pt-10 border-t-2 border-dashed border-black">
                     <h4 className="text-[10px] font-black uppercase mb-6 bg-black text-white px-3 py-1 inline-block">Partner Document Repository</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5" onClick={() => setFullImage(selectedUser.cnicFront!)}>
                           <p className="text-[7px] font-black text-zinc-500 uppercase">CNIC Front</p>
                           <div className="aspect-[3/2] bg-zinc-100 rounded border border-black/10 overflow-hidden flex items-center justify-center">{selectedUser.cnicFront ? <img src={selectedUser.cnicFront} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-10" />}</div>
                        </div>
                        <div className="space-y-1.5" onClick={() => setFullImage(selectedUser.cnicBack!)}>
                           <p className="text-[7px] font-black text-zinc-500 uppercase">CNIC Back</p>
                           <div className="aspect-[3/2] bg-zinc-100 rounded border border-black/10 overflow-hidden flex items-center justify-center">{selectedUser.cnicBack ? <img src={selectedUser.cnicBack} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-10" />}</div>
                        </div>
                        <div className="space-y-1.5" onClick={() => setFullImage(selectedUser.drivingLicense!)}>
                           <p className="text-[7px] font-black text-zinc-500 uppercase">Driving License</p>
                           <div className="aspect-[3/2] bg-zinc-100 rounded border border-black/10 overflow-hidden flex items-center justify-center">{selectedUser.drivingLicense ? <img src={selectedUser.drivingLicense} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-10" />}</div>
                        </div>
                        <div className="space-y-1.5" onClick={() => setFullImage(selectedUser.vehicleImage!)}>
                           <p className="text-[7px] font-black text-zinc-500 uppercase">Vehicle Photo</p>
                           <div className="aspect-[3/2] bg-zinc-100 rounded border border-black/10 overflow-hidden flex items-center justify-center">{selectedUser.vehicleImage ? <img src={selectedUser.vehicleImage} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-10" />}</div>
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>

          <div className="p-6 bg-black border-t border-white/5 grid grid-cols-2 gap-3 pb-12">
            <button onClick={() => handleStatusChange(selectedUser.uid!, 'rejected')} className="bg-rose-500/10 text-rose-500 py-6 rounded-2xl font-black uppercase text-[10px] border border-rose-500/20 active:scale-95 transition-all">Reject / Terminate</button>
            <button onClick={() => handleStatusChange(selectedUser.uid!, 'approved')} className="bg-[#c1ff22] text-black py-6 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all flex items-center justify-center">
              {isUpdating === selectedUser.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authorize Identity'}
            </button>
          </div>
        </div>
      )}

      {fullImage && (
        <div className="fixed inset-0 z-[2000] bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFullImage(null)}>
           <button className="absolute top-10 right-6 p-3 bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button>
           <img src={fullImage} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
