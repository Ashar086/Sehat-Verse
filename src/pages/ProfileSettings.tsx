import { useState, useEffect } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  User as UserIcon,
  Bell,
  Globe,
  Save,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name too long"),
  phone: z.string().max(20, "Phone number too long").optional(),
  city: z.string().max(100, "City name too long").optional(),
});

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState<"en" | "ur">("en");

  // Notification preferences
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSms, setNotificationSms] = useState(false);
  const [notificationPush, setNotificationPush] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkUser();
  }, []);

  // LangChain snippet for profile page
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on ProfileSettings page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (profile)", err);
      }
    })();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
        const userLang = data.language as "en" | "ur";
        setLanguage(userLang || "en");
        setNotificationEmail(data.notification_email ?? true);
        setNotificationSms(data.notification_sms ?? false);
        setNotificationPush(data.notification_push ?? true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setErrors({});
    setSaving(true);

    try {
      // Validate input
      const validationResult = profileSchema.safeParse({
        full_name: fullName.trim(),
        phone: phone?.trim(),
        city: city?.trim(),
      });

      if (!validationResult.success) {
        const newErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone?.trim() || null,
          city: city?.trim() || null,
          language,
          notification_email: notificationEmail,
          notification_sms: notificationSms,
          notification_push: notificationPush,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Profile Settings</h1>
              <p className="text-xs text-muted-foreground">
                Manage your account preferences
              </p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Personal Information */}
        <Card className="story-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Personal Information</h2>
              <p className="text-sm text-muted-foreground">
                Update your profile details
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="fullName" className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                maxLength={100}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 XXX XXXXXXX"
                maxLength={20}
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city" className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                City
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter your city"
                maxLength={100}
              />
              {errors.city && (
                <p className="text-xs text-destructive mt-1">{errors.city}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Language Preference */}
        <Card className="story-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Language Preference</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred language
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
              className="flex-1"
            >
              English
            </Button>
            <Button
              variant={language === "ur" ? "default" : "outline"}
              onClick={() => setLanguage("ur")}
              className="flex-1 font-urdu"
            >
              اردو
            </Button>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="story-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground">
                Manage how you receive notifications
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30">
              <div>
                <p className="font-semibold">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notificationEmail}
                onCheckedChange={setNotificationEmail}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30">
              <div>
                <p className="font-semibold">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive SMS alerts (coming soon)
                </p>
              </div>
              <Switch
                checked={notificationSms}
                onCheckedChange={setNotificationSms}
                disabled
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30">
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive in-app notifications
                </p>
              </div>
              <Switch
                checked={notificationPush}
                onCheckedChange={setNotificationPush}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
