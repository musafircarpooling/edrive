
import React, { useEffect, useRef, useState } from 'react';
import { RIDE_OPTIONS } from '../constants';
import { RideType, DriverLocation, LocationData } from '../types';
import { Radio } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

declare var L: any; // Leaflet Global

interface MapContainerProps {
  selectedRideType?: RideType;
  activeTripPath?: { pickup: LocationData; destination: LocationData; route?: any };
  drivers?: (DriverLocation & { id: string })[];
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  selectedRideType, 
  activeTripPath,
  drivers = [],
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const driverMarkersRef = useRef<Map<string, any>>(new Map());
  const prevPositionsRef = useRef<Map<string, { lat: number, lng: number }>>(new Map());
  const staticMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any | null>(null);
  
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubIcons = onSnapshot(doc(db, 'app_settings', 'ride_icons'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() || {};
        const cleaned: Record<string, string> = {};
        // Strip any non-string objects to avoid circular structure issues from Firestore internals
        Object.keys(data).forEach(k => {
          if (typeof data[k] === 'string') {
            cleaned[k] = data[k];
          }
        });
        setCustomIcons(cleaned);
      }
    });
    return () => unsubIcons();
  }, []);

  const calculateBearing = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    const startLatRad = (startLat * Math.PI) / 180;
    const startLngRad = (startLng * Math.PI) / 180;
    const endLatRad = (endLat * Math.PI) / 180;
    const endLngRad = (endLng * Math.PI) / 180;

    const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
    const x =
      Math.cos(startLatRad) * Math.sin(endLatRad) -
      Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  useEffect(() => {
    if (!mapDivRef.current || mapInstance.current || !L) return;

    mapInstance.current = L.map(mapDivRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      tap: true,
      dragging: true
    }).setView([32.0709, 73.6880], 15);

    mapInstance.current.zoomControl.setPosition('bottomright');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !L) return;

    staticMarkersRef.current.forEach(m => m.remove());
    staticMarkersRef.current = [];
    if (polylineRef.current) polylineRef.current.remove();

    if (activeTripPath) {
      if (activeTripPath.route) {
        polylineRef.current = L.polyline(activeTripPath.route, {
          color: '#c1ff22',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapInstance.current);
      }

      const pickupIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-[#c1ff22]/20 rounded-full animate-ping"></div>
            <div class="w-5 h-5 bg-black rounded-full border-[3px] border-[#c1ff22] shadow-2xl z-10"></div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const pMarker = L.marker([activeTripPath.pickup.lat, activeTripPath.pickup.lng], { icon: pickupIcon }).addTo(mapInstance.current);
      staticMarkersRef.current.push(pMarker);

      const destIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 bg-rose-500 rounded-full rounded-bl-none rotate-45 border-2 border-white flex items-center justify-center shadow-2xl">
              <div class="w-2.5 h-2.5 bg-white rounded-full -rotate-45"></div>
            </div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
      const dMarker = L.marker([activeTripPath.destination.lat, activeTripPath.destination.lng], { icon: destIcon }).addTo(mapInstance.current);
      staticMarkersRef.current.push(dMarker);

      try {
        const bounds = L.latLngBounds([
          [activeTripPath.pickup.lat, activeTripPath.pickup.lng],
          [activeTripPath.destination.lat, activeTripPath.destination.lng]
        ]);
        mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      } catch (e) {}
    }
  }, [activeTripPath]);

  useEffect(() => {
    if (!mapInstance.current || !L) return;

    const currentDriverIds = new Set(drivers.map(d => d.id));

    driverMarkersRef.current.forEach((marker, id) => {
      if (!currentDriverIds.has(id)) {
        marker.remove();
        driverMarkersRef.current.delete(id);
        prevPositionsRef.current.delete(id);
      }
    });

    drivers.forEach(driver => {
      const rideOption = RIDE_OPTIONS.find(o => o.type === driver.type) || RIDE_OPTIONS[0];
      const iconUrl = customIcons[driver.type] || rideOption.icon;

      const existingMarker = driverMarkersRef.current.get(driver.id);
      const prevPos = prevPositionsRef.current.get(driver.id);
      
      let rotation = driver.rotation || 0;
      if (prevPos && (prevPos.lat !== driver.lat || prevPos.lng !== driver.lng)) {
        rotation = calculateBearing(prevPos.lat, prevPos.lng, driver.lat, driver.lng);
      }

      if (existingMarker) {
        existingMarker.setLatLng([driver.lat, driver.lng]);
        const iconElement = existingMarker.getElement();
        if (iconElement) {
          const wrapper = iconElement.querySelector('.driver-icon-wrapper') as HTMLElement;
          if (wrapper) wrapper.style.transform = `rotate(${rotation}deg)`;
          const img = iconElement.querySelector('img');
          if (img && img.src !== iconUrl) img.src = iconUrl;
        }
      } else {
        const driverIcon = L.divIcon({
          html: `
            <div class="driver-icon-wrapper relative w-12 h-12 flex items-center justify-center" style="transform: rotate(${rotation}deg); transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);">
              <div class="absolute w-10 h-10 bg-[#c1ff22]/20 rounded-full border border-[#c1ff22]/40 shadow-[0_0_15px_rgba(193,255,34,0.4)]"></div>
              <div class="relative w-9 h-9 bg-zinc-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-xl p-1.5">
                 <img src="${iconUrl}" class="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-[#c1ff22] rounded-full border-2 border-black shadow-sm animate-pulse z-10"></div>
            </div>
          `,
          className: 'driver-marker-animate', 
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        const marker = L.marker([driver.lat, driver.lng], { 
          icon: driverIcon,
          zIndexOffset: 2000 
        }).addTo(mapInstance.current);
        
        driverMarkersRef.current.set(driver.id, marker);
      }
      prevPositionsRef.current.set(driver.id, { lat: driver.lat, lng: driver.lng });
    });
  }, [drivers, customIcons]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#17181a]">
      <style>{`
        .driver-marker-animate {
          transition: transform 1.2s linear !important;
          z-index: 2000 !important;
        }
        @keyframes marker-ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .animate-ping {
          animation: marker-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
      <div ref={mapDivRef} className="w-full h-full z-0" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default MapContainer;
