import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  LogOut,
  CreditCard,
  Activity,
  MapPin,
  Brain,
  User as UserIcon,
  FileText,
  Stethoscope,
  MessageSquare,
  Network,
  Settings,
  Shield,
  Calendar,
  Pill,
  CalendarCheck,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { FlippableAgentCard } from "@/components/FlippableAgentCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import sehatverseLogo from "@/assets/sehatverse-logo.png";

interface Activity {
  id: string;
  type: 'appointment' | 'record' | 'agent';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sehatCard, setSehatCard] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await loadUserData(session.user.id);
    setLoading(false);
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      setProfile(profileData);

      // Load Sehat Card if exists
      const { data: cardData } = await supabase
        .from("sehat_cards")
        .select("*")
        .eq("user_id", userId)
        .single();

      setSehatCard(cardData);

      // Load recent activities
      await loadRecentActivities(userId);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadRecentActivities = async (userId: string) => {
    try {
      const activities: Activity[] = [];

      // Load appointments from localStorage
      const storedAppointments = localStorage.getItem('carepilot_appointments');
      if (storedAppointments) {
        const appointments = JSON.parse(storedAppointments);
        appointments.slice(0, 3).forEach((apt: any) => {
          activities.push({
            id: apt.id,
            type: 'appointment',
            title: 'Appointment Booked',
            description: `Scheduled for ${new Date(apt.appointment_date).toLocaleDateString()}`,
            timestamp: apt.created_at,
            icon: Calendar,
            color: 'from-blue-500 to-cyan-500'
          });
        });
      }

      // Load health records from Supabase
      const { data: records } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (records) {
        records.forEach((record) => {
          activities.push({
            id: record.id,
            type: 'record',
            title: 'Health Record Added',
            description: record.title,
            timestamp: record.created_at,
            icon: FileText,
            color: 'from-purple-500 to-pink-500'
          });
        });
      }

      // Load agent interactions from localStorage
      const agentVisits = localStorage.getItem('agent_visits');
      if (agentVisits) {
        const visits = JSON.parse(agentVisits);
        Object.entries(visits).slice(0, 3).forEach(([agentName, timestamp]: [string, any]) => {
          activities.push({
            id: `agent-${agentName}`,
            type: 'agent',
            title: 'Agent Interaction',
            description: `Used ${agentName}`,
            timestamp: timestamp,
            icon: Activity,
            color: 'from-emerald-500 to-teal-500'
          });
        });
      }

      // Sort by timestamp (most recent first) and take top 4
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 4);

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error("Error loading recent activities:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({
      title: "Signed out",
      description: "You have been successfully logged out.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-100" />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={sehatverseLogo} 
              alt="SehatVerse Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold">SehatVerse</h1>
              <p className="text-xs text-muted-foreground">Health Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="relative"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <ThemeSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Card */}
        <Card className="story-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                Welcome, {profile?.full_name || user?.email}!
              </h2>
              <p className="text-muted-foreground">
                Your personal health command center
              </p>
            </div>
          </div>
        </Card>

        {/* Sehat Card Status */}
        {sehatCard ? (
          <Card className="story-card p-6 mb-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className="agent-badge mb-2">
                  <CreditCard className="w-3 h-3" />
                  Sehat Card Active
                </Badge>
                <h3 className="text-2xl font-bold">
                  {sehatCard.remaining_credits?.toLocaleString() || 0} PKR
                </h3>
                <p className="text-sm text-muted-foreground">Remaining Balance</p>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
                {sehatCard.eligibility_status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">CNIC</p>
                <p className="font-medium">{sehatCard.cnic}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{sehatCard.city}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="story-card p-6 mb-8 border-dashed">
            <div className="text-center py-8">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No Sehat Card Found</h3>
              <p className="text-muted-foreground mb-4">
                Register for a Sehat Card to access healthcare benefits
              </p>
              <Button
                onClick={() => navigate("/eligibility")}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                Check Eligibility
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Health Records Card */}
          <Card 
            className="story-card p-6 cursor-pointer hover:scale-[1.02] transition-all group"
            onClick={() => navigate("/health-records")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:animate-pulse">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Health Records</h3>
                  <p className="text-sm text-muted-foreground">
                    View medical history & documents
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* My Appointments Card */}
          <Card 
            className="story-card p-6 cursor-pointer hover:scale-[1.02] transition-all group"
            onClick={() => navigate("/my-appointments")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:animate-pulse">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">My Appointments</h3>
                  <p className="text-sm text-muted-foreground">
                    View & manage appointments
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Agent Network Card */}
          <Card 
            className="story-card p-6 cursor-pointer hover:scale-[1.02] transition-all group"
            onClick={() => navigate("/network")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:animate-pulse">
                  <Network className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Agent Network</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time collaboration view
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* All Agents Grid */}
        <h3 className="text-xl font-bold mb-4">All Health Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <FlippableAgentCard
            icon={Activity}
            name="RapidCare"
            desc="For fast emergency triage in critical care."
            color="from-red-500 to-orange-500"
            onClick={() => navigate("/triage")}
          />
          
          <FlippableAgentCard
            icon={MapPin}
            name="Facility Finder"
            desc="Smart hospital routing"
            color="from-blue-500 to-cyan-500"
            onClick={() => navigate("/facility-finder")}
          />
          
          <FlippableAgentCard
            icon={MessageSquare}
            name="Follow-Up Agent"
            desc="Medication reminders"
            color="from-purple-500 to-pink-500"
            onClick={() => navigate("/followup-agent")}
          />
          
          <FlippableAgentCard
            icon={Brain}
            name="Imaging Agent"
            desc="X-ray AI analysis"
            color="from-violet-500 to-purple-500"
            onClick={() => navigate("/imaging")}
          />
          
          <FlippableAgentCard
            icon={Pill}
            name="Medicine Knowledge"
            desc="Price search & bill estimates"
            color="from-amber-500 to-orange-500"
            onClick={() => navigate("/knowledge-agent")}
          />
          
          <FlippableAgentCard
            icon={Shield}
            name="Surveillance Agent"
            desc="Disease outbreak monitoring"
            color="from-rose-500 to-red-500"
            onClick={() => navigate("/surveillance")}
          />
          
          <FlippableAgentCard
            icon={Heart}
            name="Doctor Companion"
            desc="AI case prep"
            color="from-pink-500 to-rose-500"
            onClick={() => navigate("/doctor-companion")}
          />
          
          <FlippableAgentCard
            icon={CalendarCheck}
            name="CarePilot Booking"
            desc="Book verified doctors"
            color="from-indigo-500 to-blue-500"
            onClick={() => navigate("/carepilot-booking")}
          />
          
          <FlippableAgentCard
            icon={Brain}
            name="Other Agents"
            desc="Health calculators & tools"
            color="from-indigo-500 to-purple-500"
            onClick={() => navigate("/other-agents")}
          />
        </div>

        {/* Recent Activity */}
        <Card className="story-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Recent Activity</h3>
          </div>
          
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div 
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activity.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{activity.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity to display</p>
              <p className="text-sm mt-2">Start using SehatVerse to see your health journey</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
