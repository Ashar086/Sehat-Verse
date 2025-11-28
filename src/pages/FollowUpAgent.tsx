import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackAgentVisit } from '@/utils/trackAgentVisit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bell, Calendar, Pill, Plus, Trash2, Clock, MessageSquare } from 'lucide-react';
import { BackButton } from "@/components/BackButton";
import { format } from 'date-fns';

interface Reminder {
  id: string;
  reminder_type: string;
  medication_name: string | null;
  facility_name: string | null;
  frequency: string;
  schedule: string;
  next_reminder: string;
  is_active: boolean;
  reasoning: string | null;
  created_at: string;
}

export default function FollowUpAgent() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    reminderType: 'medication',
    medicationName: '',
    facilityName: '',
    frequency: 'once_daily',
    customTimes: ['09:00'],
    phoneNumber: '',
  });

  useEffect(() => {
    loadReminders();
    trackAgentVisit('Follow-Up Agent');
    
    // Poll for due reminders every 30 seconds
    const interval = setInterval(checkDueReminders, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to view your reminders',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('followup-agent', {
        body: {
          userId: user.id,
          action: 'list_reminders',
        },
      });

      if (error) throw error;

      setReminders(data.reminders || []);
    } catch (error: any) {
      console.error('Error loading reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reminders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDueReminders = async () => {
    const now = new Date();
    const dueReminders = reminders.filter(r => {
      const reminderTime = new Date(r.next_reminder);
      const timeDiff = reminderTime.getTime() - now.getTime();
      return r.is_active && timeDiff > 0 && timeDiff < 60000; // Due within 1 minute
    });

    dueReminders.forEach(reminder => {
      toast({
        title: '💊 Medication Reminder',
        description: `Time to take ${reminder.medication_name || 'your medication'}!`,
        duration: 10000,
      });
    });
  };

  const createReminder = async () => {
    if (!formData.medicationName && !formData.facilityName) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide medication name or facility name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.phoneNumber) {
      toast({
        title: 'Phone Number Required',
        description: 'Please provide your phone number for SMS notifications',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('followup-agent', {
        body: {
          userId: user.id,
          action: 'schedule_reminder',
          reminderType: formData.reminderType,
          medicationName: formData.medicationName,
          facilityName: formData.facilityName,
          frequency: formData.frequency,
          customTimes: formData.customTimes,
          phoneNumber: formData.phoneNumber,
          sessionId: crypto.randomUUID(),
        },
      });

      if (error) throw error;

      toast({
        title: 'Reminder Created',
        description: `${formData.medicationName || 'Reminder'} scheduled. SMS will be sent to ${formData.phoneNumber}`,
      });

      setFormData({
        reminderType: 'medication',
        medicationName: '',
        facilityName: '',
        frequency: 'once_daily',
        customTimes: ['09:00'],
        phoneNumber: '',
      });

      await loadReminders();
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create reminder',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('followup-agent', {
        body: {
          userId: user.id,
          action: 'delete_reminder',
          reminderId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Reminder Deleted',
        description: 'Reminder removed successfully',
      });

      await loadReminders();
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'destructive',
      });
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      once_daily: 'Once Daily',
      twice_daily: 'Twice Daily',
      three_times_daily: '3 Times Daily',
      four_times_daily: '4 Times Daily',
      every_8_hours: 'Every 8 Hours',
      every_6_hours: 'Every 6 Hours',
      hourly: 'Hourly',
      'one-time': 'One-Time',
    };
    return labels[frequency] || frequency;
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      hourly: 'bg-red-500',
      every_6_hours: 'bg-orange-500',
      every_8_hours: 'bg-orange-500',
      four_times_daily: 'bg-yellow-500',
      three_times_daily: 'bg-blue-500',
      twice_daily: 'bg-green-500',
      once_daily: 'bg-green-500',
      'one-time': 'bg-gray-500',
    };
    return colors[frequency] || 'bg-gray-500';
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      customTimes: [...formData.customTimes, '09:00'],
    });
  };

  const removeTimeSlot = (index: number) => {
    const newTimes = formData.customTimes.filter((_, i) => i !== index);
    setFormData({ ...formData, customTimes: newTimes });
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...formData.customTimes];
    newTimes[index] = value;
    setFormData({ ...formData, customTimes: newTimes });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" className="h-10 w-10" />
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Follow-Up Agent</h1>
            <p className="text-muted-foreground">Manage your medication reminders</p>
          </div>
        </div>

        {/* Create Reminder Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Reminder
            </CardTitle>
            <CardDescription>Set up a medication or appointment reminder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reminderType">Reminder Type</Label>
                <Select
                  value={formData.reminderType}
                  onValueChange={(value) => setFormData({ ...formData, reminderType: value })}
                >
                  <SelectTrigger id="reminderType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="emergency_followup">Emergency Follow-up</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">How Often?</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_daily">Once Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily (Morning & Night)</SelectItem>
                    <SelectItem value="three_times_daily">3 Times Daily</SelectItem>
                    <SelectItem value="four_times_daily">4 Times Daily</SelectItem>
                    <SelectItem value="every_8_hours">Every 8 Hours</SelectItem>
                    <SelectItem value="every_6_hours">Every 6 Hours</SelectItem>
                    <SelectItem value="one-time">One-Time Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicationName">Medication Name</Label>
                <Input
                  id="medicationName"
                  placeholder="e.g., Amoxicillin, Paracetamol"
                  value={formData.medicationName}
                  onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (for SMS)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+92-3XX-XXXXXXX"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="facilityName">Facility Name (Optional)</Label>
                <Input
                  id="facilityName"
                  placeholder="e.g., City Hospital"
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                />
              </div>
            </div>

            {/* Custom Time Slots */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Set Reminder Times</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTimeSlot}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Time
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-3">
                {formData.customTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTimeSlot(index, e.target.value)}
                      className="flex-1"
                    />
                    {formData.customTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeSlot(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Preview */}
            {formData.medicationName && formData.phoneNumber && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="w-4 h-4" />
                  SMS Preview
                </div>
                <div className="text-sm bg-background p-3 rounded border">
                  <p className="font-mono">
                    SehatVerse Reminder: Time to take {formData.medicationName}! 
                    {formData.customTimes.length > 0 && ` Next dose at ${formData.customTimes[0]}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Will be sent to: {formData.phoneNumber}
                  </p>
                </div>
              </div>
            )}

            <Button onClick={createReminder} disabled={creating} className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Create Reminder'}
            </Button>
          </CardContent>
        </Card>

        {/* Reminders List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Your Reminders
          </h2>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading reminders...
              </CardContent>
            </Card>
          ) : reminders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reminders yet. Create your first reminder above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reminders.map((reminder) => (
                <Card key={reminder.id} className={!reminder.is_active ? 'opacity-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">
                          {reminder.medication_name || reminder.facility_name || 'Reminder'}
                        </CardTitle>
                      </div>
                      <Badge className={getFrequencyBadge(reminder.frequency)}>
                        {getFrequencyLabel(reminder.frequency)}
                      </Badge>
                    </div>
                    <CardDescription className="capitalize">
                      {reminder.reminder_type.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Next: {format(new Date(reminder.next_reminder), 'PPp')}
                      </span>
                    </div>

                    {reminder.reasoning && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {reminder.reasoning}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      {!reminder.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
