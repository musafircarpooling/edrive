
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import DriverOnboarding from './components/DriverOnboarding';
import OnboardingFlow from './components/Auth/OnboardingFlow';
import RegistrationScreen from './components/Auth/RegistrationScreen';
import LoginScreen from './components/Auth/LoginScreen';
import SearchingScreen from './components/SearchingScreen';
import ProfileScreen from './components/ProfileScreen';
import RideHistoryScreen from './components/RideHistoryScreen';
import AffiliateProgramScreen from './components/AffiliateProgramScreen';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import ReferralScreen from './components/ReferralScreen';
import WelcomeScreen from './components/Auth/WelcomeScreen';
import PWAInstallOverlay from './components/PWAInstallOverlay';
import { AppView, UserProfile, RideType } from './types';
import { Loader2, Clock, ShieldCheck, AlertOctagon, RefreshCcw, Bell } from 'lucide-react';
import { messaging, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

const DEFAULT_PROFILE_PIC = 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg';
const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';

const sanitizeProfile = (profile: any): UserProfile => {
  if (!profile) return {} as UserProfile;
  return { 
    uid: String(profile.uid || ""),
    name: String(profile.name || ""),
    lastName: String(profile.lastName || ""),
    email: String(profile.email || ""),
    city: String(profile.city || "Hafizabad"),
    phoneNumber: String(profile.phoneNumber || ""),
    profilePic: String(profile.profilePic || DEFAULT_PROFILE_PIC),
    age: profile.age ? String(profile.age) : undefined,
    gender: profile.gender ? String(profile.gender) : undefined,
    isDriver: !!profile.isDriver,
    driverStatus: profile.driverStatus || 'none',
    verificationStatus: profile.verificationStatus || 'none',
    cnic: profile.cnic ? String(profile.cnic) : undefined,
    vehicleType: profile.vehicleType as RideType,
    vehicleModel: profile.vehicleModel ? String(profile.vehicleModel) : undefined,
    vehicleNumber: profile.vehicleNumber ? String(profile.vehicleNumber) : undefined,
    vehicleColor: profile.vehicleColor ? String(profile.vehicleColor) : undefined,
    vehicleImage: profile.vehicleImage ? String(profile.vehicleImage) : undefined,
    rewardPoints: Number(profile.rewardPoints || 0),
    fcmToken: profile.fcmToken ? String(profile.fcmToken) : undefined,
    // Affiliate sanitization
    referralId: String(profile.referralId || ""),
    referralIdUsed: profile.referralIdUsed ? String(profile.referralIdUsed) : undefined,
    parentUserId: profile.parentUserId ? String(profile.parentUserId) : undefined,
    referralCount: Number(profile.referralCount || 0),
    affiliateBalance: Number(profile.affiliateBalance || 0),
    totalRides: Number(profile.totalRides || 0),
    totalOrders: Number(profile.totalOrders || 0),
    levelTargetCompleted: Number(profile.levelTargetCompleted || 0),
    userType: profile.userType || 'CITIZEN'
  } as UserProfile;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>('welcome');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [googleData, setGoogleData] = useState<{ email: string; name: string } | null>(null);
  const [selectedRegType, setSelectedRegType] = useState<RideType | 'CITIZEN'>('CITIZEN');
  const [activeNotification, setActiveNotification] = useState<{title: string, body: string} | null>(null);
  
  const initialProfile: UserProfile = {
    name: 'User',
    lastName: '',
    email: '',
    city: 'Hafizabad',
    phoneNumber: '',
    profilePic: DEFAULT_PROFILE_PIC,
    isDriver: false,
    driverStatus: 'none',
    verificationStatus: 'none',
    referralId: '',
    referralCount: 0,
    affiliateBalance: 0,
    totalRides: 0,
    totalOrders: 0,
    levelTargetCompleted: 0,
    userType: 'CITIZEN'
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('edrive_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('edrive_theme', newTheme);
    document.body.className = newTheme === 'light' ? 'light-mode' : '';
  };

  const setupNotifications = async (userId: string) => {
    if (!messaging) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await updateDoc(doc(db, 'users', userId), { fcmToken: token });
          setUserProfile(prev => sanitizeProfile({ ...prev, fcmToken: token }));
        }
      }
    } catch (err) {
      console.error('eDrive FCM Error:', err);
    }
  };

  const checkActivePassengerRide = async (profile: UserProfile): Promise<string | null> => {
    try {
      const passengerId = profile.uid || profile.email;
      const q = query(
        collection(db, 'ride_requests'),
        where('passenger_id', '==', passengerId),
        where('status', 'in', ['pending', 'accepted', 'arrived', 'ongoing']),
        limit(1)
      );
      const snap = await getDocs(q);
      return !snap.empty ? snap.docs[0].id : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const sessionData = localStorage.getItem('edrive_user_session');
        if (sessionData) {
          const profile = sanitizeProfile(JSON.parse(sessionData));
          setUserProfile(profile);
          setIsAuthenticated(true);
          if (profile.uid) setupNotifications(profile.uid);
          if (profile.email === 'jj@gmail.com') {
            setView('admin');
          } else if (profile.driverStatus === 'approved') {
            setView('driver-dashboard');
          } else if (profile.verificationStatus === 'approved') {
            const activeId = await checkActivePassengerRide(profile);
            setView(activeId ? 'searching' : 'user');
            if (activeId) setActiveRequestId(activeId);
          } else if (profile.verificationStatus === 'pending' || profile.verificationStatus === 'rejected') {
            setView('pending-approval');
          } else {
            const activeId = await checkActivePassengerRide(profile);
            setView(activeId ? 'searching' : 'user');
            if (activeId) setActiveRequestId(activeId);
          }
        } else {
          setView('welcome');
        }
      } catch (err) {
        setView('welcome');
      } finally {
        setIsLoading(false);
        setShowSplash(false);
      }
    };
    initializeSession();
  }, []);

  const handleAuthSuccess = async (isAdmin?: boolean, profileData?: Partial<UserProfile>) => {
    const finalProfile = sanitizeProfile({ ...initialProfile, ...profileData });
    setUserProfile(finalProfile);
    setIsAuthenticated(true);
    localStorage.setItem('edrive_user_session', JSON.stringify(finalProfile));
    if (finalProfile.uid) setupNotifications(finalProfile.uid);
    if (isAdmin || finalProfile.email === 'jj@gmail.com') {
      setView('admin');
    } else if (finalProfile.verificationStatus === 'pending' || finalProfile.verificationStatus === 'rejected') {
      setView('pending-approval');
    } else if (finalProfile.driverStatus === 'approved') {
      setView('driver-dashboard');
    } else {
      const activeId = await checkActivePassengerRide(finalProfile);
      setView(activeId ? 'searching' : 'user');
      if (activeId) setActiveRequestId(activeId);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('edrive_user_session');
      setUserProfile(initialProfile);
      setGoogleData(null);
      setActiveRequestId(null);
      setView('welcome');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash || isLoading) return <SplashScreen />;

  return (
    <div className={`relative w-full h-screen overflow-hidden select-none transition-colors duration-300 ${theme === 'light' ? 'bg-[#f8fafc]' : 'bg-black'}`}>
      <PWAInstallOverlay />
      {view === 'welcome' && ( <WelcomeScreen onGetStarted={() => setView('onboarding')} onLogin={() => setView('login')} /> )}
      {view === 'onboarding' && ( <OnboardingFlow onContinue={(role, data) => { setSelectedRegType(role); if (data) setGoogleData(data); setView('registration'); }} onLogin={() => setView('login')} onSkip={() => handleAuthSuccess(false, { name: 'Guest', email: 'guest@edrive.com', verificationStatus: 'approved' })} /> )}
      {view === 'registration' && ( <RegistrationScreen onBack={() => setView('onboarding')} onSuccess={handleAuthSuccess} googleData={googleData} selectedRegType={selectedRegType} /> )}
      {view === 'login' && ( <LoginScreen onBack={() => setView('welcome')} onSuccess={handleAuthSuccess} onSwitchToRegister={() => setView('onboarding')} /> )}
      {view === 'pending-approval' && (
        <div className="flex flex-col h-full items-center justify-center p-10 text-center space-y-10 animate-in zoom-in duration-500">
           <div className="space-y-4">
             <h2 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${userProfile.verificationStatus === 'rejected' ? 'text-rose-500' : 'text-[var(--app-text)]'}`}>
               {userProfile.verificationStatus === 'rejected' ? 'Access Denied' : 'Security Check'}
             </h2>
             <p className="text-[var(--app-text-muted)] text-xs font-black uppercase tracking-widest leading-loose">
               {userProfile.verificationStatus === 'rejected' ? "Hafizabad HQ has declined your identity documents." : "Account registered successfully. Our Hafizabad city admin is verifying your ID documents."}
             </p>
           </div>
           <button onClick={handleLogout} className="w-full bg-[var(--app-surface)] text-[var(--app-text)] py-5 rounded-[2.5rem] font-black uppercase text-sm border border-[var(--app-border)]">Sign Out</button>
        </div>
      )}
      {view === 'user' && ( <HomeScreen theme={theme} onToggleTheme={toggleTheme} userProfile={userProfile} onOpenDriverOnboarding={() => setView('driver-onboarding')} onFindDriver={(id) => { setActiveRequestId(id); setView('searching'); }} onOpenProfile={() => setView('profile')} onOpenHistory={() => setView('history')} onOpenAffiliate={() => setView('affiliate')} onLogout={handleLogout} onSwitchToDriver={() => setView('driver-dashboard')} onOpenAdmin={() => setView('admin')} /> )}
      {view === 'searching' && activeRequestId && ( <SearchingScreen requestId={activeRequestId} userProfile={userProfile} onCancel={() => { setActiveRequestId(null); setView('user'); }} /> )}
      {view === 'driver-onboarding' && ( <DriverOnboarding userProfile={userProfile} onBack={() => setView('user')} /> )}
      {view === 'driver-dashboard' && ( <DriverDashboard userProfile={userProfile} onLogout={handleLogout} onSwitchToUser={() => setView('user')} /> )}
      {view === 'profile' && ( <ProfileScreen userProfile={userProfile} onSave={(u) => { const sanitized = sanitizeProfile(u); setUserProfile(sanitized); localStorage.setItem('edrive_user_session', JSON.stringify(sanitized)); setView('user'); }} onBack={() => setView('user')} /> )}
      {view === 'history' && ( <RideHistoryScreen userProfile={userProfile} onBack={() => setView('user')} /> )}
      {view === 'affiliate' && ( <AffiliateProgramScreen userProfile={userProfile} onBack={() => setView('user')} /> )}
      {view === 'admin' && ( <AdminDashboard onLogout={handleLogout} /> )}
    </div>
  );
};

export default App;
