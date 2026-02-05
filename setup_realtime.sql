
-- 1. Ensure the publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Safely add ride_offers to the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ride_offers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_offers;
    END IF;
END $$;

-- 3. Safely add ride_requests to the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ride_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
    END IF;
END $$;

-- 4. Set replica identity to FULL
-- This ensures that the 'old' and 'new' records are available in the payload
ALTER TABLE public.ride_offers REPLICA IDENTITY FULL;
ALTER TABLE public.ride_requests REPLICA IDENTITY FULL;
