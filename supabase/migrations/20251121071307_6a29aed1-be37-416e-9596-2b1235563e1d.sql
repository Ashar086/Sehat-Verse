-- Create triage conversations table for persistent chat history
CREATE TABLE IF NOT EXISTS public.triage_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Health Consultation',
  language TEXT NOT NULL DEFAULT 'english',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create triage messages table
CREATE TABLE IF NOT EXISTS public.triage_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.triage_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.triage_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for triage_conversations
CREATE POLICY "Users can view own triage conversations"
  ON public.triage_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own triage conversations"
  ON public.triage_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own triage conversations"
  ON public.triage_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own triage conversations"
  ON public.triage_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for triage_messages
CREATE POLICY "Users can view messages in own conversations"
  ON public.triage_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.triage_conversations
      WHERE triage_conversations.id = triage_messages.conversation_id
      AND triage_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.triage_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.triage_conversations
      WHERE triage_conversations.id = triage_messages.conversation_id
      AND triage_conversations.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_triage_conversations_user_id ON public.triage_conversations(user_id);
CREATE INDEX idx_triage_messages_conversation_id ON public.triage_messages(conversation_id);
CREATE INDEX idx_triage_messages_created_at ON public.triage_messages(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_triage_conversations_updated_at
  BEFORE UPDATE ON public.triage_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();