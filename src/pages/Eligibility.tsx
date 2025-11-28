import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Sparkles, Calendar, Clock, MapPin, CheckCircle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Eligibility = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [formData, setFormData] = useState({
    cnic: "",
    fatherName: "",
    city: "",
    incomeGroup: "",
  });

  const [appointmentData, setAppointmentData] = useState({
    facilityId: "",
    appointmentDate: "",
    appointmentTime: "",
    purpose: "Eligibility Verification",
    patientName: "",
    patientPhone: "",
    notes: "",
  });

  useEffect(() => {
    loadFacilities();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      // Pre-populate appointment data with profile info
      if (profile) {
        setAppointmentData(prev => ({
          ...prev,
          patientName: profile.full_name || "",
          patientPhone: profile.phone || "",
        }));
      }
    } catch (error: any) {
      console.error('Error in loadUserProfile:', error);
    }
  };

  const loadFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, city, address, phone, type, specialties')
        .order('name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (error: any) {
      console.error('Error loading facilities:', error);
      toast({
        title: "Error",
        description: "Failed to load facilities. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke("eligibility-agent", {
        body: {
          cnic: formData.cnic,
          father_name: formData.fatherName,
          city: formData.city,
          income_group: formData.incomeGroup,
          user_id: user?.id,
        },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: data.eligible ? "✅ Eligible!" : "❌ Not Eligible",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);

    try {
      // Validate facility selection
      if (!appointmentData.facilityId) {
        toast({
          title: "⚠️ Facility Required",
          description: "Please select a facility before booking.",
          variant: "destructive",
        });
        setBookingLoading(false);
        return;
      }

      // Validate patient details
      if (!appointmentData.patientName || !appointmentData.patientPhone) {
        toast({
          title: "⚠️ Details Required",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        setBookingLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to book an appointment');

      console.log('Booking appointment with data:', appointmentData);

      const { data, error } = await supabase.functions.invoke("book-appointment", {
        body: appointmentData,
      });

      if (error) throw error;

      toast({
        title: "✅ Appointment Booked!",
        description: data.message,
      });

      setBookingOpen(false);
      setAppointmentData({
        facilityId: "",
        appointmentDate: "",
        appointmentTime: "",
        purpose: "Eligibility Verification",
        patientName: "",
        patientPhone: "",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-mesh)" }} />
      
      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="relative bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton />
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-primary animate-glow-pulse" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Sehat Card Eligibility
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl relative z-10">
        <Card className="story-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-glow-pulse">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Check Your Eligibility</h2>
              <p className="text-muted-foreground text-sm">Enter your details to verify Sehat Card eligibility</p>
            </div>
          </div>

          <form onSubmit={checkEligibility} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cnic" className="text-foreground">CNIC Number</Label>
              <Input
                id="cnic"
                placeholder="12345-6789012-3"
                value={formData.cnic}
                onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                required
                className="bg-background/50 backdrop-blur-sm border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatherName" className="text-foreground">Father's Name</Label>
              <Input
                id="fatherName"
                placeholder="Enter father's name"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                required
                className="bg-background/50 backdrop-blur-sm border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground">City</Label>
              <Input
                id="city"
                placeholder="Enter your city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="bg-background/50 backdrop-blur-sm border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeGroup" className="text-foreground">Income Group</Label>
              <select
                id="incomeGroup"
                value={formData.incomeGroup}
                onChange={(e) => setFormData({ ...formData, incomeGroup: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-2xl bg-background/50 backdrop-blur-sm border-2 border-primary/30 focus:border-primary text-foreground"
              >
                <option value="">Select income group</option>
                <option value="low">Low Income (Below PKR 31,000)</option>
                <option value="middle">Middle Income (PKR 31,000 - 60,000)</option>
                <option value="high">High Income (Above PKR 60,000)</option>
              </select>
            </div>

            <Button 
              type="submit" 
              variant="neon"
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Eligibility"}
            </Button>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              <Card className={`p-6 border-2 ${result.eligible ? "border-health-normal bg-health-normal/10" : "border-destructive bg-destructive/10"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.eligible ? "bg-health-normal" : "bg-destructive"}`}>
                    <span className="text-2xl">{result.eligible ? "✓" : "✗"}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{result.eligible ? "Eligible!" : "Not Eligible"}</h3>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>

                {result.reasoning && (
                  <div className="mt-4 p-4 bg-background/50 rounded-xl border border-border">
                    <p className="text-sm"><span className="font-semibold">Reasoning:</span> {result.reasoning}</p>
                  </div>
                )}

                {result.eligible && result.card_data && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm"><span className="font-semibold">Card ID:</span> {result.card_data.id}</p>
                    <p className="text-sm"><span className="font-semibold">Coverage:</span> PKR {result.card_data.remaining_credits?.toLocaleString()}</p>
                  </div>
                )}
              </Card>

              {/* Comprehensive Programs Information */}
              {result.programs && (
                <div className="space-y-4">
                  {/* Medical Card */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Medical Card Eligibility
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-semibold">Status:</span> <span className="text-health-normal">✓ Eligible</span></p>
                      <p className="text-sm"><span className="font-semibold">Reason:</span> {result.programs.medicalCard.reason}</p>
                      <p className="text-sm"><span className="font-semibold">Coverage:</span> PKR {result.programs.medicalCard.coverage.toLocaleString()}</p>
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Benefits:</p>
                        <ul className="text-sm list-disc list-inside ml-2 text-muted-foreground">
                          {result.programs.medicalCard.benefits.map((benefit: string, idx: number) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>

                  {/* EPI Vaccines */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      EPI Vaccines Eligibility
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-semibold">Status:</span> <span className="text-health-normal">✓ Eligible</span></p>
                      <p className="text-sm"><span className="font-semibold">Reason:</span> {result.programs.epiVaccines.reason}</p>
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Available Vaccines:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {result.programs.epiVaccines.vaccines.map((vaccine: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs">{vaccine}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm mt-2"><span className="font-semibold">Next Steps:</span> {result.programs.epiVaccines.nextSteps}</p>
                    </div>
                  </Card>

                  {/* Health Subsidy */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3">Health Subsidy Eligibility</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-semibold">Status:</span> <span className="text-health-normal">✓ Eligible</span></p>
                      <p className="text-sm"><span className="font-semibold">Reason:</span> {result.programs.healthSubsidy.reason}</p>
                      <p className="text-sm"><span className="font-semibold">Subsidy Amount:</span> {result.programs.healthSubsidy.subsidyAmount}</p>
                      <p className="text-sm"><span className="font-semibold">Valid At:</span> {result.programs.healthSubsidy.validFacilities}</p>
                    </div>
                  </Card>

                  {/* Data Gathering */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3">Information Gathering</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">Collected Data:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.dataGathering.collected.map((item: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-health-normal/20 text-health-normal rounded-lg text-xs">✓ {item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Missing Data (Optional):</p>
                        <div className="flex flex-wrap gap-2">
                          {result.dataGathering.missing.map((item: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs">{item}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic">{result.dataGathering.importance}</p>
                    </div>
                  </Card>

                  {/* Qualified Programs */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3">Qualified Programs</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.qualifiedPrograms.map((program: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                          {program}
                        </span>
                      ))}
                    </div>
                  </Card>

                  {/* Application Forms */}
                  <Card className="p-6 bg-accent/50 border-primary/20">
                    <h4 className="font-bold text-lg mb-3">Pre-filled Application Forms</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-semibold">Sehat Card:</span> {result.applicationForms.sehatCard}</p>
                      <p className="text-sm"><span className="font-semibold">EPI Registration:</span> {result.applicationForms.epi}</p>
                      <p className="text-sm"><span className="font-semibold">Health Subsidy:</span> {result.applicationForms.subsidy}</p>
                    </div>
                  </Card>

                  {/* Book Appointment Button */}
                  <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                    <DialogTrigger asChild>
                      <Button variant="neon" size="lg" className="w-full">
                        <Calendar className="w-5 h-5 mr-2" />
                        Book Appointment at Empaneled Facility
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Book Facility Appointment</DialogTitle>
                        <DialogDescription>
                          Schedule a visit to an empaneled facility for eligibility verification or consultation
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={bookAppointment} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="facility">Select Facility *</Label>
                          <Select
                            value={appointmentData.facilityId}
                            onValueChange={(value) => {
                              console.log('Facility selected:', value);
                              setAppointmentData({ ...appointmentData, facilityId: value });
                            }}
                          >
                            <SelectTrigger className={!appointmentData.facilityId ? "border-destructive" : ""}>
                              <SelectValue placeholder="Choose a facility" />
                            </SelectTrigger>
                            <SelectContent>
                              {facilities.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No facilities available
                                </div>
                              ) : (
                                facilities.map((facility) => (
                                  <SelectItem key={facility.id} value={facility.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{facility.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {facility.city} • {facility.type}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {!appointmentData.facilityId && (
                            <p className="text-xs text-destructive">Please select a facility</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">Appointment Date *</Label>
                            <Input
                              id="date"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={appointmentData.appointmentDate}
                              onChange={(e) => setAppointmentData({ ...appointmentData, appointmentDate: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="time">Preferred Time *</Label>
                            <Select
                              value={appointmentData.appointmentTime}
                              onValueChange={(value) => setAppointmentData({ ...appointmentData, appointmentTime: value })}
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
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="purpose">Purpose *</Label>
                          <Select
                            value={appointmentData.purpose}
                            onValueChange={(value) => setAppointmentData({ ...appointmentData, purpose: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Eligibility Verification">Eligibility Verification</SelectItem>
                              <SelectItem value="General Consultation">General Consultation</SelectItem>
                              <SelectItem value="Card Registration">Card Registration</SelectItem>
                              <SelectItem value="EPI Vaccination">EPI Vaccination</SelectItem>
                              <SelectItem value="Health Subsidy Application">Health Subsidy Application</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="patientName">Patient Name *</Label>
                          <Input
                            id="patientName"
                            placeholder="Full name"
                            value={appointmentData.patientName}
                            onChange={(e) => setAppointmentData({ ...appointmentData, patientName: e.target.value })}
                            required
                            className={appointmentData.patientName ? "border-primary/50" : ""}
                          />
                          {appointmentData.patientName && (
                            <p className="text-xs text-primary flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Auto-filled from your profile
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="patientPhone">Contact Number *</Label>
                          <Input
                            id="patientPhone"
                            type="tel"
                            placeholder="03XX-XXXXXXX"
                            value={appointmentData.patientPhone}
                            onChange={(e) => setAppointmentData({ ...appointmentData, patientPhone: e.target.value })}
                            required
                            className={appointmentData.patientPhone ? "border-primary/50" : ""}
                          />
                          {appointmentData.patientPhone && (
                            <p className="text-xs text-primary flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Auto-filled from your profile
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Additional Notes (Optional)</Label>
                          <Input
                            id="notes"
                            placeholder="Any special requirements or information"
                            value={appointmentData.notes}
                            onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setBookingOpen(false)}
                            disabled={bookingLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="neon"
                            className="flex-1"
                            disabled={bookingLoading}
                          >
                            {bookingLoading ? "Booking..." : "Confirm Appointment"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Eligibility;
