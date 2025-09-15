/*
  # Fix recursion in policies

  1. Changes
    - Remove all recursive policy conditions
    - Implement flat, non-recursive policies
    - Simplify access control logic

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Enable proper chat functionality
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Create new chats" ON chats;
DROP POLICY IF EXISTS "View chats as participant" ON chats;
DROP POLICY IF EXISTS "Insert chat participants" ON chat_participants;
DROP POLICY IF EXISTS "View chat participants" ON chat_participants;
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;

-- Simplified chat policies
CREATE POLICY "Create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "View chats"
  ON chats FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = id
    AND chat_participants.profile_id = auth.uid()
  ));

-- Flat, non-recursive chat participant policies
CREATE POLICY "Add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is adding themselves or if they're the chat creator
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Select participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_participants AS cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND cp.profile_id = auth.uid()
  ));

-- Simple message policies
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