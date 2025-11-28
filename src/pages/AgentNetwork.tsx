import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as LangChain from "langchain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Activity,
  MapPin,
  MessageSquare,
  Brain,
  Stethoscope,
  Hospital,
  Zap,
  Network,
  CalendarCheck,
  Pill,
  Shield,
  GitBranch,
  Circle,
  Star,
  Grid,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

interface Agent {
  id: string;
  name: string;
  icon: any;
  color: string;
  x: number;
  y: number;
  connections: string[];
  status: "active" | "idle" | "processing";
  route?: string;
  isDragging?: boolean;
  description?: string;
}

interface DragState {
  isDragging: boolean;
  agentId: string | null;
  offsetX: number;
  offsetY: number;
}

interface DataFlow {
  from: string;
  to: string;
  data: string;
  progress: number;
}

type LayoutType = "custom" | "circular" | "hierarchical" | "force-directed" | "star";

const AgentNetwork = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("custom");
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    agentId: null,
    offsetX: 0,
    offsetY: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAgents();
    loadRecentLogs();
    const interval = setInterval(simulateDataFlow, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on AgentNetwork", lc?.version || "no-version");
        if (lc?.Flow) {
          const flow = lc.Flow.create?.({ name: "agent-network-flow" });
          console.log("LangChain Flow:", flow);
        } else if (lc?.LLMChain) {
          const chain = new lc.LLMChain({ llm: {} });
          console.log("LLMChain created", chain);
        }
      } catch (err) {
        console.warn("LangChain init error (AgentNetwork)", err);
      }
    })();
  }, []);

  // Load saved layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("agentNetworkLayout");
    if (savedLayout) {
      setCurrentLayout(savedLayout as LayoutType);
    }
  }, []);

  const getBaseAgentData = (): Omit<Agent, "x" | "y">[] => [
    {
      id: "rapidcare",
      name: "RapidCare",
      icon: Activity,
      color: "from-red-500 to-orange-500",
      connections: ["facility", "imaging", "carepilot"],
      status: "active",
      route: "/triage",
      description: "AI-powered triage system that assesses patient symptoms and urgency levels"
    },
    {
      id: "facility",
      name: "Facility Finder",
      icon: MapPin,
      color: "from-blue-500 to-cyan-500",
      connections: ["rapidcare", "carepilot"],
      status: "active",
      route: "/facility-finder",
      description: "Locates nearby healthcare facilities based on services, availability, and distance"
    },
    {
      id: "carepilot",
      name: "CarePilot Booking",
      icon: CalendarCheck,
      color: "from-indigo-500 to-blue-500",
      connections: ["rapidcare", "facility", "followup"],
      status: "active",
      route: "/carepilot-booking",
      description: "Automated appointment scheduling and healthcare facility booking management system"
    },
    {
      id: "followup",
      name: "Follow-Up Agent",
      icon: MessageSquare,
      color: "from-purple-500 to-pink-500",
      connections: ["carepilot", "doctor", "surveillance", "other"],
      status: "processing",
      route: "/followup-agent",
      description: "Manages medication reminders and post-treatment follow-up care coordination"
    },
    {
      id: "imaging",
      name: "Imaging Agent",
      icon: Brain,
      color: "from-violet-500 to-purple-500",
      connections: ["rapidcare", "doctor", "medicine"],
      status: "active",
      route: "/imaging",
      description: "AI-powered medical image analysis for X-rays, CT scans, and diagnostic imaging"
    },
    {
      id: "medicine",
      name: "Medicine Knowledge",
      icon: Pill,
      color: "from-amber-500 to-orange-500",
      connections: ["imaging", "doctor", "surveillance"],
      status: "idle",
      route: "/knowledge-agent",
      description: "Comprehensive drug database with pricing, interactions, and treatment protocols"
    },
    {
      id: "surveillance",
      name: "Surveillance Agent",
      icon: Shield,
      color: "from-rose-500 to-red-500",
      connections: ["followup", "medicine"],
      status: "active",
      route: "/surveillance",
      description: "Disease outbreak monitoring and public health surveillance analytics platform"
    },
    {
      id: "doctor",
      name: "Doctor Companion",
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      connections: ["imaging", "followup", "medicine", "other"],
      status: "processing",
      route: "/doctor-companion",
      description: "Medical reference assistant providing clinical guidelines and diagnostic support"
    },
    {
      id: "other",
      name: "Other Agents",
      icon: Brain,
      color: "from-indigo-500 to-purple-500",
      connections: ["doctor", "followup"],
      status: "idle",
      route: "/other-agents",
      description: "Collection of health calculators including BMI, calorie tracker, and vitals monitor"
    },
  ];

  const calculateCircularLayout = (baseAgents: Omit<Agent, "x" | "y">[]): Agent[] => {
    const centerX = 500;
    const centerY = 300;
    const radius = 200;
    
    return baseAgents.map((agent, index) => {
      const angle = (index / baseAgents.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...agent,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  };

  const calculateHierarchicalLayout = (baseAgents: Omit<Agent, "x" | "y">[]): Agent[] => {
    const width = 900;
    const levels = [
      ["rapidcare"],
      ["facility", "imaging"],
      ["carepilot", "medicine", "doctor", "other"],
      ["followup", "surveillance"]
    ];
    
    const agentMap = new Map(baseAgents.map(a => [a.id, a]));
    const positioned: Agent[] = [];
    
    levels.forEach((level, levelIndex) => {
      const y = 100 + levelIndex * 150;
      const spacing = width / (level.length + 1);
      
      level.forEach((id, index) => {
        const agent = agentMap.get(id);
        if (agent) {
          positioned.push({
            ...agent,
            x: spacing * (index + 1),
            y
          });
        }
      });
    });
    
    return positioned;
  };

  const calculateForceDirectedLayout = (baseAgents: Omit<Agent, "x" | "y">[]): Agent[] => {
    // Simple force-directed layout simulation
    const positioned = baseAgents.map((agent, index) => ({
      ...agent,
      x: 300 + Math.random() * 400,
      y: 150 + Math.random() * 300,
    }));

    // Run simple iterations to space out connected nodes
    for (let iter = 0; iter < 50; iter++) {
      positioned.forEach((agent, i) => {
        let fx = 0, fy = 0;
        
        // Repulsion from all other nodes
        positioned.forEach((other, j) => {
          if (i !== j) {
            const dx = agent.x - other.x;
            const dy = agent.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 1000 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });
        
        // Attraction to connected nodes
        agent.connections.forEach(connId => {
          const other = positioned.find(a => a.id === connId);
          if (other) {
            const dx = other.x - agent.x;
            const dy = other.y - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fx += dx * 0.01;
            fy += dy * 0.01;
          }
        });
        
        agent.x += fx * 0.1;
        agent.y += fy * 0.1;
        
        // Keep within bounds
        agent.x = Math.max(100, Math.min(900, agent.x));
        agent.y = Math.max(100, Math.min(500, agent.y));
      });
    }
    
    return positioned;
  };

  const calculateStarLayout = (baseAgents: Omit<Agent, "x" | "y">[]): Agent[] => {
    const centerX = 500;
    const centerY = 300;
    
    // Place "doctor" agent in center
    const doctorIndex = baseAgents.findIndex(a => a.id === "doctor");
    const doctor = baseAgents[doctorIndex];
    const others = baseAgents.filter((_, i) => i !== doctorIndex);
    
    const positioned: Agent[] = [{
      ...doctor,
      x: centerX,
      y: centerY
    }];
    
    // Place others in a circle around center
    const radius = 220;
    others.forEach((agent, index) => {
      const angle = (index / others.length) * 2 * Math.PI - Math.PI / 2;
      positioned.push({
        ...agent,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
    
    return positioned;
  };

  const applyLayout = (layout: LayoutType) => {
    const baseAgents = getBaseAgentData();
    let positioned: Agent[];
    
    if (layout === "custom") {
      // Load from localStorage
      const savedPositions = localStorage.getItem("agentNetworkPositions");
      if (savedPositions) {
        const positions = JSON.parse(savedPositions);
        positioned = baseAgents.map(agent => ({
          ...agent,
          x: positions[agent.id]?.x || 500,
          y: positions[agent.id]?.y || 300,
        }));
      } else {
        // Default to circular if no saved positions
        positioned = calculateCircularLayout(baseAgents);
      }
    } else if (layout === "circular") {
      positioned = calculateCircularLayout(baseAgents);
    } else if (layout === "hierarchical") {
      positioned = calculateHierarchicalLayout(baseAgents);
    } else if (layout === "force-directed") {
      positioned = calculateForceDirectedLayout(baseAgents);
    } else if (layout === "star") {
      positioned = calculateStarLayout(baseAgents);
    } else {
      positioned = calculateCircularLayout(baseAgents);
    }
    
    setAgents(positioned);
    setCurrentLayout(layout);
    localStorage.setItem("agentNetworkLayout", layout);
  };

  const initializeAgents = () => {
    const savedLayout = localStorage.getItem("agentNetworkLayout") as LayoutType;
    applyLayout(savedLayout || "circular");
  };

  const loadRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const simulateDataFlow = () => {
    setAgents((prev) =>
      prev.map((agent) => ({
        ...agent,
        status: ["active", "idle", "processing"][
          Math.floor(Math.random() * 3)
        ] as any,
      }))
    );

    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    if (randomAgent?.connections.length) {
      const randomConnection =
        randomAgent.connections[
          Math.floor(Math.random() * randomAgent.connections.length)
        ];

      const newFlow: DataFlow = {
        from: randomAgent.id,
        to: randomConnection,
        data: [
          "Patient data",
          "Diagnosis",
          "Lab results",
          "Prescription",
          "Alert",
        ][Math.floor(Math.random() * 5)],
        progress: 0,
      };

      setDataFlows((prev) => [...prev, newFlow]);

      // Animate data flow
      const animationInterval = setInterval(() => {
        setDataFlows((prev) =>
          prev.map((flow) =>
            flow === newFlow
              ? { ...flow, progress: Math.min(flow.progress + 10, 100) }
              : flow
          )
        );
      }, 50);

      setTimeout(() => {
        clearInterval(animationInterval);
        setDataFlows((prev) => prev.filter((flow) => flow !== newFlow));
      }, 1500);
    }
  };

  const getAgentPosition = (agentId: string) => {
    return agents.find((a) => a.id === agentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary";
      case "processing":
        return "bg-secondary";
      case "idle":
        return "bg-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const handleMouseDown = (e: React.MouseEvent, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragState({
      isDragging: true,
      agentId,
      offsetX: e.clientX - rect.left - agent.x,
      offsetY: e.clientY - rect.top - agent.y
    });

    setAgents(prev => prev.map(a => 
      a.id === agentId ? { ...a, isDragging: true } : a
    ));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.agentId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(60, Math.min(rect.width - 60, e.clientX - rect.left - dragState.offsetX));
    const y = Math.max(60, Math.min(rect.height - 60, e.clientY - rect.top - dragState.offsetY));

    setAgents(prev => prev.map(agent =>
      agent.id === dragState.agentId ? { ...agent, x, y } : agent
    ));
  };

  const handleMouseUp = () => {
    if (dragState.agentId) {
      setAgents(prev => prev.map(a =>
        a.id === dragState.agentId ? { ...a, isDragging: false } : a
      ));
      
      // Save positions to localStorage when user drags
      const positions: Record<string, { x: number; y: number }> = {};
      agents.forEach(agent => {
        positions[agent.id] = { x: agent.x, y: agent.y };
      });
      localStorage.setItem("agentNetworkPositions", JSON.stringify(positions));
      setCurrentLayout("custom");
      localStorage.setItem("agentNetworkLayout", "custom");
    }
    setDragState({
      isDragging: false,
      agentId: null,
      offsetX: 0,
      offsetY: 0
    });
  };

  const handleAgentClick = (agent: Agent) => {
    if (!dragState.isDragging && agent.route) {
      navigate(agent.route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Agent Network</h1>
              <p className="text-xs text-muted-foreground">
                Real-time Collaboration Visualization
              </p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Network Visualization */}
        <Card className="story-card p-8 mb-6">
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold gradient-text mb-2">
                  Agent Collaboration Network
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Watch agents communicate and share data in real-time. Each node represents a specialized health agent working autonomously while coordinating with others to provide comprehensive care.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">Active</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs font-medium text-secondary-foreground">Processing</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Idle</span>
                </div>
              </div>
            </div>

            {/* Layout Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Layout:</span>
              <Button
                variant={currentLayout === "circular" ? "default" : "outline"}
                size="sm"
                onClick={() => applyLayout("circular")}
                className="gap-2"
              >
                <Circle className="w-4 h-4" />
                Circular
              </Button>
              <Button
                variant={currentLayout === "hierarchical" ? "default" : "outline"}
                size="sm"
                onClick={() => applyLayout("hierarchical")}
                className="gap-2"
              >
                <GitBranch className="w-4 h-4" />
                Hierarchical
              </Button>
              <Button
                variant={currentLayout === "force-directed" ? "default" : "outline"}
                size="sm"
                onClick={() => applyLayout("force-directed")}
                className="gap-2"
              >
                <Network className="w-4 h-4" />
                Force-Directed
              </Button>
              <Button
                variant={currentLayout === "star" ? "default" : "outline"}
                size="sm"
                onClick={() => applyLayout("star")}
                className="gap-2"
              >
                <Star className="w-4 h-4" />
                Star
              </Button>
              {currentLayout === "custom" && (
                <Badge variant="secondary" className="gap-1">
                  <Grid className="w-3 h-3" />
                  Custom Layout
                </Badge>
              )}
            </div>
          </div>

          <div 
            ref={containerRef}
            className="relative w-full h-[600px] bg-background/50 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Network Status Info */}
            <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-xl p-4 border border-border/30 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold">Live Network Activity</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {agents.filter(a => a.status === 'active').length} agents actively processing, 
                {agents.filter(a => a.status === 'processing').length} in queue. 
                Click any agent to see connections and capabilities.
              </p>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                </filter>
              </defs>

              {/* Draw connections with better styling */}
              {agents.map((agent) =>
                agent.connections.map((connId) => {
                  const target = getAgentPosition(connId);
                  if (!target) return null;
                  
                  const isActive = agent.status === 'active' || target.status === 'active';
                  
                  return (
                    <g key={`${agent.id}-${connId}`}>
                      <line
                        x1={agent.x}
                        y1={agent.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        className={isActive ? "animate-pulse" : ""}
                        opacity={isActive ? "0.6" : "0.3"}
                        strokeDasharray={isActive ? "5,5" : "none"}
                      />
                    </g>
                  );
                })
              )}

              {/* Animated data flows with better visuals */}
              {dataFlows.map((flow, idx) => {
                const from = getAgentPosition(flow.from);
                const to = getAgentPosition(flow.to);
                if (!from || !to) return null;

                const x = from.x + ((to.x - from.x) * flow.progress) / 100;
                const y = from.y + ((to.y - from.y) * flow.progress) / 100;

                return (
                  <g key={idx}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="hsl(var(--primary))"
                      filter="url(#glow)"
                      className="animate-pulse"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="white"
                      opacity="0.8"
                    />
                    <text
                      x={x}
                      y={y - 18}
                      textAnchor="middle"
                      fill="hsl(var(--foreground))"
                      fontSize="11"
                      fontWeight="600"
                      filter="url(#shadow)"
                    >
                      {flow.data}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Agent nodes with drag and click interactions */}
            {agents.map((agent) => {
              const Icon = agent.icon;
              const isSelected = selectedAgent?.id === agent.id;
              const isDragging = agent.isDragging;
              
              return (
                <div
                  key={agent.id}
                  className={`absolute transition-all duration-200 ${
                    isDragging ? 'z-50 scale-110 cursor-grabbing' : 'cursor-grab hover:scale-110 z-10'
                  } ${isSelected ? 'z-20' : ''}`}
                  style={{
                    left: `${agent.x}px`,
                    top: `${agent.y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, agent.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging) {
                      setSelectedAgent(agent);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleAgentClick(agent);
                  }}
                >
                  <div
                    className={`group relative w-24 h-24 rounded-2xl bg-gradient-to-br ${agent.color} 
                      flex items-center justify-center
                      shadow-lg hover:shadow-2xl transition-all duration-300
                      ${isSelected ? 'ring-4 ring-primary ring-offset-4 ring-offset-background' : ''}
                      ${isDragging ? 'shadow-2xl' : ''}`}
                  >
                    <Icon className="w-12 h-12 text-white drop-shadow-lg" />
                    
                    {/* Status indicator */}
                    <div
                      className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${getStatusColor(
                        agent.status
                      )} border-2 border-background ${
                        agent.status === 'active' ? 'animate-pulse' : ''
                      }`}
                    />
                    
                    {/* Ripple effect on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                  </div>
                  
                  {/* Agent name and badge */}
                  <div className="mt-3 text-center pointer-events-none">
                    <p className="text-xs font-bold text-foreground whitespace-nowrap drop-shadow-sm px-2 py-1 bg-background/80 backdrop-blur-sm rounded-lg">
                      {agent.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] mt-1 border-primary/30 bg-background/90"
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    <div className="bg-popover text-popover-foreground text-xs px-3 py-2 rounded-lg shadow-lg border border-border">
                      Click for details • Double-click to open • Drag to move
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Agent Details */}
        {selectedAgent && (
          <Card className="story-card p-6 mb-6 animate-fade-in border-2 border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedAgent.color} flex items-center justify-center shadow-lg`}
                >
                  <selectedAgent.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold gradient-text">{selectedAgent.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${
                      selectedAgent.status === 'active' ? 'bg-primary' : 
                      selectedAgent.status === 'processing' ? 'bg-secondary' : 
                      'bg-muted'
                    } text-white`}>
                      {selectedAgent.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Real-time status
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgent(null)}
              >
                Close
              </Button>
            </div>

            {/* Agent Description */}
            {selectedAgent.description && (
              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedAgent.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold">Connected Agents</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.connections.map((connId) => {
                    const agent = agents.find((a) => a.id === connId);
                    if (!agent) return null;
                    const Icon = agent.icon;
                    return (
                      <button
                        key={connId}
                        onClick={() => setSelectedAgent(agent)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br ${agent.color} text-white text-xs font-medium hover:scale-105 transition-transform cursor-pointer`}
                      >
                        <Icon className="w-3 h-3" />
                        {agent.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold">Capabilities</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">
                      Processes data from {selectedAgent.connections.length} connected agents
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">
                      Real-time collaboration and data sharing
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <p className="text-muted-foreground">
                      Autonomous decision-making and handoffs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Agent Button */}
            {selectedAgent.route && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <Button
                  onClick={() => navigate(selectedAgent.route!)}
                  className="w-full"
                  size="lg"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Open {selectedAgent.name}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="story-card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Agent Activity
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/30 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">
                        {log.agent_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.action}</p>
                    {log.confidence_score && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Confidence: {(log.confidence_score * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgentNetwork;
