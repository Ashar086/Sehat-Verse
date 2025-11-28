import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, CheckCircle2 } from "lucide-react";

interface FlippableAgentCardProps {
  icon: LucideIcon;
  name: string;
  nameUr?: string;
  desc: string;
  descUr?: string;
  color: string;
  language?: "en" | "ur";
  onClick?: () => void;
}

export const FlippableAgentCard = ({
  icon: Icon,
  name,
  nameUr,
  desc,
  descUr,
  color,
  language = "en",
  onClick,
}: FlippableAgentCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Mock usage stats - in production, fetch from Supabase
  const usageStats = {
    totalSessions: Math.floor(Math.random() * 500) + 100,
    thisWeek: Math.floor(Math.random() * 50) + 10,
    successRate: Math.floor(Math.random() * 20) + 80,
    avgResponseTime: `${(Math.random() * 2 + 1).toFixed(1)}s`,
  };

  const recentActivity = [
    { time: "2 min ago", action: "Analyzed patient case" },
    { time: "15 min ago", action: "Processed request" },
    { time: "1 hour ago", action: "Generated report" },
  ];

  return (
    <div
      className="relative w-full h-72 perspective-1000 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={onClick}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front Side */}
        <div className="absolute inset-0 backface-hidden">
          <div className="story-card h-full p-6 flex flex-col items-center justify-center text-center group">
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-500 group-hover:shadow-[var(--shadow-neon-cyan)]`}
            >
              <Icon className="w-10 h-10 text-white animate-float" />
            </div>
            <h3 className="text-xl font-bold mb-2 gradient-text">
              {language === "ur" && nameUr ? nameUr : name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "ur" && descUr ? descUr : desc}
            </p>
            <Badge className="mt-4 agent-badge">Active</Badge>
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="story-card h-full p-6 flex flex-col bg-gradient-to-br from-card/60 via-card/80 to-card/60">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold gradient-text">Usage Stats</h4>
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {usageStats.totalSessions}
                </div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-accent/20">
                <div className="text-2xl font-bold text-accent">
                  {usageStats.thisWeek}
                </div>
                <div className="text-xs text-muted-foreground">This Week</div>
              </div>
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-secondary/20">
                <div className="text-2xl font-bold text-secondary flex items-center gap-1">
                  {usageStats.successRate}%
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-primary/20">
                <div className="text-2xl font-bold text-primary-glow flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {usageStats.avgResponseTime}
                </div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="flex-1 min-h-0">
              <h5 className="text-sm font-semibold mb-2 text-muted-foreground">
                Recent Activity
              </h5>
              <div className="space-y-2 overflow-y-auto max-h-24">
                {recentActivity.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs bg-background/30 backdrop-blur-sm rounded-lg p-2 border border-border/30 animate-fade-in"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground truncate">{activity.action}</div>
                      <div className="text-muted-foreground">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
