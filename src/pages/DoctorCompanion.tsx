import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Mic, MicOff, Image as ImageIcon, X, FileText, Activity, ClipboardList, AlertTriangle, Volume2, Trash2, MessageSquare, Plus } from 'lucide-react';
import { BackButton } from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  metadata?: {
    threatLevel?: string;
    chunksUsed?: number;
    visualSummary?: string;
  };
}

const DoctorCompanion = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'scan' | 'report'>('scan');
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const quickActions = [
    { icon: Activity, label: 'Analyze symptoms', prompt: 'Analyze patient symptoms for differential diagnosis' },
    { icon: ClipboardList, label: 'Review lab report', prompt: 'Review and interpret lab results' },
    { icon: AlertTriangle, label: 'Emergency triage', prompt: 'Provide emergency triage assessment' },
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('doctor_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('doctor_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        imageUrl: msg.image_url || undefined,
        metadata: msg.metadata as Message['metadata'],
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    }
  };

  const createNewConversation = async () => {
    setMessages([]);
    setCurrentConversationId(null);
    setSelectedImage(null);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }

      toast({
        title: 'Success',
        description: 'Conversation deleted',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const saveMessage = async (message: Message, conversationId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          image_url: message.imageUrl,
          metadata: message.metadata,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving message:', error);
    }
  };

  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
  };

  const speakText = async (text: string, messageId: string) => {
    try {
      setIsSpeaking(messageId);
      const cleanText = stripMarkdown(text);
      
      // @ts-ignore - Puter.js is loaded via CDN
      const audio = await puter.ai.txt2speech(cleanText);
      audio.onended = () => setIsSpeaking(null);
      await audio.play();
    } catch (error: any) {
      console.error('TTS Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to play audio',
        variant: 'destructive',
      });
      setIsSpeaking(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      imageUrl: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let convId = currentConversationId;

      if (!convId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
        const { data: newConv, error: convError } = await supabase
          .from('doctor_conversations')
          .insert({ user_id: user.id, title })
          .select()
          .single();

        if (convError) throw convError;
        convId = newConv.id;
        setCurrentConversationId(convId);
        await loadConversations();
      }

      await saveMessage(userMessage, convId);

      const { data, error } = await supabase.functions.invoke('doctor-companion-rag', {
        body: {
          query: input,
          imageBase64: selectedImage,
          imageMode,
          conversationHistory: messages.slice(-6),
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        metadata: data.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage, convId);
      setSelectedImage(null);

      if (data.metadata?.threatLevel === 'HIGH') {
        toast({
          title: '⚠️ High Threat Level Detected',
          description: 'This case requires immediate attention.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: '🎤 Recording...',
        description: 'Speak your query clearly',
      });
    } catch (error) {
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        // Using OpenAI Whisper through edge function for transcription
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) throw error;
        setInput(data.text);
        toast({
          title: '✅ Transcription Complete',
          description: 'Voice converted to text',
        });
      };
    } catch (error) {
      toast({
        title: 'Transcription Failed',
        description: 'Could not convert speech to text',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result?.toString().split(',')[1];
      setSelectedImage(base64String || null);
      toast({
        title: '✅ Image Uploaded',
        description: `${imageMode === 'scan' ? 'Medical scan' : 'Report'} ready for analysis`,
      });
    };
    reader.readAsDataURL(file);
  };

  const getThreatBadgeColor = (level?: string) => {
    switch (level) {
      case 'HIGH': return 'destructive';
      case 'MODERATE': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🩺 Doctor Companion</h1>
            <p className="text-muted-foreground">AI-powered clinical decision support</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  History
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Consultation History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <Card
                        key={conv.id}
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                          currentConversationId === conv.id ? 'border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0" onClick={() => loadConversation(conv.id)}>
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {conversations.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        No conversations yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <BackButton to="/dashboard" />
          </div>
        </div>

        <Card className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="text-6xl">🩺</div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Welcome to Doctor Companion</h2>
                  <p className="text-muted-foreground">
                    Start with a quick action or use text, voice, or image input
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="gap-2 hover:border-primary hover:bg-primary/5"
                      onClick={() => {
                        setInput(action.prompt);
                        handleSendMessage();
                      }}
                    >
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3 space-y-2`}>
                    {msg.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={`data:image/png;base64,${msg.imageUrl}`}
                          alt="Uploaded"
                          className="max-w-full h-auto rounded border"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{stripMarkdown(msg.content)}</p>
                    {msg.metadata && msg.role === 'assistant' && (
                      <div className="flex gap-2 flex-wrap pt-2 border-t border-border/50 items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          {msg.metadata.threatLevel && (
                            <Badge variant={getThreatBadgeColor(msg.metadata.threatLevel)}>
                              Threat: {msg.metadata.threatLevel}
                            </Badge>
                          )}
                          {msg.metadata.chunksUsed && (
                            <Badge variant="outline">
                              📚 {msg.metadata.chunksUsed} KB chunks
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(msg.content, `${idx}`)}
                          disabled={isSpeaking === `${idx}`}
                        >
                          <Volume2 className={`h-4 w-4 ${isSpeaking === `${idx}` ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </Card>

        {selectedImage && (
          <Card className="p-4 border-primary">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  alt="Selected"
                  className="max-h-32 rounded"
                />
              </div>
              <div className="space-y-2">
                <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as 'scan' | 'report')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="scan">Medical Scan</TabsTrigger>
                    <TabsTrigger value="report">Lab Report</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Describe symptoms, ask medical questions, or upload images..."
              className="min-h-[60px]"
              disabled={isLoading}
            />
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!input.trim() && !selectedImage)}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DoctorCompanion;
