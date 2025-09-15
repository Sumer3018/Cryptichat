/*
  # Update RLS policies for existing tables
  
  1. Changes
    - Adds IF NOT EXISTS to all table creation statements
    - Wraps policy creation in PL/pgSQL blocks to handle existing policies
    - Ensures idempotent execution
  
  2. Security
    - Maintains all existing RLS policies
    - Adds missing INSERT policy for profiles table
*/

-- Safely create tables if they don't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  encrypted_content text NOT NULL,
  shift_keys integer[] NOT NULL,
  vigenere_key text NOT NULL,
  steg_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Safely create policies
DO $$ 
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  
  CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  -- Chats policies
  DROP POLICY IF EXISTS "Participants can view chats" ON chats;
  DROP POLICY IF EXISTS "Users can create chats" ON chats;
  
  CREATE POLICY "Participants can view chats"
    ON chats FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_id = chats.id
        AND profile_id = auth.uid()
      )
    );

  CREATE POLICY "Users can create chats"
    ON chats FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Chat participants policies
  DROP POLICY IF EXISTS "Participants can view chat members" ON chat_participants;
  DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;
  
  CREATE POLICY "Participants can view chat members"
    ON chat_participants FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_id = chat_participants.chat_id
        AND profile_id = auth.uid()
      )
    );

  CREATE POLICY "Users can join chats"
    ON chat_participants FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Messages policies
  DROP POLICY IF EXISTS "Participants can view messages" ON messages;
  DROP POLICY IF EXISTS "Participants can send messages" ON messages;
  
  CREATE POLICY "Participants can view messages"
    ON messages FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_id = messages.chat_id
        AND profile_id = auth.uid()
      )
    );

  CREATE POLICY "Participants can send messages"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_id = messages.chat_id
        AND profile_id = auth.uid()
      )
    );
EXCEPTION 
  WHEN others THEN NULL;
END $$;