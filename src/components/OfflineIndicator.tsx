import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-fade-in">
      {!isOnline ? (
        <Alert className="bg-destructive/90 text-destructive-foreground border-destructive backdrop-blur-lg">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>Offline Mode</strong>
            <br />
            You can still view cached health records and data
          </AlertDescription>
        </Alert>
      ) : showReconnected ? (
        <Alert className="bg-primary/90 text-primary-foreground border-primary backdrop-blur-lg">
          <Wifi className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>Back Online</strong>
            <br />
            All features are now available
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};
