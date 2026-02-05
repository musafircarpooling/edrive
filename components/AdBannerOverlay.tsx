
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AdLocation } from '../types';

interface AdBannerOverlayProps {
  location: AdLocation;
}

const AdBannerOverlay: React.FC<AdBannerOverlayProps> = ({ location }) => {
  const [adImageUrl, setAdImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const adDoc = await getDoc(doc(db, 'app_ads', location));
        if (adDoc.exists()) {
          const data = adDoc.data();
          if (data.is_active && data.image_url) {
            setAdImageUrl(data.image_url);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Ad retrieval failed:", err);
      }
    };
    fetchAd();
  }, [location]);

  if (!isVisible || !adImageUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-in fade-in duration-500">
      <div className="relative w-full h-full overflow-hidden">
        <img 
          src={adImageUrl} 
          className="w-full h-full object-cover" 
          alt="Advertisement" 
        />
        
        {/* Close Button Top Right */}
        <button 
          onClick={() => setIsVisible(false)} 
          className="absolute top-12 right-6 p-4 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white active:scale-90 transition-all shadow-2xl"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Small badge at bottom */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/10">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em]">Sponsored Advertisement</p>
        </div>
      </div>
    </div>
  );
};

export default AdBannerOverlay;
