/*
  # Fix profile policies to prevent recursion

  1. Changes
    - Simplify profile policies to prevent recursion
    - Remove complex EXISTS clauses
    - Use direct conditions for profile access

  2. Security
    - Maintain proper access control
    - Allow profile searching while preventing recursion
*/

-- Drop all existing profile policies to start fresh
DROP POLICY IF EXISTS "Users can view and search profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create simple, non-recursive policies for profiles
CREATE POLICY IF NOT EXISTS "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Ensure chat_participants policies are correct
DROP POLICY IF EXISTS "Users can view and join chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;

CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR
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

-- Ensure messages policies are correct
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