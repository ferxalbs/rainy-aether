import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIDEStore } from "@/stores/ideStore";

import {
  useConfigurationState,
  configurationActions,
} from "@/stores/configurationStore";
import type { ResolvedConfigurationProperty } from "@/types/configuration";

import { StringSetting } from "@/components/configuration/StringSetting";
import { BooleanSetting } from "@/components/configuration/BooleanSetting";
import { EnumSetting } from "@/components/configuration/EnumSetting";
import { ObjectSetting } from "@/components/configuration/ObjectSetting";

import { ConfigurationSettings } from "./ConfigurationSettings";
import { FontSettings } from "@/components/configuration/FontSettings";

import {
  SettingsSidebar,
  type SettingsViewType,
} from "./settings/SettingsSidebar";
import { QuickSettingsView } from "./settings/QuickSettingsView";
import { EditorSettingsView } from "./settings/EditorSettingsView";
import { LSPSettingsView } from "./settings/LSPSettingsView";
import { DynamicSettingsView } from "./settings/DynamicSettingsView";

const SettingsPage = () => {
  const { actions } = useIDEStore();
  const configState = useConfigurationState();
  const [currentView, setCurrentView] = useState<SettingsViewType>("quick");

  // Filter configuration properties by category
  const appearanceProperties = useMemo(
    () =>
      configState.properties.filter(
        (p) => p.key.startsWith("workbench.") || p.key.startsWith("editor."),
      ),
    [configState.properties],
  );

  const explorerProperties = useMemo(
    () =>
      configState.properties.filter(
        (p) => p.key.startsWith("explorer.") || p.key.startsWith("files."),
      ),
    [configState.properties],
  );

  // Handle configuration property changes
  const handlePropertyChange = useCallback(
    async (property: ResolvedConfigurationProperty, newValue: any) => {
      try {
        await configurationActions.set({
          key: property.key,
          value: newValue,
          scope: "user",
        });
      } catch (error: any) {
        console.error("Failed to update configuration:", error);
      }
    },
    [],
  );

  const handlePropertyReset = useCallback(
    async (property: ResolvedConfigurationProperty) => {
      try {
        await configurationActions.reset({ key: property.key, scope: "user" });
      } catch (error: any) {
        console.error("Failed to reset configuration:", error);
      }
    },
    [],
  );

  // Render setting control based on type
  const renderSettingControl = useCallback(
    (property: ResolvedConfigurationProperty) => {
      const value = property.value ?? property.default;

      if (property.enum && property.enum.length > 0) {
        return (
          <EnumSetting
            key={property.key}
            property={property}
            value={value}
            onChange={(newValue) =>
              void handlePropertyChange(property, newValue)
            }
            onReset={() => void handlePropertyReset(property)}
          />
        );
      }

      switch (property.type) {
        case "string":
          return (
            <StringSetting
              key={property.key}
              property={property}
              value={value || ""}
              onChange={(newValue) =>
                void handlePropertyChange(property, newValue)
              }
              onReset={() => void handlePropertyReset(property)}
            />
          );
        case "number":
        case "integer":
          return (
            <StringSetting
              key={property.key}
              property={property}
              value={String(value || 0)}
              onChange={(newValue) =>
                void handlePropertyChange(property, parseFloat(newValue))
              }
              onReset={() => void handlePropertyReset(property)}
            />
          );
        case "boolean":
          return (
            <BooleanSetting
              key={property.key}
              property={property}
              value={value || false}
              onChange={(newValue) =>
                void handlePropertyChange(property, newValue)
              }
              onReset={() => void handlePropertyReset(property)}
            />
          );
        case "object":
          return (
            <ObjectSetting
              key={property.key}
              property={property}
              value={value || {}}
              onChange={(newValue) =>
                void handlePropertyChange(property, newValue)
              }
              onReset={() => void handlePropertyReset(property)}
            />
          );
        default:
          return null;
      }
    },
    [handlePropertyChange, handlePropertyReset],
  );

  // Render full-screen "All Settings" or "Fonts"
  if (currentView === "advanced" || currentView === "fonts") {
    return (
      <div className="flex-1 h-full min-h-0 flex gap-2">
        <SettingsSidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden !bg-background/60 dark:!bg-background/20 backdrop-blur-2xl backdrop-saturate-150 text-foreground">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-border/10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("quick")}
              >
                ← Back
              </Button>
              <h1 className="text-xl font-semibold">
                {currentView === "advanced"
                  ? "Advanced Settings"
                  : "Font Settings"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                onClick={() => actions.openFolderDialog()}
              >
                Open Folder…
              </Button>
              <Button variant="outline" onClick={() => actions.closeSettings()}>
                Back to Editor
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {currentView === "advanced" ? (
              <ConfigurationSettings />
            ) : (
              <FontSettings />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full min-h-0 flex gap-2">
      <SettingsSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden !bg-background/60 dark:!bg-background/20 backdrop-blur-2xl backdrop-saturate-150 text-foreground">
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-border/10">
          <h1 className="text-xl font-semibold">
            {currentView === "quick" && "Quick Settings"}
            {currentView === "appearance" && "Appearance Settings"}
            {currentView === "editor" && "Editor Settings"}
            {currentView === "explorer" && "Explorer Settings"}
            {currentView === "lsp" && "LSP & Binaries"}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => actions.openFolderDialog()}
            >
              Open Folder…
            </Button>
            <Button variant="outline" onClick={() => actions.closeSettings()}>
              Back to Editor
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentView === "quick" && <QuickSettingsView />}

          {currentView === "appearance" && (
            <DynamicSettingsView
              title="Appearance Configuration"
              description="Configure workbench and editor layout, colors, and visibility."
              properties={appearanceProperties}
              renderSettingControl={renderSettingControl}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === "editor" && <EditorSettingsView />}

          {currentView === "explorer" && (
            <DynamicSettingsView
              title="Explorer Configuration"
              description="Configure file explorer behavior, sorting, filtering, and icon display."
              properties={explorerProperties}
              renderSettingControl={renderSettingControl}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === "lsp" && <LSPSettingsView />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
