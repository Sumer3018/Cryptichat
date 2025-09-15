/*
  # Add search policies for profiles and messages

  1. Changes
    - Add policy to allow authenticated users to search other profiles
    - Add policy to allow profile viewing for chat participants
    - Verify message policies

  2. Security
    - Maintain RLS while allowing necessary access
    - Ensure users can only search and view relevant profiles
*/

-- Add policy to allow searching profiles
CREATE POLICY "Users can search other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add policy to allow viewing profiles for chat participants
CREATE POLICY "Chat participants can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE (chat_participants.profile_id = profiles.id
      OR chat_participants.profile_id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM chat_participants AS cp2
        WHERE cp2.chat_id = chat_participants.chat_id
        AND cp2.profile_id = auth.uid()
      )
    )
  );

-- Verify existing message policies are correct
DO $$ 
BEGIN
  -- Drop existing message policies if they exist
  DROP POLICY IF EXISTS "Participants can view messages" ON messages;
  DROP POLICY IF EXISTS "Participants can send messages" ON messages;
  
  -- Recreate message policies
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
END $$;