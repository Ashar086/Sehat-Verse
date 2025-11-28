-- Create conversations table for Doctor Companion
CREATE TABLE IF NOT EXISTS public.doctor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table for conversation history
CREATE TABLE IF NOT EXISTS public.doctor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.doctor_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
  ON public.doctor_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.doctor_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.doctor_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.doctor_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in own conversations"
  ON public.doctor_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.doctor_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctor_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_doctor_conversations_user_id ON public.doctor_conversations(user_id);
CREATE INDEX idx_doctor_messages_conversation_id ON public.doctor_messages(conversation_id);

-- Create trigger for updated_at
CREATE TRIGGER update_doctor_conversations_updated_at
  BEFORE UPDATE ON public.doctor_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();