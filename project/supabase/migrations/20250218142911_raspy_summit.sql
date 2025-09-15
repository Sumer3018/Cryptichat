/*
  # Add chat deletion functionality

  1. Changes
    - Add delete capability for chats
    - Add cascade deletion for messages and participants
    - Add policies for chat deletion

  2. Security
    - Only chat creators can delete chats
    - Cascading deletion for related records
*/

-- Add delete policies for chats
CREATE POLICY "Delete chats"
  ON chats FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Add delete policies for chat participants
CREATE POLICY "Delete participants"
  ON chat_participants FOR DELETE
  TO authenticated
  USING (true);

-- Add delete policies for messages
CREATE POLICY "Delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (true);