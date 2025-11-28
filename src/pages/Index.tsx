import { useState, useEffect } from "react";
import * as LangChain from "langchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Hospital,
  Activity,
  Shield,
  Brain,
  Heart,
  Users,
  Zap,
  ArrowRight,
  MessageSquare,
  MapPin,
  CreditCard,
  Network,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import sehatverseLogo from "@/assets/sehatverse-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"en" | "ur">("en");

  // LangChain snippet for Index (homepage)
  useEffect(() => {
    try {
      const lc = (LangChain as any);
      console.log("LangChain snippet running on Index page", lc?.version || "no-version");
    } catch (err) {
      console.warn("LangChain init error (index)", err);
    }
  }, []);

  const text = {
    en: {
      title: "SehatVerse",
      subtitle: "Pakistan's First Agentic Health SuperApp",
      tagline: "10 AI Agents. One Mission. Your Health.",
      cta: "Start Health Journey",
      login: "Sign In",
      features: "Smart Features",
    },
    ur: {
      title: "صحت ورس",
      subtitle: "پاکستان کی پہلی ایجنٹک صحت سپر ایپ",
      tagline: "10 AI ایجنٹس۔ ایک مشن۔ آپ کی صحت۔",
      cta: "صحت کا سفر شروع کریں",
      login: "سائن ان",
      features: "اسمارٹ خصوصیات",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={sehatverseLogo} 
              alt="SehatVerse Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold gradient-text">
              {text[language].title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "ur" : "en")}
              className="text-sm"
            >
              {language === "en" ? "اردو" : "English"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              {text[language].login}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 agent-badge">
            <Zap className="w-3 h-3" />
            Powered by 10 AI Agents
          </Badge>
          
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${language === "ur" ? "font-urdu" : ""}`}>
            {text[language].title}
          </h1>
          
          <p className={`text-xl md:text-2xl text-muted-foreground mb-4 ${language === "ur" ? "font-urdu" : ""}`}>
            {text[language].subtitle}
          </p>
          
          <p className={`text-lg text-primary font-semibold mb-10 ${language === "ur" ? "font-urdu" : ""}`}>
            {text[language].tagline}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg hover:shadow-primary/30 transition-all"
              onClick={() => navigate("/auth")}
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {text[language].cta}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate("/install")}
            >
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl font-bold gradient-text">10+</div>
              <p className="text-sm text-muted-foreground">AI Health Agents</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl font-bold gradient-text">24/7</div>
              <p className="text-sm text-muted-foreground">Available Support</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl font-bold gradient-text">100%</div>
              <p className="text-sm text-muted-foreground">Secure & Private</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${language === "ur" ? "font-urdu" : ""}`}>
              {language === "en" ? "Why SehatVerse?" : "صحت ورس کیوں؟"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {language === "en" 
                ? "Your complete health companion powered by AI" 
                : "AI سے چلنے والا آپ کا مکمل صحت ساتھی"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "RapidCare" : "ریپڈ کیئر"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "Fast triage for critical care emergencies with instant AI assessment" 
                  : "فوری ہنگامی دیکھ بھال کے لیے تیز تشخیص"}
              </p>
            </Card>

            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "Find Care" : "دیکھ بھال تلاش کریں"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "Locate nearby hospitals and clinics with real-time availability" 
                  : "قریبی ہسپتال تلاش کریں"}
              </p>
            </Card>

            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "Sehat Card" : "صحت کارڈ"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "Check eligibility and manage your health insurance coverage" 
                  : "اہلیت چیک کریں اور کوریج منظم کریں"}
              </p>
            </Card>

            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "AI Diagnostics" : "AI تشخیص"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "Upload X-rays for instant AI-powered analysis and insights" 
                  : "فوری AI تجزیہ کے لیے ایکس رے اپ لوڈ کریں"}
              </p>
            </Card>

            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "CarePilot Booking" : "کیئر پائلٹ بکنگ"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "Book appointments with verified doctors instantly and securely" 
                  : "تصدیق شدہ ڈاکٹروں کے ساتھ ملاقات بک کریں"}
              </p>
            </Card>

            <Card className="story-card p-8 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {language === "en" ? "For Doctors" : "ڈاکٹروں کے لیے"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" 
                  ? "AI-powered case preparation and clinical decision support" 
                  : "AI سے چلنے والی کیس تیاری"}
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="text-lg px-10 py-6 bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all animate-glow-pulse"
              onClick={() => navigate("/auth")}
            >
              {language === "en" ? "Get Started - It's Free" : "شروع کریں - یہ مفت ہے"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              className="story-card p-8 text-center cursor-pointer hover:scale-105 transition-all flex flex-col h-full"
              onClick={() => navigate("/network")}
            >
              <Network className="w-12 h-12 text-primary mx-auto mb-4 animate-float" />
              <h3 className="text-xl font-bold mb-3">Agent Network</h3>
              <p className="text-sm text-muted-foreground">Real-time collaboration visualization</p>
            </Card>

            <Card className="story-card p-8 text-center flex flex-col h-full">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">CNIC encrypted, HIPAA compliant</p>
            </Card>
            
            <Card className="story-card p-8 text-center flex flex-col h-full">
              <Hospital className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">All Cities</h3>
              <p className="text-sm text-muted-foreground">Karachi, Lahore, Islamabad, Peshawar, Quetta</p>
            </Card>
            
            <Card className="story-card p-8 text-center flex flex-col h-full">
              <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Offline Ready</h3>
              <p className="text-sm text-muted-foreground">Works without internet + USSD fallback</p>
            </Card>
          </div>

          <div className="mt-8">
            <Card 
              className="story-card p-8 text-center cursor-pointer hover:scale-105 transition-all bg-gradient-to-br from-primary/10 to-accent/10"
              onClick={() => navigate("/knowledge-agent")}
            >
              <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-float" />
              <h3 className="text-xl font-bold mb-2">Medicine Knowledge Agent</h3>
              <p className="text-muted-foreground">AI-powered medicine search with fuzzy matching & bill estimation</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>SehatVerse © 2025 | Challenge 2: Agentic AI for Pakistan's Health</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
