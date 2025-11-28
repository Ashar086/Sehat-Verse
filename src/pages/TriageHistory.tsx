import { useState, useEffect } from "react";
import * as LangChain from "langchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import {
  MessageSquare,
  Clock,
  Activity,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  language: string;
  message_count?: number;
  last_message?: string;
}

const TriageHistory = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  // LangChain snippet for history page
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on TriageHistory page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (triage history)", err);
      }
    })();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get all conversations for the user
      const { data: conversationsData, error: convsError } = await supabase
        .from("triage_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (convsError) throw convsError;

      // Get message counts and last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: messages, error: msgError } = await supabase
            .from("triage_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (msgError) console.error("Error loading messages:", msgError);

          const { count } = await supabase
            .from("triage_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id);

          return {
            ...conv,
            message_count: count || 0,
            last_message: messages?.[0]?.content || "No messages yet",
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation history.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("triage_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      toast({
        title: "Conversation Deleted",
        description: "The conversation has been removed.",
      });

      loadConversations();
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    }
  };

  const handleResumeConversation = (conversationId: string) => {
    navigate(`/triage?conversation=${conversationId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      english: "English",
      urdu: "اردو",
      roman_urdu: "Roman Urdu",
    };
    return labels[lang] || lang;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton to="/triage" />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">RapidCare History</h1>
              <p className="text-xs text-muted-foreground">
                Previous consultations
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/triage")}
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            <Activity className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  No Consultation History
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start your first consultation with RapidCare
                </p>
                <Button
                  onClick={() => navigate("/triage")}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Start Consultation
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleResumeConversation(conversation.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">
                        {conversation.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {getLanguageLabel(conversation.language)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {conversation.last_message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(conversation.updated_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conversation.message_count} messages
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResumeConversation(conversation.id);
                      }}
                    >
                      Resume
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this conversation and all its
                            messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDeleteConversation(conversation.id)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageHistory;
