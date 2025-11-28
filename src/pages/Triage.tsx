import { useState, useRef, useEffect } from "react";
import * as LangChain from "langchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackAgentVisit } from "@/utils/trackAgentVisit";
import {
  MessageSquare,
  Send,
  Mic,
  
  Activity,
  AlertCircle,
  CheckCircle,
  Brain,
  Phone,
  Hospital,
  History,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BackButton } from "@/components/BackButton";

interface Message {
  role: "user" | "assistant";
  content: string;
  urgency?: "critical" | "high";
  timestamp: Date;
  imageUrl?: string;
  facilityRecommendation?: any;
  nearbyFacilities?: any[];
  healthRecordSaved?: boolean;
  isXrayDetected?: boolean;
  xrayRecommendation?: string;
}

const Triage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "السلام علیکم! I'm your RapidCare Health Agent.\n\n🩺 Tell me your symptoms in:\n• اردو (Urdu)\n• Roman Urdu (mujhe bukhar hai)\n• English\n\n📸 You can also send medical images (reports, wounds, medicine labels)\n\nمیں آپ کی صحت کا خیال رکھنے کے لیے حاضر ہوں۔",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showEmergencyActions, setShowEmergencyActions] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log('📍 Location detected:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('📍 Location permission denied or unavailable:', error);
        }
      );
    }
  }, []);

  // Example LangChain flow usage (best-effort, may crash if langchain not available)
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on Triage page", lc?.version || "no-version");
        if (lc?.Flow) {
          const flow = (lc as any).Flow?.create?.({});
          console.log("LangChain Flow:", flow);
        } else if (lc?.LLMChain) {
          const chain = new (lc as any).LLMChain({ llm: {} });
          console.log("LLMChain created", chain);
        }
      } catch (err) {
        console.warn("LangChain init error (triage)", err);
      }
    })();
  }, []);

  // Get authenticated user and load conversation history if resuming
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Track agent visit
        trackAgentVisit('RapidCare');
        
        // Check if resuming a conversation
        const resumeConversationId = searchParams.get('conversation');
        if (resumeConversationId) {
          await loadConversationHistory(resumeConversationId);
        }
      } else {
        toast({
          title: "Authentication Required",
          description: "Please log in to use the Triage Agent.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };
    getUser();
  }, [navigate, toast, searchParams]);

  const loadConversationHistory = async (conversationId: string) => {
    try {
      setIsLoadingHistory(true);
      setConversationId(conversationId);

      // Load conversation details
      const { data: conversation, error: convError } = await supabase
        .from("triage_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;

      // Load messages
      const { data: messagesData, error: msgError } = await supabase
        .from("triage_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      // Convert DB messages to UI format
      const loadedMessages: Message[] = messagesData.map((msg) => {
        const metadata = msg.metadata as any || {};
        return {
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at || ""),
          urgency: metadata.urgency,
          facilityRecommendation: metadata.facilityRecommendation,
          nearbyFacilities: metadata.nearbyFacilities,
          healthRecordSaved: metadata.healthRecordSaved,
          isXrayDetected: metadata.isXrayDetected,
          xrayRecommendation: metadata.xrayRecommendation,
        };
      });

      setMessages(loadedMessages);
      
      toast({
        title: "Conversation Loaded",
        description: "You can continue from where you left off.",
      });
    } catch (error: any) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveMessageToDb = async (message: Message, currentConversationId: string) => {
    try {
      const { error } = await supabase
        .from("triage_messages")
        .insert({
          conversation_id: currentConversationId,
          role: message.role,
          content: message.content,
          metadata: {
            urgency: message.urgency,
            facilityRecommendation: message.facilityRecommendation,
            nearbyFacilities: message.nearbyFacilities,
            healthRecordSaved: message.healthRecordSaved,
            isXrayDetected: message.isXrayDetected,
            xrayRecommendation: message.xrayRecommendation,
          },
        });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving message:", error);
    }
  };

  const createOrUpdateConversation = async (userMessage: string): Promise<string> => {
    try {
      if (conversationId) {
        // Update existing conversation
        await supabase
          .from("triage_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
        
        return conversationId;
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from("triage_conversations")
          .insert({
            user_id: userId!,
            title: userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
            language: "english", // Will be detected by backend
          })
          .select()
          .single();

        if (error) throw error;
        
        setConversationId(data.id);
        return data.id;
      }
    } catch (error: any) {
      console.error("Error managing conversation:", error);
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || !userId) return;

    const userMessageContent = input || "📸 [Medical image attached]";
    const currentImage = selectedImage;
    
    const userMessage: Message = {
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      imageUrl: currentImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);

    try {
      // Create or get conversation ID
      const currentConversationId = await createOrUpdateConversation(userMessageContent);
      
      // Save user message to DB
      await saveMessageToDb(userMessage, currentConversationId);

      const { data, error } = await supabase.functions.invoke("triage-agent", {
        body: {
          symptoms: userMessageContent,
          userId: userId,
          conversationId: currentConversationId,
          userLocation: userLocation,
          imageBase64: currentImage,
        },
      });

      if (error) throw error;

      // Store conversationId for subsequent messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        urgency: data.urgency,
        timestamp: new Date(),
        facilityRecommendation: data.facilityRecommendation,
        nearbyFacilities: data.nearbyFacilities,
        healthRecordSaved: data.healthRecordSaved,
        isXrayDetected: data.isXrayDetected,
        xrayRecommendation: data.xrayRecommendation,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message to DB
      await saveMessageToDb(assistantMessage, currentConversationId);

      // Show success toast for health record saving
      if (data.healthRecordSaved) {
        toast({
          title: "✅ Health Record Saved",
          description: "This consultation has been automatically saved to your Health Records.",
        });
      }

      if (data.urgency === "critical" || data.urgency === "high") {
        toast({
          title: data.urgency === "critical" ? "⚠️ Critical Alert" : "⚠️ High Priority",
          description: data.urgency === "critical" 
            ? "Based on your symptoms, immediate medical attention is needed. Call 1122 now!"
            : "Based on your symptoms, you should seek medical attention soon.",
          variant: data.urgency === "critical" ? "destructive" : "default",
        });
        
        // Show emergency action buttons for critical cases
        if (data.urgency === "critical") {
          setShowEmergencyActions(true);
        }
      }
    } catch (error: any) {
      console.error("Triage error:", error);
      toast({
        title: "Error",
        description: "Failed to process symptoms. Please try again.",
        variant: "destructive",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, I'm having trouble processing your request. Please try again or contact emergency services if urgent.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Not Supported",
        description: "Audio recording is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    // If already recording, stop it
    if (isListening && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsTranscribing(true);

        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
            if (!base64Audio) {
              throw new Error('Failed to convert audio to base64');
            }

            // Send to transcription edge function
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { audio: base64Audio }
            });

            if (error) throw error;

            if (data?.text) {
              setInput(data.text);
              toast({
                title: "🎤 Transcription Complete",
                description: "Your voice has been converted to text.",
              });
            } else {
              throw new Error('No transcription received');
            }
          };

          reader.onerror = () => {
            throw new Error('Failed to read audio file');
          };

        } catch (error: any) {
          console.error('Transcription error:', error);
          toast({
            title: "Transcription Failed",
            description: "Could not transcribe your audio. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsTranscribing(false);
          audioChunksRef.current = [];
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      
      toast({
        title: "🎤 Recording...",
        description: "Speak your symptoms in Urdu, English, or any Pakistani language. Tap again to stop.",
      });

    } catch (error: any) {
      console.error('Audio recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyCall = () => {
    window.location.href = 'tel:1122';
    toast({
      title: "🚨 Calling Emergency",
      description: "Connecting you to 1122...",
    });
  };

  const handleFindFacilities = () => {
    navigate('/facility-finder');
    toast({
      title: "🏥 Opening Facility Finder",
      description: "Finding nearby hospitals for emergency care...",
    });
  };

  const getUrgencyClass = (urgency?: string) => {
    switch (urgency) {
      case "critical":
        return "urgency-critical";
      case "high":
        return "urgency-high";
      default:
        return "";
    }
  };

  const getUrgencyIcon = (urgency?: string) => {
    switch (urgency) {
      case "critical":
      case "high":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton to="/dashboard" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/triage-history")}
            title="View conversation history"
          >
            <History className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">RapidCare</h1>
              <Badge className="agent-badge">
                <Brain className="w-3 h-3" />
                AI-Powered
              </Badge>
            </div>
          </div>
          <Button
            onClick={handleEmergencyCall}
            className="bg-destructive hover:bg-destructive/90 text-white font-bold animate-glow-pulse"
            size="sm"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call 1122
          </Button>
        </div>
      </header>

      {/* Emergency Action Banner */}
      {showEmergencyActions && (
        <div className="sticky top-[73px] z-40 bg-destructive/95 backdrop-blur-lg border-b-2 border-destructive animate-pulse">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center animate-bounce">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-bold text-lg">⚠️ CRITICAL - Immediate Action Required</h3>
                  <p className="text-white/90 text-sm">Your symptoms indicate you need emergency medical attention</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleEmergencyCall}
                  variant="default"
                  size="lg"
                  className="flex-1 sm:flex-none bg-white text-destructive hover:bg-white/90 font-bold animate-glow-pulse"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call 1122 Now
                </Button>
                <Button
                  onClick={handleFindFacilities}
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-none border-white text-white hover:bg-white/10"
                >
                  <Hospital className="w-5 h-5 mr-2" />
                  Find Hospital
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="container mx-auto px-4 py-6 max-w-4xl mb-32">
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : `story-card ${message.urgency ? getUrgencyClass(message.urgency) : ""}`
                }`}
              >
                {message.urgency === "critical" && (
                  <div className="mb-3 p-3 bg-destructive/20 rounded-lg border border-destructive animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <span className="text-sm font-bold text-destructive uppercase">
                        🚨 CRITICAL - EMERGENCY ACTION NEEDED
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={handleEmergencyCall}
                        size="sm"
                        className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call 1122
                      </Button>
                      <Button
                        onClick={handleFindFacilities}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Hospital className="w-4 h-4 mr-1" />
                        Find Hospital
                      </Button>
                    </div>
                  </div>
                )}
                {message.urgency && message.urgency !== "critical" && (
                  <div className="flex items-center gap-2 mb-2">
                    {getUrgencyIcon(message.urgency)}
                    <span className="text-xs font-semibold uppercase">
                      {message.urgency} Priority
                    </span>
                  </div>
                )}
                
                {/* Facility Recommendation */}
                {message.facilityRecommendation && (
                  <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Hospital className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold">Recommended Hospital</span>
                    </div>
                    <p className="text-sm font-semibold">{message.facilityRecommendation.name}</p>
                    <p className="text-xs text-muted-foreground">{message.facilityRecommendation.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {message.facilityRecommendation.distance && `${message.facilityRecommendation.distance}km away`}
                      {message.facilityRecommendation.phone && ` • ${message.facilityRecommendation.phone}`}
                    </p>
                    <Button
                      onClick={handleFindFacilities}
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                    >
                      View on Facility Finder
                    </Button>
                  </div>
                )}

                {/* Health Record Saved Notification */}
                {message.healthRecordSaved && (
                  <div className="mb-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        Consultation saved to Health Records
                      </span>
                    </div>
                  </div>
                )}

                {/* X-ray Detection with Imaging Agent Button */}
                {message.isXrayDetected && (
                  <div className="mb-3 p-4 bg-blue-500/10 rounded-lg border-2 border-blue-500/30 animate-pulse">
                    <div className="flex items-start gap-3">
                      <Activity className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">
                          🔬 X-ray / Medical Imaging Detected
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {message.xrayRecommendation || "For detailed radiological analysis with AI-powered insights, use our specialized Imaging Agent."}
                        </p>
                        <Button
                          onClick={() => navigate('/imaging')}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                          size="sm"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          Open Imaging Agent for X-ray Analysis
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Display */}
                {message.imageUrl && (
                  <div className="mb-3">
                    <img 
                      src={message.imageUrl} 
                      alt="Medical image" 
                      className="rounded-lg max-w-full h-auto max-h-64 object-contain border border-border"
                    />
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <span className="text-xs opacity-60 mt-2 block">
                  {message.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="story-card p-4 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                  </div>
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img 
                src={selectedImage} 
                alt="Selected medical image" 
                className="rounded-lg max-h-32 object-contain border-2 border-primary"
              />
              <Button
                onClick={removeImage}
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="medical-image-upload"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Upload medical image (report, wound, medicine)"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoiceInput}
              disabled={isTranscribing || isLoading}
              className={isListening ? "bg-red-500 text-white animate-pulse" : ""}
              title={isListening ? "Recording... (tap to stop)" : "Record voice"}
            >
              {isTranscribing ? (
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce delay-200" />
                </div>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="بخار، سر درد، کھانسی... | bukhar, dard, khansi... | fever, headache, cough..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {isListening && "🎤 Recording... Tap mic to stop"}
            {isTranscribing && "⏳ Transcribing your voice..."}
            {!isListening && !isTranscribing && "🎤 Voice input supports Urdu, English, Punjabi & more | Emergency? Call 1122"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Triage;
