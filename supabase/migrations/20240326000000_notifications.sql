-- Migration: Notifications System
-- Created: 2024-03-26

-- 1. Create Notification Type Enum
CREATE TYPE notification_type AS ENUM ('lab_overdue', 'referral', 'system');

-- 2. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  barangay_target VARCHAR(255), -- If NULL, visible to all (system-wide)
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- MHO Admins see all
CREATE POLICY "MHO Admins can access all notifications" ON notifications
  FOR ALL USING (get_user_role() = 'mho_admin');

-- BHWs see notifications for their barangay
CREATE POLICY "BHWs can view notifications for their barangay" ON notifications
  FOR SELECT USING (
    barangay_target = get_user_barangay() OR barangay_target IS NULL
  );

-- BHWs can dismiss notifications for their barangay
CREATE POLICY "BHWs can dismiss notifications for their barangay" ON notifications
  FOR UPDATE USING (
    barangay_target = get_user_barangay() OR barangay_target IS NULL
  )
  WITH CHECK (is_dismissed = TRUE);

-- 5. Helper Function to generate automated notifications (optional/future)
-- This could be triggered by a cron job or background worker to check overdue labs
