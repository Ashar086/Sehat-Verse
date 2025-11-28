import { useEffect, useState } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  FileText,
  Edit,
  X,
  Loader2
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  purpose: string;
  status: string;
  patient_name: string;
  patient_phone: string;
  notes: string | null;
  created_at: string;
  facility: {
    name: string;
    address: string;
    city: string;
    phone: string;
    type: string;
  };
}

const MyAppointments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  // LangChain snippet for MyAppointments
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on MyAppointments page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (my appointments)", err);
      }
    })();
  }, []);

  const [rescheduleData, setRescheduleData] = useState({
    appointmentDate: "",
    appointmentTime: "",
  });

  useEffect(() => {
    checkAuthAndLoadAppointments();
  }, []);

  const checkAuthAndLoadAppointments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await loadAppointments(session.user.id);
  };

  const loadAppointments = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          facility:facilities(name, address, city, phone, type)
        `)
        .eq('user_id', userId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      setAppointments(data as any || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setRescheduleLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("update-appointment", {
        body: {
          appointmentId: selectedAppointment.id,
          action: 'reschedule',
          appointmentDate: rescheduleData.appointmentDate,
          appointmentTime: rescheduleData.appointmentTime,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Rescheduled!",
        description: data.message,
      });

      setRescheduleOpen(false);
      setSelectedAppointment(null);
      setRescheduleData({ appointmentDate: "", appointmentTime: "" });
      
      // Reload appointments
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await loadAppointments(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    setCancelLoading(appointmentId);

    try {
      const { data, error } = await supabase.functions.invoke("update-appointment", {
        body: {
          appointmentId,
          action: 'cancel',
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Cancelled!",
        description: data.message,
      });

      // Reload appointments
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await loadAppointments(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelLoading(null);
    }
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleData({
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
    });
    setRescheduleOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'confirmed':
        return 'bg-health-normal/20 text-health-normal border-health-normal/50';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'completed':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-mesh)" }} />
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="relative bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton to="/dashboard" label="Back to Dashboard" />
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary animate-glow-pulse" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              My Appointments
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
        {appointments.length === 0 ? (
          <Card className="story-card p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Appointments</h2>
            <p className="text-muted-foreground mb-6">You haven't booked any appointments yet</p>
            <Button variant="neon" onClick={() => navigate('/eligibility')}>
              Book Your First Appointment
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="story-card overflow-hidden">
                <CardHeader className="bg-accent/30 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        {appointment.facility.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {appointment.facility.address}, {appointment.facility.city}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4" />
                        {appointment.facility.phone}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(appointment.status)} px-3 py-1`}>
                      {appointment.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-semibold">{formatDate(appointment.appointment_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-semibold">{formatTime(appointment.appointment_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Patient</p>
                        <p className="font-semibold">{appointment.patient_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-xl">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="font-semibold">{appointment.patient_phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-accent/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Purpose</p>
                        <p className="font-semibold">{appointment.purpose}</p>
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{appointment.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {appointment.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openRescheduleDialog(appointment)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={cancelLoading === appointment.id}
                          >
                            {cancelLoading === appointment.id ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</>
                            ) : (
                              <><X className="w-4 h-4 mr-2" />Cancel</>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this appointment? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancel(appointment.id)}>
                              Yes, Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReschedule} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date *</Label>
              <Input
                id="reschedule-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleData.appointmentDate}
                onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time *</Label>
              <Select
                value={rescheduleData.appointmentTime}
                onValueChange={(value) => setRescheduleData({ ...rescheduleData, appointmentTime: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">09:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="14:00">02:00 PM</SelectItem>
                  <SelectItem value="15:00">03:00 PM</SelectItem>
                  <SelectItem value="16:00">04:00 PM</SelectItem>
                  <SelectItem value="17:00">05:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setRescheduleOpen(false)}
                disabled={rescheduleLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="neon"
                className="flex-1"
                disabled={rescheduleLoading}
              >
                {rescheduleLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rescheduling...</>
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAppointments;