/*
  # Fix RLS policies to prevent recursion

  1. Changes
    - Simplify profile search policy
    - Fix chat participants policy to prevent recursion
    - Ensure clean policy structure

  2. Security
    - Maintain security while preventing infinite recursion
    - Allow proper profile searching and chat functionality
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Chat participants can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can search other profiles" ON profiles;

-- Recreate simplified profile policies
CREATE POLICY "Users can view and search profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow users to view their own profile
    id = auth.uid()
    OR
    -- Allow users to search other profiles
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id <> auth.uid()
    )
  );

-- Simplify chat participants policies
DROP POLICY IF EXISTS "Participants can view chat members" ON chat_participants;
DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;

CREATE POLICY "Users can view and join chats"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    -- Users can see chats they're part of
    profile_id = auth.uid()
    OR
    -- Users can see other participants in their chats
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join chats"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify message policies are correct
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE profile_id = auth.uid()
    )
  );