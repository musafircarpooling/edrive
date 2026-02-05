
export enum RideType {
  MOTO = 'MOTO',
  RIDE = 'RIDE',
  RICKSHAW = 'RICKSHAW',
  CITY_TO_CITY = 'CITY_TO_CITY',
  DELIVERY = 'DELIVERY',
  SERVICES = 'SERVICES'
}

export interface RideOption {
  type: RideType;
  label: string;
  icon: string;
  capacity: number;
}

export interface LocationData {
  id?: string;
  name?: string;
  address: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  category?: string;
}

export interface DynamicLocation {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  created_at?: string;
}

export interface DriverLocation {
  id: string;
  type: RideType;
  lat: number;
  lng: number;
  rotation: number;
}

export type AppView = 'onboarding' | 'registration' | 'login' | 'user' | 'driver-onboarding' | 'searching' | 'profile' | 'history' | 'map-picker' | 'admin' | 'driver-dashboard' | 'pending-approval';

export interface UserProfile {
  name: string;
  lastName: string;
  email: string;
  city: string;
  phoneNumber: string;
  profilePic: string;
  age?: string;
  gender?: string;
  isDisabled?: boolean;
  isDriver?: boolean;
  driverStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'none';
  cnicFront?: string;
  cnicBack?: string;
  vehicleType?: RideType;
}

export interface PasswordResetRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface AdminConfig {
  support_whatsapp: string;
}

export interface RealtimeRideRequest {
  id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_image?: string;
  pickup_address: string;
  dest_address: string;
  base_fare: number;
  ride_type: RideType;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  driver_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  cancel_reason?: string;
  from_city?: string;
  to_city?: string;
  seats?: number;
  departure_time?: string;
  description?: string;
  delivery_details?: string;
  item_type?: string;
  voice_note?: string; 
  service_type?: string;
}

export interface AppReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  ride_id: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'ride_request' | 'system' | 'alert';
  is_read: boolean;
  created_at: string;
}

export interface DriverData {
  id: string;
  fullName: string;
  phoneNumber: string;
  cnic: string;
  age?: string;
  gender?: string;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleType: RideType;
  licenseImage: string | null;
  registrationImage: string | null;
  cnicFront: string | null;
  cnicBack: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  rating: number;
  totalRides: number;
  email?: string;
}

export type AdLocation = 'login' | 'home' | 'citizen_reg' | 'partner_reg' | 'driver_db' | 'joining_screen';

export interface AppAd {
  id: string;
  image_url: string;
  is_active: boolean;
  updated_at: string;
}

export interface SliderItem {
  id: string;
  title: string;
  desc: string;
  badge: string;
  image: string;
  is_active: boolean;
  created_at: string;
}

export interface AppComplaint {
  id: string;
  reporter_email: string;
  reporter_name: string;
  reporter_pic?: string;
  subject: string;
  message: string;
  target_name: string;
  target_phone: string;
  target_email: string;
  proof_image?: string | null;
  created_at: string;
  status: 'open' | 'closed' | 'investigating';
}
