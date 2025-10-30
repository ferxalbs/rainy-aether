import React, { useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useIDEStore } from "../../stores/ideStore";
import { useSettingsState, setFileIconColorMode, setCustomFileColor } from "../../stores/settingsStore";
import { useThemeState, setUserPreference, ThemeMode } from "../../stores/themeStore";

const extOrder = ["ts", "tsx", "js", "jsx", "rs", "json", "md", "css", "scss", "html", "svg"];

const SettingsPage: React.FC = () => {
  const { actions } = useIDEStore();
  const settingsState = useSettingsState();
  const theme = useThemeState();

  const setMode = useCallback(async (mode: ThemeMode) => {
    await setUserPreference(mode);
  }, []);

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
            <CardTitle>Theme Mode</CardTitle>
            <CardDescription>Follow system or set Day/Night for UI and editor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                variant={theme.userPreference === "system" ? "default" : "outline"}
                onClick={() => setMode("system")}
              >
                System
              </Button>
              <Button
                variant={theme.userPreference === "day" ? "default" : "outline"}
                onClick={() => setMode("day")}
              >
                Day
              </Button>
              <Button
                variant={theme.userPreference === "night" ? "default" : "outline"}
                onClick={() => setMode("night")}
              >
                Night
              </Button>
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
