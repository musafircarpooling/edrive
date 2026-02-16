
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

export type AppView = 'welcome' | 'onboarding' | 'registration' | 'login' | 'user' | 'driver-onboarding' | 'searching' | 'profile' | 'history' | 'map-picker' | 'admin' | 'driver-dashboard' | 'pending-approval' | 'referral' | 'affiliate';

export interface UserProfile {
  uid?: string;
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
  cnic?: string;
  cnicFront?: string;
  cnicBack?: string;
  drivingLicense?: string;
  registrationCard?: string;
  vehicleImage?: string;
  vehicleType?: RideType;
  vehicleModel?: string;
  vehicleNumber?: string;
  vehicleColor?: string;
  referralCode?: string;
  referredBy?: string;
  rewardPoints?: number;
  temp_password?: string;
  fcmToken?: string;
  notificationPreferences?: {
    rideUpdates: boolean;
    promotional: boolean;
    safetyAlerts: boolean;
  };
  // Affiliate Fields
  referralId: string;
  referralIdUsed?: string;
  parentUserId?: string;
  referralCount: number;
  affiliateBalance: number;
  totalRides: number;
  totalOrders: number;
  levelTargetCompleted: number;
  userType: 'CITIZEN' | 'PARTNER';
}

export interface RealtimeRideRequest {
  id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_image?: string;
  pickup_address: string;
  dest_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_lat: number;
  dest_lng: number;
  base_fare: number;
  final_fare?: number;
  ride_type: RideType;
  delivery_category?: string;
  status: 'pending' | 'accepted' | 'arrived' | 'ongoing' | 'completed' | 'cancelled';
  driver_id?: string;
  driver_name?: string;
  driver_image?: string;
  vehicle_image?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  vehicle_color?: string;
  started_at?: string;
  completed_at?: string;
  arrived_at?: string;
  created_at: string;
  cancel_reason?: string;
  instruction_text?: string;
  voice_note_base64?: string;
}

export interface WithdrawRequest {
  id?: string;
  userId: string;
  userName: string;
  amount: number;
  method: 'Easypaisa' | 'JazzCash' | 'PayPal' | 'Bank';
  accountDetails: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type AdminTab = 'metrics' | 'fleet' | 'citizens' | 'approvals' | 'passwords' | 'reports' | 'registry' | 'settings' | 'affiliate_payouts';

/**
 * Represents an advertisement within the app.
 */
export interface AppAd {
  id: string;
  image_url: string;
  is_active: boolean;
  updated_at: string;
}

/**
 * Represents a request to reset a user's password.
 */
export interface PasswordResetRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'pending' | 'completed';
  created_at: string;
  assigned_password?: string;
}

/**
 * Represents a safety or behavioral report against a user.
 */
export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  ride_request_id: string;
  created_at: string;
}

/**
 * Represents a notification sent to a user.
 */
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Valid locations for displaying advertisements.
 */
export type AdLocation = 'home' | 'login' | 'joining_screen';
