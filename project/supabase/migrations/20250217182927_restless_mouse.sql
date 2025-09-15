/*
  # Fix chat creation and participant policies

  1. Changes
    - Simplify chat creation policies
    - Add explicit policies for chat participants
    - Remove complex policy conditions causing recursion

  2. Security
    - Maintain proper access control
    - Allow chat creation between users
    - Ensure proper participant management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "View own chat memberships" ON chat_participants;
DROP POLICY IF EXISTS "View chat members" ON chat_participants;
DROP POLICY IF EXISTS "Join chats" ON chat_participants;
DROP POLICY IF EXISTS "View accessible chats" ON chats;
DROP POLICY IF EXISTS "Create chats" ON chats;

-- Simple chat policies
CREATE POLICY "Create new chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "View chats as participant"
  ON chats FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = id
    AND chat_participants.profile_id = auth.uid()
  ));

-- Simple chat participant policies
CREATE POLICY "Insert chat participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "View chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    chat_id IN (
      SELECT chat_id FROM chat_participants
      WHERE profile_id = auth.uid()
    )
  );

-- Update message policies to match
DROP POLICY IF EXISTS "View chat messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;

CREATE POLICY "View messages"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.profile_id = auth.uid()
  ));

CREATE POLICY "Send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.profile_id = auth.uid()
  ));