import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Zap, Activity, Heart, Sparkles } from "lucide-react";

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "cyber-cyan" as const,
      name: "Cyber Cyan",
      icon: Zap,
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      id: "matrix-green" as const,
      name: "Matrix Green",
      icon: Activity,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      id: "cyber-blue" as const,
      name: "Cyber Blue",
      icon: Sparkles,
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      id: "medical-red" as const,
      name: "Medical Red",
      icon: Heart,
      gradient: "from-red-500 to-rose-500",
    },
    {
      id: "white" as const,
      name: "White Theme",
      icon: Palette,
      gradient: "from-slate-300 to-gray-400",
    },
  ];

  const currentTheme = themes.find((t) => t.id === theme);
  const CurrentIcon = currentTheme?.icon || Palette;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
        >
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/50">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`cursor-pointer ${
                theme === t.id ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1">{t.name}</span>
                {theme === t.id && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
