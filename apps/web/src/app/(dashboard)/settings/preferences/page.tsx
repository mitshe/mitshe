"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Moon, Sun, Monitor, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { resetOnboardingTour } from "@/components/onboarding-tour";

const languages = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Fran\u00e7ais" },
];

const dateFormats = [
  { value: "relative", label: "Relative (e.g., 2 hours ago)" },
  { value: "absolute", label: "Absolute (e.g., Jan 15, 2024)" },
  { value: "iso", label: "ISO 8601 (e.g., 2024-01-15)" },
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [preferences, setPreferences] = useState({
    language: "en",
    dateFormat: "relative",
    compactMode: false,
    showWelcomeTips: true,
    emailNotifications: true,
  });

  useEffect(() => {
    setMounted(true);
    // Load preferences from localStorage
    const saved = localStorage.getItem("mitshe-preferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const updatePreference = <K extends keyof typeof preferences>(
    key: K,
    value: (typeof preferences)[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("mitshe-preferences", JSON.stringify(preferences));
      toast.success("Preferences saved");
      setHasChanges(false);
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-muted-foreground">
          Customize your mitshe experience
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how mitshe looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1"
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex-1"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact mode</Label>
                <p className="text-xs text-muted-foreground">
                  Reduce spacing and padding throughout the interface
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={preferences.compactMode}
                onCheckedChange={(checked) =>
                  updatePreference("compactMode", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader>
            <CardTitle>Language & Region</CardTitle>
            <CardDescription>
              Set your language and date format preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreference("language", value)}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Display language for the application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format">Date format</Label>
              <Select
                value={preferences.dateFormat}
                onValueChange={(value) => updatePreference("dateFormat", value)}
              >
                <SelectTrigger id="date-format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How dates are displayed throughout the app
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email notifications for important events
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  updatePreference("emailNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="welcome-tips">Show welcome tips</Label>
                <p className="text-xs text-muted-foreground">
                  Display helpful tips and onboarding guides
                </p>
              </div>
              <Switch
                id="welcome-tips"
                checked={preferences.showWelcomeTips}
                onCheckedChange={(checked) =>
                  updatePreference("showWelcomeTips", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              Manage onboarding and tutorial settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reset onboarding tour</Label>
                <p className="text-xs text-muted-foreground">
                  Show the welcome tour again when you visit the dashboard
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetOnboardingTour();
                  toast.success("Onboarding tour reset. Visit the dashboard to see it again.");
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {hasChanges ? "Save Preferences" : "No Changes"}
        </Button>
      </div>
    </div>
  );
}
