/*
  # Add online_at column to profiles table

  1. Changes
    - Add `online_at` column to profiles table for tracking user online status
*/

DO $$ 
BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_at timestamptz;
EXCEPTION 
  WHEN others THEN NULL;
END $$;