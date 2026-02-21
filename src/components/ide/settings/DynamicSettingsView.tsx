import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ResolvedConfigurationProperty } from "@/types/configuration";
import type { SettingsViewType } from "./SettingsSidebar";

interface DynamicSettingsViewProps {
  title: string;
  description: string;
  properties: ResolvedConfigurationProperty[];
  renderSettingControl: (
    prop: ResolvedConfigurationProperty,
  ) => React.ReactNode;
  setCurrentView: (view: SettingsViewType) => void;
}

export function DynamicSettingsView({
  title,
  description,
  properties,
  renderSettingControl,
  setCurrentView,
}: DynamicSettingsViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}{" "}
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
          {properties.length > 0 ? (
            properties.map((property) => renderSettingControl(property))
          ) : (
            <p className="text-sm text-muted-foreground">
              No settings available here. Configure settings in the Advanced
              view.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
