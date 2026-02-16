
-- PERFORMANCE OPTIMIZATIONS FOR EDrive Hafizabad HQ --

-- 1. Index for Citizen Approval & Login Flow
-- Speeds up searching for pending verifications and authenticating emails
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_unique ON public.profiles (phone_number);

-- 2. Index for Captain/Partner Approval & Status Check
-- Speeds up the "Fleet" tab and login status verification
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_email_unique ON public.drivers (email);

-- 3. Optimization for City Location Registry
-- Ensures city-wide landmark lookups remain instant
CREATE INDEX IF NOT EXISTS idx_city_locations_name ON public.city_locations (name);

-- 4. Enable Row Level Security (RLS) Performance
-- Forces the database to use optimized security checks
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.drivers FORCE ROW LEVEL SECURITY;

-- Note: Run these commands in your Supabase SQL Editor to apply.
