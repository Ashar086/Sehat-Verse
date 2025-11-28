import { useState, useEffect } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Check, Smartphone, WifiOff, Zap, Shield } from "lucide-react";
import { BackButton } from "@/components/BackButton";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // LangChain snippet for Install page
  useEffect(() => {
    try {
      const lc = (LangChain as any);
      console.log("LangChain snippet running on Install page", lc?.version || "no-version");
    } catch (err) {
      console.warn("LangChain init error (install)", err);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    setInstalling(false);
  };

  const features = [
    {
      icon: WifiOff,
      title: "Offline Access",
      description: "View your health records even without internet connection"
    },
    {
      icon: Zap,
      title: "Faster Loading",
      description: "Instant access with cached data and optimized performance"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your health data is encrypted and stored securely"
    },
    {
      icon: Smartphone,
      title: "App-like Experience",
      description: "Add to your home screen and use like a native app"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <BackButton to="/" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <Badge className="agent-badge mb-4">
            <Download className="w-3 h-3" />
            Progressive Web App
          </Badge>
          <h1 className="text-4xl font-bold mb-4 gradient-text">
            Install SehatVerse
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the full app experience with offline access to your health records, 
            faster loading times, and a native app feel.
          </p>
        </div>

        {isInstalled ? (
          <Card className="story-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">App Installed!</h2>
            <p className="text-muted-foreground mb-6">
              SehatVerse has been installed on your device. You can now access it from your home screen.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              Go to Dashboard
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {features.map((feature, index) => (
                <Card key={index} className="story-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>

            <Card className="story-card p-8 text-center">
              {deferredPrompt ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">Ready to Install</h2>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to add SehatVerse to your home screen
                  </p>
                  <Button
                    onClick={handleInstall}
                    disabled={installing}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary-glow"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {installing ? "Installing..." : "Install Now"}
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-4">Manual Installation</h2>
                  <div className="text-left max-w-2xl mx-auto space-y-4">
                    <div>
                      <h3 className="font-bold mb-2">On iPhone/iPad:</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Tap the Share button (square with arrow)</li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" in the top right corner</li>
                      </ol>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">On Android:</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Tap the three dots menu (⋮) in the browser</li>
                        <li>Tap "Add to Home screen" or "Install app"</li>
                        <li>Tap "Install" or "Add"</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Already installed?{" "}
            <Button
              variant="link"
              onClick={() => navigate("/dashboard")}
              className="p-0 h-auto"
            >
              Go to Dashboard
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Install;
