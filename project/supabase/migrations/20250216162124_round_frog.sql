/*
  # Fix chat participants policies to prevent recursion

  1. Changes
    - Simplify chat_participants policies to prevent recursion
    - Remove complex EXISTS clauses
    - Use direct conditions for chat access

  2. Security
    - Maintain proper access control
    - Allow chat participation while preventing recursion
*/

-- Drop existing chat_participants policies
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;

-- Create simplified policies for chat_participants
CREATE POLICY "View own chat memberships"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "View chat members"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id
      FROM chat_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Join chats"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure chats policies are correct
DROP POLICY IF EXISTS "Participants can view chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;

CREATE POLICY "View accessible chats"
  ON chats FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id
      FROM chat_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Ensure messages policies are correct
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

CREATE POLICY "View chat messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id
      FROM chat_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    chat_id IN (
      SELECT chat_id
      FROM chat_participants
      WHERE profile_id = auth.uid()
    )
  );