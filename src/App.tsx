import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import Index from "./pages/Index";
import Triage from "./pages/Triage";
import TriageHistory from "./pages/TriageHistory";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AgentTrace from "./pages/AgentTrace";
import Imaging from "./pages/Imaging";
import Eligibility from "./pages/Eligibility";
import AgentNetwork from "./pages/AgentNetwork";
import ProfileSettings from "./pages/ProfileSettings";
import HealthRecords from "./pages/HealthRecords";
import OtherAgents from "./pages/OtherAgents";
import FacilityFinder from "./pages/FacilityFinder";
import DoctorCompanion from "./pages/DoctorCompanion";
import FollowUpAgent from "./pages/FollowUpAgent";
import Surveillance from "./pages/Surveillance";
import MyAppointments from "./pages/MyAppointments";
import KnowledgeAgent from "./pages/KnowledgeAgent";
import CarePilotBooking from "./pages/CarePilotBooking";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <InstallPrompt />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/triage" element={<Triage />} />
          <Route path="/triage-history" element={<TriageHistory />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trace" element={<AgentTrace />} />
          <Route path="/imaging" element={<Imaging />} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/network" element={<AgentNetwork />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/health-records" element={<HealthRecords />} />
          <Route path="/other-agents" element={<OtherAgents />} />
          <Route path="/facility-finder" element={<FacilityFinder />} />
          <Route path="/doctor-companion" element={<DoctorCompanion />} />
          <Route path="/followup-agent" element={<FollowUpAgent />} />
          <Route path="/surveillance" element={<Surveillance />} />
          <Route path="/my-appointments" element={<MyAppointments />} />
          <Route path="/knowledge-agent" element={<KnowledgeAgent />} />
          <Route path="/carepilot-booking" element={<CarePilotBooking />} />
          <Route path="/install" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
