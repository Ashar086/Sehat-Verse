import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackAgentVisit } from "@/utils/trackAgentVisit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  DollarSign,
  FileCheck,
  Stethoscope,
  Upload,
  User,
  CheckCircle2,
  MessageSquare,
  Send,
  CalendarClock,
  X,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Doctor {
  id: string;
  doctor_name: string;
  specialization: string;
  consultation_fee: number;
  available_timing: string;
  degree_url: string;
  is_verified: boolean;
  experience_years?: number;
  rating?: number;
  total_reviews?: number;
  qualifications?: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

const specializations = [
  { name: "Eye Specialist", icon: "👁️", color: "from-blue-500 to-cyan-500" },
  { name: "Teeth Specialist", icon: "🦷", color: "from-teal-500 to-emerald-500" },
  { name: "Child Specialist", icon: "👶", color: "from-pink-500 to-rose-500" },
  { name: "Skin Specialist", icon: "✨", color: "from-purple-500 to-pink-500" },
  { name: "Cardiologist", icon: "❤️", color: "from-red-500 to-rose-500" },
  { name: "Neurologist", icon: "🧠", color: "from-violet-500 to-purple-500" },
  { name: "Orthopedic", icon: "🦴", color: "from-orange-500 to-amber-500" },
  { name: "General Physician", icon: "🩺", color: "from-emerald-500 to-teal-500" },
];

const CarePilotBooking = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAppointments, setShowAppointments] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState("");
  const [newRescheduleTime, setNewRescheduleTime] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load appointments from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('carepilot_appointments');
    if (stored) {
      try {
        setMyAppointments(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading appointments:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedSpecialization) {
      loadDoctors();
    }
  }, [selectedSpecialization]);

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    setUser(session?.user || null);
    setLoading(false);
  };

  useEffect(() => {
    checkUser();
    // Track visit to CarePilot
    trackAgentVisit('CarePilot Booking');
  }, []);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-doctors', {
        body: { specialization: selectedSpecialization }
      });

      if (error) throw error;
      setDoctors(data?.doctors || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
      toast({
        title: "Error",
        description: "Failed to load doctors. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingModalOpen(true);
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile || !user) return null;

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('appointment_receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('appointment_receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading receipt:", error);
      return null;
    }
  };

  const loadMyAppointments = async () => {
    // Load from localStorage
    const stored = localStorage.getItem('carepilot_appointments');
    if (stored) {
      try {
        setMyAppointments(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading appointments:", e);
      }
    }
  };

  const saveAppointmentsToStorage = (appointments: Appointment[]) => {
    localStorage.setItem('carepilot_appointments', JSON.stringify(appointments));
    setMyAppointments(appointments);
  };

  const loadChat = async (appointmentId: string) => {
    // Load messages from localStorage
    const stored = localStorage.getItem(`chat_${appointmentId}`);
    if (stored) {
      try {
        setChatMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading chat:", e);
      }
    } else {
      setChatMessages([]);
    }
    setConversationId(appointmentId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      role: 'user',
      created_at: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, message];
    setChatMessages(updatedMessages);
    
    // Save to localStorage
    localStorage.setItem(`chat_${conversationId}`, JSON.stringify(updatedMessages));
    
    setNewMessage("");

    // Simulate doctor response after 1 second
    setTimeout(() => {
      const doctorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Thank you for your message. I'll review it and get back to you shortly.",
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      
      const messagesWithResponse = [...updatedMessages, doctorMessage];
      setChatMessages(messagesWithResponse);
      localStorage.setItem(`chat_${conversationId}`, JSON.stringify(messagesWithResponse));
    }, 1000);
  };

  const handleReschedule = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setNewRescheduleDate(appointment.appointment_date);
    setNewRescheduleTime(appointment.appointment_time);
    setRescheduleModalOpen(true);
  };

  const confirmReschedule = () => {
    if (!appointmentToReschedule || !newRescheduleDate || !newRescheduleTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time.",
        variant: "destructive",
      });
      return;
    }

    const updatedAppointments = myAppointments.map(apt => 
      apt.id === appointmentToReschedule.id 
        ? { ...apt, appointment_date: newRescheduleDate, appointment_time: newRescheduleTime }
        : apt
    );

    saveAppointmentsToStorage(updatedAppointments);
    
    toast({
      title: "Appointment Rescheduled",
      description: `Your appointment has been rescheduled to ${new Date(newRescheduleDate).toLocaleDateString()} at ${newRescheduleTime}`,
    });

    setRescheduleModalOpen(false);
    setAppointmentToReschedule(null);
    setNewRescheduleDate("");
    setNewRescheduleTime("");
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (!appointmentToCancel) return;

    const updatedAppointments = myAppointments.filter(apt => apt.id !== appointmentToCancel.id);
    saveAppointmentsToStorage(updatedAppointments);

    // Also remove associated chat messages
    localStorage.removeItem(`chat_${appointmentToCancel.id}`);

    toast({
      title: "Appointment Cancelled",
      description: "Your appointment has been cancelled successfully.",
    });

    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create mock appointment
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };

      // Add to appointments list and save to localStorage
      const updatedAppointments = [...myAppointments, newAppointment];
      saveAppointmentsToStorage(updatedAppointments);

      toast({
        title: "Success!",
        description: "Your appointment has been booked successfully.",
      });

      setBookingModalOpen(false);
      setSelectedDoctor(null);
      setSelectedDate("");
      setSelectedTime("");
      setReceiptFile(null);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
            <BackButton to="/dashboard" />
            <div>
              <h1 className="text-xl font-bold">CarePilot Booking</h1>
              <p className="text-xs text-muted-foreground">Find & book verified doctors</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowAppointments(!showAppointments);
              if (!showAppointments) loadMyAppointments();
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            My Appointments
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* My Appointments Section */}
        {showAppointments && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
                <CardDescription>View and chat with your booked doctors</CardDescription>
              </CardHeader>
              <CardContent>
                {myAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No appointments yet</p>
                ) : (
                  <div className="space-y-4">
                    {myAppointments.map((appointment) => {
                      const doctor = doctors.find(d => d.id === appointment.doctor_id);
                      return (
                        <Card key={appointment.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row">
                              {/* Doctor Info Section */}
                              <div className="flex-1 p-6">
                                <div className="flex items-start gap-4">
                                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
                                    <User className="w-8 h-8 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-bold text-lg">
                                        {doctor ? doctor.doctor_name : `Doctor #${appointment.doctor_id}`}
                                      </h3>
                                      {doctor?.is_verified && (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {doctor && (
                                      <>
                                        <p className="text-sm text-primary font-medium mb-2">
                                          {doctor.specialization}
                                        </p>
                                        
                                        {/* Rating */}
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                              <span key={i} className={`text-lg ${i < Math.floor(doctor.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}>
                                                ★
                                              </span>
                                            ))}
                                          </div>
                                          <span className="text-sm font-semibold">{doctor.rating || 4.5}</span>
                                          <span className="text-sm text-muted-foreground">
                                            ({doctor.total_reviews || 127} reviews)
                                          </span>
                                        </div>

                                        {/* Experience & Qualifications */}
                                        <div className="space-y-1 mb-3">
                                          <div className="flex items-center gap-2 text-sm">
                                            <FileCheck className="w-4 h-4 text-primary" />
                                            <span>{doctor.experience_years} years experience</span>
                                          </div>
                                          {doctor.qualifications && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Stethoscope className="w-4 h-4" />
                                              <span>{doctor.qualifications}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Consultation Fee */}
                                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                          <DollarSign className="w-4 h-4" />
                                          <span>Rs. {doctor.consultation_fee} consultation fee</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Appointment Details Section */}
                              <div className="border-t md:border-t-0 md:border-l border-border/50 bg-muted/30 p-6 md:w-80">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Appointment Details</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span className="font-medium">
                                          {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span className="font-medium">{appointment.appointment_time}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <Badge 
                                      variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                                      className="mb-3"
                                    >
                                      {appointment.status}
                                    </Badge>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => handleReschedule(appointment)}
                                    >
                                      <CalendarClock className="w-4 h-4 mr-2" />
                                      Reschedule
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="flex-1 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancelAppointment(appointment)}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Cancel
                                    </Button>
                                  </div>

                                  <Button
                                    className="w-full"
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      loadChat(appointment.id);
                                    }}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Chat with Doctor
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Specializations Grid */}
        {!selectedSpecialization && !showAppointments && (
          <>
            <Card className="mb-8 bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader>
                <CardTitle className="text-2xl">Select Medical Specialization</CardTitle>
                <CardDescription>
                  Choose a medical specialty to view available verified doctors
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {specializations.map((spec) => (
                <Card
                  key={spec.name}
                  className="cursor-pointer hover:scale-105 transition-all group"
                  onClick={() => setSelectedSpecialization(spec.name)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${spec.color} flex items-center justify-center text-4xl group-hover:animate-pulse`}>
                      {spec.icon}
                    </div>
                    <h3 className="font-bold text-lg">{spec.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Doctors List */}
        {selectedSpecialization && !showAppointments && (
          <>
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedSpecialization(null);
                  setDoctors([]);
                }}
              >
                Back to Specializations
              </Button>
            </div>

            <Card className="mb-8 bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Stethoscope className="w-6 h-6" />
                  {selectedSpecialization}
                </CardTitle>
                <CardDescription>
                  {doctors.length} verified doctor{doctors.length !== 1 ? 's' : ''} available
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-1">{doctor.doctor_name}</CardTitle>
                  <CardDescription className="mb-2">{doctor.specialization}</CardDescription>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < Math.floor(doctor.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-semibold">{doctor.rating || 4.5}</span>
                    <span className="text-xs text-muted-foreground">
                      ({doctor.total_reviews || 127})
                    </span>
                  </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-semibold">Rs. {doctor.consultation_fee}</span>
                      <span className="text-muted-foreground">consultation fee</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{doctor.available_timing}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">{doctor.experience_years} years experience</span>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => handleBookAppointment(doctor)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {doctors.length === 0 && (
                <Card className="col-span-full p-12 text-center">
                  <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Doctors Available</h3>
                  <p className="text-muted-foreground">
                    There are currently no verified doctors for this specialization.
                  </p>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Complete the details to book with {selectedDoctor?.doctor_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Doctor Info Summary */}
            <Card className="bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{selectedDoctor?.doctor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>Rs. {selectedDoctor?.consultation_fee}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">{selectedDoctor?.available_timing}</span>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Appointment Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Appointment Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label htmlFor="receipt">Payment Receipt (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload proof of payment for faster confirmation
              </p>
            </div>

            {/* Confirm Button */}
            <Button
              className="w-full"
              onClick={handleConfirmBooking}
              disabled={uploading || !selectedDate || !selectedTime}
            >
              {uploading ? "Processing..." : "Confirm Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={selectedAppointment !== null} onOpenChange={() => {
        setSelectedAppointment(null);
        setConversationId(null);
        setChatMessages([]);
      }}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chat with Doctor</DialogTitle>
            <DialogDescription>
              Appointment on {selectedAppointment?.appointment_date} at {selectedAppointment?.appointment_time}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {appointmentToReschedule && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-1">Current Appointment</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(appointmentToReschedule.appointment_date).toLocaleDateString()} at {appointmentToReschedule.appointment_time}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={newRescheduleDate}
                onChange={(e) => setNewRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={newRescheduleTime}
                onChange={(e) => setNewRescheduleTime(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRescheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={confirmReschedule}
                disabled={!newRescheduleDate || !newRescheduleTime}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
              {appointmentToCancel && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm font-semibold text-foreground">
                    Appointment on {new Date(appointmentToCancel.appointment_date).toLocaleDateString()} at {appointmentToCancel.appointment_time}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CarePilotBooking;
