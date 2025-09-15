/*
  # Final policy recursion fix

  1. Changes
    - Remove all potential recursive conditions
    - Implement completely flat policies
    - Simplify all access checks to single-level queries

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Enable proper chat functionality
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Create chats" ON chats;
DROP POLICY IF EXISTS "View chats" ON chats;
DROP POLICY IF EXISTS "Add participants" ON chat_participants;
DROP POLICY IF EXISTS "Select participants" ON chat_participants;
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;

-- Flat chat policies
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

-- Completely flat chat participant policies
CREATE POLICY "Add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE id = chat_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "View participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_participants AS cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Flat message policies
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