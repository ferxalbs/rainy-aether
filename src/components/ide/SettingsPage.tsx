import React, { useCallback, useMemo } from "react";
import { Brush, Laptop2, MoonStar, SunMedium } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { useIDEStore } from "../../stores/ideStore";
import { useSettingsState, setFileIconColorMode, setCustomFileColor } from "../../stores/settingsStore";
import {
  useThemeState,
  setUserPreference,
  ThemeMode,
  getThemeBaseOptions,
  switchBaseTheme
} from "../../stores/themeStore";

const extOrder = ["ts", "tsx", "js", "jsx", "rs", "json", "md", "css", "scss", "html", "svg"];

const SettingsPage: React.FC = () => {
  const { actions } = useIDEStore();
  const settingsState = useSettingsState();
  const theme = useThemeState();
  const themeOptions = useMemo(() => getThemeBaseOptions(), []);
  const activeThemeOption = useMemo(
    () => themeOptions.find((option) => option.id === theme.currentTheme.name.split("-")[0]),
    [themeOptions, theme.currentTheme.name]
  );

  const setMode = useCallback(async (mode: ThemeMode) => {
    await setUserPreference(mode);
  }, []);

  const handleBaseThemeChange = useCallback(
    (baseId: string) => {
      const activeMode = theme.userPreference === "system" ? theme.systemTheme : theme.userPreference;
      switchBaseTheme(baseId, activeMode);
    },
    [theme.userPreference, theme.systemTheme]
  );

  const currentBase = useMemo(() => theme.currentTheme.name.split("-")[0], [theme.currentTheme.name]);

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Preferences</div>
        <Button variant="ghost" className="w-full justify-start">
          Appearance
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          Explorer
        </Button>
        <div className="mt-6">
          <Button variant="secondary" className="w-full" disabled>
            Manage Extensions (coming soon)
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => actions.openFolderDialog()}>
              Open Folder…
            </Button>
            <Button variant="outline" onClick={() => actions.closeSettings()}>
              Back to Editor
            </Button>
          </div>
        </div>

        {/* Theme Mode */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Theme Preferences</CardTitle>
            <CardDescription>Choose how the editor adapts to your environment and style.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Laptop2 className="h-4 w-4" />
                  Theme Mode
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Follow system default or lock the interface to a specific mode.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={theme.userPreference === "system" ? "default" : "outline"}
                    onClick={() => setMode("system")}
                  >
                    System
                  </Button>
                  <Button
                    size="sm"
                    variant={theme.userPreference === "day" ? "default" : "outline"}
                    onClick={() => setMode("day")}
                  >
                    <SunMedium className="mr-1 h-3.5 w-3.5" /> Day
                  </Button>
                  <Button
                    size="sm"
                    variant={theme.userPreference === "night" ? "default" : "outline"}
                    onClick={() => setMode("night")}
                  >
                    <MoonStar className="mr-1 h-3.5 w-3.5" /> Night
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Currently following: {theme.userPreference === "system" ? `System (${theme.systemTheme})` : theme.userPreference}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-card/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Brush className="h-4 w-4" />
                  Theme Catalog
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Pick a theme family tailored for developers. Variants adjust automatically per mode.
                </div>
                <Select value={currentBase} onValueChange={handleBaseThemeChange}>
                  <SelectTrigger className="h-11 w-full text-left">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectGroup>
                      <SelectLabel>Available themes</SelectLabel>
                      {themeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id} className="py-2">
                          <span className="text-sm font-medium text-foreground">{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeThemeOption?.description ?? "Select a theme family to view its details."}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-3 text-xs text-muted-foreground">
              <div>
                <div className="text-sm font-medium text-foreground">Active Theme</div>
                <p>{theme.currentTheme.displayName}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Mode</div>
                <p>{theme.userPreference === "system" ? `System (${theme.systemTheme})` : theme.userPreference}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Variants</div>
                <p>
                  {themeOptions
                    .find((option) => option.id === currentBase)?.modesAvailable
                    .map((mode) => (mode === "day" ? "Day" : "Night"))
                    .join(" · ") || "Unavailable"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Icons */}
        <Card>
          <CardHeader>
            <CardTitle>File Icon Colors</CardTitle>
            <CardDescription>Use theme defaults or customize per file type.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant={settingsState.fileIconColorMode === "theme" ? "default" : "outline"}
                  onClick={() => void setFileIconColorMode("theme")}
                >
                  Theme-based
                </Button>
                <Button
                  variant={settingsState.fileIconColorMode === "custom" ? "default" : "outline"}
                  onClick={() => void setFileIconColorMode("custom")}
                >
                  Custom
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extOrder.map((ext) => (
                <div key={ext} className="flex items-center justify-between border rounded p-3">
                  <div className="text-sm font-medium">.{ext}</div>
                  <input
                    type="color"
                    value={settingsState.customFileColors[ext] || "#888888"}
                    onChange={(event) => void setCustomFileColor(ext, event.target.value)}
                    className="w-10 h-6 border rounded"
                    disabled={settingsState.fileIconColorMode !== "custom"}
                    title={`Color for .${ext} files`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
