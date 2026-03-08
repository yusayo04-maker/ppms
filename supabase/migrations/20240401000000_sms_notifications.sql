-- Migration: SMS Notifications and Scheduling
-- Created: 2024-04-01

-- 1. Create SMS Logs Table
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    contact_no VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'maternal_checkup', 'lab_test'
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "MHO Admins can view all SMS logs" ON sms_logs
    FOR SELECT USING (get_user_role() = 'mho_admin');

-- 4. Enable required extensions for scheduling (if available in Supabase environment)
-- Note: In a real Supabase environment, these are often already enabled or need manual activation via Dashboard.
-- We'll include them here for completeness.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Schedule the Cron Job
-- This will run every day at 8:00 AM UTC (adjust if needed for local time)
-- It calls the Edge Function named 'sms-reminders'
SELECT cron.schedule(
    'send-daily-sms-reminders',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://' || current_setting('request.jwt.claim.iss', true)::text || '.supabase.co/functions/v1/sms-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)::text -- This usually needs a service_role key in practice
        ),
        body := '{}'::jsonb
    )
    $$
);

-- Note: The Authorization header above is a placeholder. 
-- In practice, you'd typically use the service_role key stored in a vault or hardcoded if safe.
-- For local development/setup, the user should ensure the function is public OR use a valid token.
