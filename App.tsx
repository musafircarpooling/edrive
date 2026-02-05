
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
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import PWAInstallOverlay from './components/PWAInstallOverlay';
import { AppView, UserProfile, RideType } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Clock, ShieldCheck, AlertOctagon, RefreshCcw } from 'lucide-react';

const DEFAULT_PROFILE_PIC = 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>('onboarding');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [googleData, setGoogleData] = useState<{ email: string; name: string } | null>(null);
  const [selectedRegType, setSelectedRegType] = useState<RideType | 'CITIZEN'>('CITIZEN');
  
  const initialProfile: UserProfile = {
    name: 'User',
    lastName: '',
    email: '',
    city: 'Hafizabad',
    phoneNumber: '',
    profilePic: DEFAULT_PROFILE_PIC,
    isDriver: false,
    driverStatus: 'none',
    verificationStatus: 'none'
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Helper to check for active rides in Firestore
  const checkActiveRides = async (email: string) => {
    try {
      const rideQuery = query(
        collection(db, 'ride_requests'), 
        where('passenger_id', '==', email)
      );
      const rideSnap = await getDocs(rideQuery);
      // Find the most recent active ride (pending, accepted, or ongoing)
      const activeRide = rideSnap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .find(d => ['pending', 'accepted', 'ongoing'].includes((d as any).status));
      
      return activeRide ? activeRide.id : null;
    } catch (err) {
      console.error("Error checking active rides:", err);
      return null;
    }
  };

  // Robust Initialization Flow
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        // 1. Minimum Splash Display Time (UX)
        const splashPromise = new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Auth State Check
        const authPromise = new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // We only need the initial state for the boot sequence
            resolve(user);
          });
        });

        // Await both boot requirements
        const [_, user] = await Promise.all([splashPromise, authPromise]);

        if (!isMounted) return;

        // 3. Resolve User Email (Standard Auth or Manual Session)
        let sessionEmail = (user as any)?.email;
        if (!sessionEmail) {
          sessionEmail = localStorage.getItem('edrive_manual_session');
        }

        if (sessionEmail) {
          setIsAuthenticated(true);
          
          // Fetch Profile from Hafizabad Registry
          const docRef = doc(db, 'profiles', sessionEmail);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            let profile: UserProfile = {
              ...initialProfile,
              ...data,
              name: data.name,
              lastName: data.last_name,
              email: sessionEmail,
              verificationStatus: data.verification_status,
              profilePic: data.profile_pic || DEFAULT_PROFILE_PIC,
              phoneNumber: data.phone_number
            };
            
            // Sync Driver Status
            const driverRef = doc(db, 'drivers', sessionEmail);
            const driverSnap = await getDoc(driverRef);
            if (driverSnap.exists()) {
              profile = { ...profile, isDriver: true, driverStatus: driverSnap.data().status };
            }
            
            setUserProfile(profile);

            // Check for Active Engagements (Session Persistence)
            const activeId = await checkActiveRides(sessionEmail);

            if (activeId) {
              setActiveRequestId(activeId);
              setView('searching');
            } else if (profile.driverStatus === 'approved') {
              setView('driver-dashboard');
            } else if (profile.verificationStatus === 'approved') {
              setView('user');
            } else {
              setView('pending-approval');
            }
          } else {
            // User authenticated but no profile record
            setView('registration');
            if (user) setGoogleData({ email: sessionEmail, name: (user as any).displayName || "" });
          }
        } else {
          // No user session found
          setView('onboarding');
        }
      } catch (err) {
        console.error("🔥 eDrive HQ: Boot Error", err);
        setView('onboarding'); // Fallback to start
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setShowSplash(false);
        }
      }
    };

    initializeSession();

    // Secondary listener for realtime auth changes
    const globalUnsub = onAuthStateChanged(auth, (user) => {
      if (!user && !isLoading) {
        // Only log out if no manual session exists
        if (!localStorage.getItem('edrive_manual_session')) {
          setIsAuthenticated(false);
          setUserProfile(initialProfile);
          setView('onboarding');
        }
      }
    });

    return () => {
      isMounted = false;
      globalUnsub();
    };
  }, []);

  const handleAuthSuccess = async (isAdmin?: boolean, profileData?: Partial<UserProfile>) => {
    const finalProfile = { ...initialProfile, ...profileData } as UserProfile;
    setUserProfile(finalProfile);
    setIsAuthenticated(true);
    
    if (isAdmin) {
      setView('admin');
    } else if (finalProfile.email === 'guest@edrive.com') {
      setView('user');
    } else if (finalProfile.verificationStatus === 'pending' || finalProfile.verificationStatus === 'rejected') {
      setView('pending-approval');
    } else {
      // Logic Fix: Check for active rides immediately after successful auth/login
      const activeId = await checkActiveRides(finalProfile.email);
      if (activeId) {
        setActiveRequestId(activeId);
        setView('searching');
      } else if (finalProfile.driverStatus === 'approved') {
        setView('driver-dashboard');
      } else {
        setView('user');
      }
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await auth.signOut();
      localStorage.removeItem('edrive_manual_session');
      setUserProfile(initialProfile);
      setGoogleData(null);
      setActiveRequestId(null);
      setView('onboarding');
    } catch (e) {
      console.error("Logout Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash || isLoading) return <SplashScreen />;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      {view === 'onboarding' && (
        <OnboardingFlow 
          onContinue={(role, data) => { 
            setSelectedRegType(role);
            if (data) setGoogleData(data);
            setView('registration'); 
          }} 
          onLogin={() => setView('login')}
          onSkip={() => handleAuthSuccess(false, { name: 'Guest', email: 'guest@edrive.com', verificationStatus: 'approved' })}
        />
      )}
      
      {view === 'registration' && (
        <RegistrationScreen 
          onBack={() => setView('onboarding')} 
          onSuccess={handleAuthSuccess} 
          googleData={googleData}
          selectedRegType={selectedRegType}
          existingData={userProfile.verificationStatus === 'rejected' ? userProfile : undefined}
        />
      )}

      {view === 'login' && (
        <LoginScreen 
          onBack={() => setView('onboarding')} 
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setView('onboarding')}
        />
      )}

      {view === 'pending-approval' && (
        <div className="flex flex-col h-full bg-[#121212] items-center justify-center p-10 text-center space-y-10 animate-in zoom-in duration-500">
           <div className="relative">
             <div className={`absolute inset-0 rounded-full blur-3xl animate-pulse ${userProfile.verificationStatus === 'rejected' ? 'bg-rose-500/20' : 'bg-[#c1ff22]/20'}`}></div>
             <div className={`w-32 h-32 bg-zinc-900 border-4 rounded-[3rem] flex items-center justify-center relative z-10 transition-colors ${userProfile.verificationStatus === 'rejected' ? 'border-rose-500/30' : 'border-[#c1ff22]/30'}`}>
               {userProfile.verificationStatus === 'rejected' ? (
                 <AlertOctagon className="w-14 h-14 text-rose-500" />
               ) : (
                 <Clock className="w-14 h-14 text-[#c1ff22] animate-pulse" />
               )}
             </div>
           </div>
           <div className="space-y-4">
             <h2 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${userProfile.verificationStatus === 'rejected' ? 'text-rose-500' : 'text-white'}`}>
               {userProfile.verificationStatus === 'rejected' ? 'Access Denied' : 'Security Check'}
             </h2>
             <p className="text-zinc-500 text-xs font-black uppercase tracking-widest leading-loose">
               {userProfile.verificationStatus === 'rejected' 
                 ? "Hafizabad HQ has declined your identity documents." 
                 : "Account registered successfully. Our Hafizabad city admin is verifying your ID documents."}
             </p>
           </div>
           <div className="w-full space-y-3">
             <button onClick={handleLogout} className="w-full bg-zinc-800 text-white py-5 rounded-[2.5rem] font-black uppercase text-sm border border-white/5">Sign Out</button>
           </div>
        </div>
      )}

      {view === 'user' && (
        <HomeScreen 
          userProfile={userProfile}
          onOpenDriverOnboarding={() => setView('driver-onboarding')} 
          onFindDriver={(id) => { setActiveRequestId(id); setView('searching'); }}
          onOpenProfile={() => setView('profile')}
          onOpenHistory={() => setView('history')}
          onLogout={handleLogout}
          onSwitchToDriver={() => setView('driver-dashboard')}
        />
      )}

      {view === 'searching' && activeRequestId && (
        <SearchingScreen 
          requestId={activeRequestId}
          userProfile={userProfile}
          onCancel={() => { 
            setActiveRequestId(null);
            setView('user'); 
          }}
        />
      )}

      {view === 'driver-onboarding' && (
        <DriverOnboarding 
          userProfile={userProfile}
          onBack={() => setView('user')} 
        />
      )}

      {view === 'driver-dashboard' && (
        <DriverDashboard 
          userProfile={userProfile}
          onLogout={handleLogout}
          onSwitchToUser={() => setView('user')}
        />
      )}

      {view === 'profile' && (
        <ProfileScreen 
          userProfile={userProfile} 
          onSave={(u) => { setUserProfile(u); setView('user'); }} 
          onBack={() => setView('user')} 
        />
      )}

      {view === 'history' && (
        <RideHistoryScreen 
          userProfile={userProfile} 
          onBack={() => setView('user')} 
        />
      )}

      {view === 'admin' && (
        <AdminDashboard 
          onLogout={handleLogout} 
        />
      )}

      <PWAInstallOverlay />
    </div>
  );
};

export default App;
