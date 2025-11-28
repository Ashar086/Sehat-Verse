import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AgentLog {
  id: string;
  agent_name: string;
  action: string;
  reasoning: string | null;
  confidence_score: number | null;
  input_data: any;
  output_data: any;
  created_at: string;
  session_id: string | null;
}

const AgentTrace = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('agent_logs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agent_logs' }, 
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const loadLogs = async () => {
    try {
      let query = supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter) {
        query = query.eq('agent_name', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error loading logs:', error);
      toast({
        title: "Error",
        description: "Failed to load agent traces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgentColor = (agentName: string) => {
    const colors: Record<string, string> = {
      TriageAgent: 'from-red-500 to-orange-500',
      EligibilityAgent: 'from-emerald-500 to-teal-500',
      FacilityFinderAgent: 'from-blue-500 to-cyan-500',
      FollowUpAgent: 'from-purple-500 to-pink-500',
    };
    return colors[agentName] || 'from-gray-500 to-gray-600';
  };

  const getConfidenceBadge = (score: number | null) => {
    if (!score) return null;
    const percentage = Math.round(score * 100);
    const variant = score >= 0.8 ? 'default' : score >= 0.5 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="ml-2">
        {percentage}% confidence
      </Badge>
    );
  };

  const agents = ['TriageAgent', 'EligibilityAgent', 'FacilityFinderAgent', 'FollowUpAgent'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Agent Trace Viewer</h1>
              <p className="text-xs text-muted-foreground">MCP Inter-Agent Communication Logs</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={filter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(null)}
          >
            All Agents
          </Button>
          {agents.map((agent) => (
            <Button
              key={agent}
              variant={filter === agent ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(agent)}
            >
              {agent.replace('Agent', '')}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-100" />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-200" />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <Card className="story-card p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No agent traces yet. Start using the app!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="story-card p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAgentColor(log.agent_name)} flex items-center justify-center flex-shrink-0`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold">{log.agent_name}</span>
                      <Badge className="agent-badge">{log.action}</Badge>
                      {getConfidenceBadge(log.confidence_score)}
                    </div>
                    
                    {log.reasoning && (
                      <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <p className="text-sm text-foreground/90">{log.reasoning}</p>
                        </div>
                      </div>
                    )}

                    {(log.input_data || log.output_data) && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Data
                        </summary>
                        <div className="mt-2 p-3 bg-muted/20 rounded text-xs font-mono overflow-x-auto">
                          {log.input_data && (
                            <div className="mb-2">
                              <span className="text-muted-foreground">Input:</span>
                              <pre className="mt-1">{JSON.stringify(log.input_data, null, 2)}</pre>
                            </div>
                          )}
                          {log.output_data && (
                            <div>
                              <span className="text-muted-foreground">Output:</span>
                              <pre className="mt-1">{JSON.stringify(log.output_data, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(log.created_at).toLocaleString('en-PK', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                      {log.session_id && ` • Session: ${log.session_id.slice(0, 8)}`}
                    </p>
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

export default AgentTrace;
