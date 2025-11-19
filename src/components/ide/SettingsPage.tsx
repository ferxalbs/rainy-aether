import { useCallback, useMemo, useState } from "react";
import { Brush, Laptop2, MoonStar, SunMedium, Settings, FileText, Type, Code2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { useIDEStore } from "../../stores/ideStore";
import {
  useSettingsState,
  setFileIconColorMode,
  setCustomFileColor,
  setFormatOnSave,
  setStickyScroll,
  setBracketPairColorization,
  setAutoClosingBrackets,
  setAutoClosingQuotes,
  setMinimapEnabled,
  setEditorFontSize,
  setTabSize,
  setInsertSpaces,
  setSmoothScrolling,
  updateEditorSetting,
  AutoSaveMode
} from "../../stores/settingsStore";
import {
  useThemeState,
  setUserPreference,
  ThemeMode,
  getThemeBaseOptions,
  switchBaseTheme
} from "../../stores/themeStore";
import { ConfigurationSettings } from "./ConfigurationSettings";
import { StringSetting } from "@/components/configuration/StringSetting";
import { BooleanSetting } from "@/components/configuration/BooleanSetting";
import { EnumSetting } from "@/components/configuration/EnumSetting";
import { ObjectSetting } from "@/components/configuration/ObjectSetting";
import { FontSettings } from "@/components/configuration/FontSettings";
import { useConfigurationState, configurationActions } from "@/stores/configurationStore";
import type { ResolvedConfigurationProperty } from "@/types/configuration";

const extOrder = ["ts", "tsx", "js", "jsx", "rs", "json", "md", "css", "scss", "html", "svg"];

const SettingsPage = () => {
  const { actions } = useIDEStore();
  const settingsState = useSettingsState();
  const theme = useThemeState();
  const configState = useConfigurationState();
  const themeOptions = useMemo(() => getThemeBaseOptions(), []);
  const activeThemeOption = useMemo(
    () => themeOptions.find((option) => option.id === theme.currentTheme.name.split("-")[0]),
    [themeOptions, theme.currentTheme.name]
  );

  const [currentView, setCurrentView] = useState<"quick" | "appearance" | "editor" | "explorer" | "fonts" | "advanced">("quick");

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

  // Filter configuration properties by category
  const appearanceProperties = useMemo(
    () => configState.properties.filter(p => p.key.startsWith('workbench.') || p.key.startsWith('editor.')),
    [configState.properties]
  );

  const explorerProperties = useMemo(
    () => configState.properties.filter(p => p.key.startsWith('explorer.') || p.key.startsWith('files.')),
    [configState.properties]
  );

  // Handle configuration property changes
  const handlePropertyChange = useCallback(async (property: ResolvedConfigurationProperty, newValue: any) => {
    try {
      await configurationActions.set({
        key: property.key,
        value: newValue,
        scope: 'user'
      });
    } catch (error: any) {
      console.error('Failed to update configuration:', error);
    }
  }, []);

  const handlePropertyReset = useCallback(async (property: ResolvedConfigurationProperty) => {
    try {
      await configurationActions.reset({
        key: property.key,
        scope: 'user'
      });
    } catch (error: any) {
      console.error('Failed to reset configuration:', error);
    }
  }, []);

  // Render setting control based on type
  const renderSettingControl = useCallback((property: ResolvedConfigurationProperty) => {
    const value = property.value ?? property.default;

    // Enum type (has enum values)
    if (property.enum && property.enum.length > 0) {
      return (
        <EnumSetting
          key={property.key}
          property={property}
          value={value}
          onChange={(newValue) => handlePropertyChange(property, newValue)}
          onReset={() => handlePropertyReset(property)}
        />
      );
    }

    // Type-based rendering
    switch (property.type) {
      case 'string':
        return (
          <StringSetting
            key={property.key}
            property={property}
            value={value || ''}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'number':
      case 'integer':
        return (
          <StringSetting
            key={property.key}
            property={property}
            value={String(value || 0)}
            onChange={(newValue) => handlePropertyChange(property, parseFloat(newValue))}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'boolean':
        return (
          <BooleanSetting
            key={property.key}
            property={property}
            value={value || false}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      case 'object':
        return (
          <ObjectSetting
            key={property.key}
            property={property}
            value={value || {}}
            onChange={(newValue) => handlePropertyChange(property, newValue)}
            onReset={() => handlePropertyReset(property)}
          />
        );

      default:
        return null;
    }
  }, [handlePropertyChange, handlePropertyReset]);

  // Render Advanced Settings view
  if (currentView === "advanced") {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("quick")}>
              ← Back
            </Button>
            <h1 className="text-xl font-semibold">Advanced Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => actions.openFolderDialog()}>
              Open Folder…
            </Button>
            <Button variant="outline" onClick={() => actions.closeSettings()}>
              Back to Editor
            </Button>
          </div>
        </div>

        {/* Configuration Settings UI */}
        <div className="flex-1 overflow-hidden">
          <ConfigurationSettings />
        </div>
      </div>
    );
  }

  // Render Font Settings view
  if (currentView === "fonts") {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("quick")}>
              ← Back
            </Button>
            <h1 className="text-xl font-semibold">Font Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => actions.openFolderDialog()}>
              Open Folder…
            </Button>
            <Button variant="outline" onClick={() => actions.closeSettings()}>
              Back to Editor
            </Button>
          </div>
        </div>

        {/* Font Settings UI */}
        <div className="flex-1 overflow-hidden">
          <FontSettings />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Preferences</div>

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
          variant={currentView === "fonts" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => setCurrentView("fonts")}
        >
          <Type className="mr-2 h-4 w-4" />
          Fonts
        </Button>

        <Separator className="my-4" />

        <Button
          variant={(currentView as string) === "advanced" ? "secondary" : "outline"}
          className="w-full justify-start"
          onClick={() => setCurrentView("advanced" as any)}
        >
          All Settings
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
          <h1 className="text-xl font-semibold">
            {currentView === "quick" && "Quick Settings"}
            {currentView === "appearance" && "Appearance Settings"}
            {currentView === "editor" && "Editor Settings"}
            {currentView === "explorer" && "Explorer Settings"}
            {currentView === "fonts" && "Font Settings"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => actions.openFolderDialog()}>
              Open Folder…
            </Button>
            <Button variant="outline" onClick={() => actions.closeSettings()}>
              Back to Editor
            </Button>
          </div>
        </div>

        {/* Quick Settings View */}
        {currentView === "quick" && (
          <>
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
          </>
        )}

        {/* Appearance Settings View */}
        {currentView === "appearance" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Configuration</CardTitle>
                <CardDescription>
                  Configure workbench appearance, editor fonts, colors, and UI elements. For more options, visit{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal text-primary"
                    onClick={() => setCurrentView("advanced")}
                  >
                    All Settings
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appearanceProperties.length > 0 ? (
                  appearanceProperties.map(property => renderSettingControl(property))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No appearance settings available. Configure settings in the Advanced view.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Editor Settings View */}
        {currentView === "editor" && (
          <div className="space-y-6">
            {/* Format Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Formatting</CardTitle>
                <CardDescription>Configure automatic code formatting options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Format on Save</div>
                    <div className="text-xs text-muted-foreground">Automatically format code when saving files</div>
                  </div>
                  <Button
                    variant={settingsState.editor.formatOnSave ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setFormatOnSave(!settingsState.editor.formatOnSave)}
                  >
                    {settingsState.editor.formatOnSave ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Format on Paste</div>
                    <div className="text-xs text-muted-foreground">Format pasted content automatically</div>
                  </div>
                  <Button
                    variant={settingsState.editor.formatOnPaste ? "default" : "outline"}
                    size="sm"
                    onClick={() => void updateEditorSetting('formatOnPaste', !settingsState.editor.formatOnPaste)}
                  >
                    {settingsState.editor.formatOnPaste ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visual Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Features</CardTitle>
                <CardDescription>Configure visual aids and code highlighting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Sticky Scroll</div>
                    <div className="text-xs text-muted-foreground">Keep function/class headers visible while scrolling</div>
                  </div>
                  <Button
                    variant={settingsState.editor.stickyScroll ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setStickyScroll(!settingsState.editor.stickyScroll)}
                  >
                    {settingsState.editor.stickyScroll ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Bracket Pair Colorization</div>
                    <div className="text-xs text-muted-foreground">Colorize matching brackets with different colors</div>
                  </div>
                  <Button
                    variant={settingsState.editor.bracketPairColorization ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setBracketPairColorization(!settingsState.editor.bracketPairColorization)}
                  >
                    {settingsState.editor.bracketPairColorization ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Indent Guides</div>
                    <div className="text-xs text-muted-foreground">Show vertical lines at indentation levels</div>
                  </div>
                  <Button
                    variant={settingsState.editor.indentGuides ? "default" : "outline"}
                    size="sm"
                    onClick={() => void updateEditorSetting('indentGuides', !settingsState.editor.indentGuides)}
                  >
                    {settingsState.editor.indentGuides ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Minimap</div>
                    <div className="text-xs text-muted-foreground">Show code overview minimap on the right</div>
                  </div>
                  <Button
                    variant={settingsState.editor.minimapEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setMinimapEnabled(!settingsState.editor.minimapEnabled)}
                  >
                    {settingsState.editor.minimapEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Auto-completion Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Auto-completion</CardTitle>
                <CardDescription>Configure automatic bracket and quote insertion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Auto-close Brackets</div>
                    <div className="text-xs text-muted-foreground">Automatically insert closing brackets</div>
                  </div>
                  <Button
                    variant={settingsState.editor.autoClosingBrackets ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setAutoClosingBrackets(!settingsState.editor.autoClosingBrackets)}
                  >
                    {settingsState.editor.autoClosingBrackets ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Auto-close Quotes</div>
                    <div className="text-xs text-muted-foreground">Automatically insert closing quotes</div>
                  </div>
                  <Button
                    variant={settingsState.editor.autoClosingQuotes ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setAutoClosingQuotes(!settingsState.editor.autoClosingQuotes)}
                  >
                    {settingsState.editor.autoClosingQuotes ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Auto-surround</div>
                    <div className="text-xs text-muted-foreground">Surround selected text with brackets/quotes</div>
                  </div>
                  <Button
                    variant={settingsState.editor.autoSurround ? "default" : "outline"}
                    size="sm"
                    onClick={() => void updateEditorSetting('autoSurround', !settingsState.editor.autoSurround)}
                  >
                    {settingsState.editor.autoSurround ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Font and Tab Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Font and Indentation</CardTitle>
                <CardDescription>Configure editor font size and tab behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Font Size</div>
                    <div className="text-xs text-muted-foreground">Editor font size in pixels</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setEditorFontSize(Math.max(8, settingsState.editor.fontSize - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm">{settingsState.editor.fontSize}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setEditorFontSize(Math.min(32, settingsState.editor.fontSize + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Tab Size</div>
                    <div className="text-xs text-muted-foreground">Number of spaces per tab</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setTabSize(Math.max(1, settingsState.editor.tabSize - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm">{settingsState.editor.tabSize}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setTabSize(Math.min(8, settingsState.editor.tabSize + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Insert Spaces</div>
                    <div className="text-xs text-muted-foreground">Use spaces instead of tabs</div>
                  </div>
                  <Button
                    variant={settingsState.editor.insertSpaces ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setInsertSpaces(!settingsState.editor.insertSpaces)}
                  >
                    {settingsState.editor.insertSpaces ? "Spaces" : "Tabs"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scroll Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Scrolling</CardTitle>
                <CardDescription>Configure scroll behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Smooth Scrolling</div>
                    <div className="text-xs text-muted-foreground">Enable smooth scroll animations</div>
                  </div>
                  <Button
                    variant={settingsState.editor.smoothScrolling ? "default" : "outline"}
                    size="sm"
                    onClick={() => void setSmoothScrolling(!settingsState.editor.smoothScrolling)}
                  >
                    {settingsState.editor.smoothScrolling ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Mouse Wheel Zoom</div>
                    <div className="text-xs text-muted-foreground">Zoom with Ctrl+Mouse Wheel</div>
                  </div>
                  <Button
                    variant={settingsState.editor.mouseWheelZoom ? "default" : "outline"}
                    size="sm"
                    onClick={() => void updateEditorSetting('mouseWheelZoom', !settingsState.editor.mouseWheelZoom)}
                  >
                    {settingsState.editor.mouseWheelZoom ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cursor Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Cursor</CardTitle>
                <CardDescription>Configure cursor appearance and behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Cursor Style</div>
                    <div className="text-xs text-muted-foreground">Shape of the cursor in the editor</div>
                  </div>
                  <Select
                    value={settingsState.editor.cursorStyle}
                    onValueChange={(value) => void updateEditorSetting('cursorStyle', value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                      <SelectItem value="underline">Underline</SelectItem>
                      <SelectItem value="line-thin">Line Thin</SelectItem>
                      <SelectItem value="block-outline">Block Outline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Cursor Blinking</div>
                    <div className="text-xs text-muted-foreground">Cursor blink animation style</div>
                  </div>
                  <Select
                    value={settingsState.editor.cursorBlinking}
                    onValueChange={(value) => void updateEditorSetting('cursorBlinking', value as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blink">Blink</SelectItem>
                      <SelectItem value="smooth">Smooth</SelectItem>
                      <SelectItem value="phase">Phase</SelectItem>
                      <SelectItem value="expand">Expand</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Explorer Settings View */}
        {currentView === "explorer" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Explorer Configuration</CardTitle>
                <CardDescription>
                  Configure file explorer behavior, sorting, filtering, and icon display. For more options, visit{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal text-primary"
                    onClick={() => setCurrentView("advanced")}
                  >
                    All Settings
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {explorerProperties.length > 0 ? (
                  explorerProperties.map(property => renderSettingControl(property))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No explorer settings available. Configure settings in the Advanced view.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
