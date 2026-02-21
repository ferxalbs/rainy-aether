import { Settings, Brush, Code2, FileText, Type, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type SettingsViewType =
  | "quick"
  | "appearance"
  | "editor"
  | "explorer"
  | "lsp"
  | "fonts"
  | "advanced";

interface SettingsSidebarProps {
  currentView: SettingsViewType;
  setCurrentView: (view: SettingsViewType) => void;
}

export function SettingsSidebar({
  currentView,
  setCurrentView,
}: SettingsSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 p-4 space-y-2 flex flex-col glass-panel rounded-xl overflow-y-auto !bg-background/60 dark:!bg-background/20 backdrop-blur-2xl backdrop-saturate-150 text-foreground">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        Preferences
      </div>

      <Button
        variant={currentView === "quick" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setCurrentView("quick")}
      >
        <Settings className="mr-2 h-4 w-4" />
        Quick Settings
      </Button>

      <Button
        variant={currentView === "appearance" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setCurrentView("appearance")}
      >
        <Brush className="mr-2 h-4 w-4" />
        Appearance
      </Button>

      <Button
        variant={currentView === "editor" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setCurrentView("editor")}
      >
        <Code2 className="mr-2 h-4 w-4" />
        Editor
      </Button>

      <Button
        variant={currentView === "explorer" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setCurrentView("explorer")}
      >
        <FileText className="mr-2 h-4 w-4" />
        Explorer
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setCurrentView("fonts")}
      >
        <Type className="mr-2 h-4 w-4" />
        Fonts
      </Button>

      <Button
        variant={currentView === "lsp" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setCurrentView("lsp")}
      >
        <Server className="mr-2 h-4 w-4" />
        LSP & Binaries
      </Button>

      <Separator className="my-4" />

      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setCurrentView("advanced")}
      >
        All Settings
      </Button>

      <div className="mt-6">
        <Button variant="secondary" className="w-full" disabled>
          Manage Extensions (coming soon)
        </Button>
      </div>
    </div>
  );
}
