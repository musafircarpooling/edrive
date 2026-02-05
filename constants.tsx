import { RideType, RideOption, LocationData, DriverLocation } from './types';

export const PAKISTAN_CITIES = [
  "Hafizabad", "Pindi Bhattian", "Sukheke", "Jalalpur Bhattian"
];

export const HAFIZABAD_LANDMARKS: LocationData[] = [
  // Major Chowks & Centers
  { name: "Fawara Chowk", address: "Main City Center, Hafizabad", city: "Hafizabad", area: "City Center", lat: 32.0711, lng: 73.6875, category: 'center' },
  { name: "Post Office Chowk", address: "Near Old City, Hafizabad", city: "Hafizabad", area: "City Center", lat: 32.0700, lng: 73.6860, category: 'center' },
  { name: "Do-Burji Chowk", address: "Gujranwala Road, Hafizabad", city: "Hafizabad", area: "Gujranwala Rd", lat: 32.0685, lng: 73.6920, category: 'center' },
  
  // Surrounding Local Areas
  { name: "Vanike Tarar", address: "Village Vanike Tarar, Hafizabad", city: "Hafizabad", area: "West", lat: 32.1150, lng: 73.5580, category: 'landmark' },
  { name: "Kassoki", address: "Village Kassoki, Hafizabad", city: "Hafizabad", area: "East", lat: 32.0650, lng: 73.7420, category: 'landmark' },
  { name: "Sagar", address: "Village Sagar, Hafizabad", city: "Hafizabad", area: "North", lat: 32.1320, lng: 73.6750, category: 'landmark' },
  { name: "Sukheke Mandi", address: "Mandi Sukheke, Hafizabad", city: "Hafizabad", area: "South", lat: 31.9167, lng: 73.4833, category: 'transport' },

  // Government & Health
  { name: "DHQ Hospital", address: "Main Road, Hafizabad", city: "Hafizabad", area: "City Center", lat: 32.0650, lng: 73.6950, category: 'hospital' },
  { name: "Railway Station", address: "Station Road, Hafizabad", city: "Hafizabad", area: "Railway Station", lat: 32.0730, lng: 73.6800, category: 'transport' },
  { name: "General Bus Stand", address: "Vanike Road, Hafizabad", city: "Hafizabad", area: "Transport Hub", lat: 32.0740, lng: 73.6740, category: 'transport' },

  // Housing
  { name: "Model Town", address: "Phase 1, Hafizabad", city: "Hafizabad", area: "Housing", lat: 32.0620, lng: 73.6880, category: 'housing' },
  { name: "Al-Noor Garden", address: "Housing Colony, Hafizabad", city: "Hafizabad", area: "Housing", lat: 32.0550, lng: 73.6900, category: 'housing' }
];

export const RIDE_OPTIONS: RideOption[] = [
  { type: RideType.MOTO, label: "Moto", icon: "https://cdn-icons-png.flaticon.com/512/3721/3721619.png", capacity: 1 },
  { type: RideType.RICKSHAW, label: "Rickshaw", icon: "https://cdn-icons-png.flaticon.com/512/2920/2920250.png", capacity: 3 },
  { type: RideType.RIDE, label: "Car", icon: "https://cdn-icons-png.flaticon.com/512/744/744465.png", capacity: 4 },
  { type: RideType.DELIVERY, label: "Delivery", icon: "https://cdn-icons-png.flaticon.com/512/709/709790.png", capacity: 1 }
];

export const MOCK_RIDE_HISTORY: any[] = [];

export const APP_THEME = {
  primary: '#c1ff22',
  background: '#121212',
  surface: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
};