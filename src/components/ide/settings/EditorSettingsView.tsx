import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSettingsState,
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
} from "@/stores/settingsStore";

export function EditorSettingsView() {
  const settingsState = useSettingsState();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Formatting</CardTitle>
          <CardDescription>
            Configure automatic code formatting options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Format on Save</div>
              <div className="text-xs text-muted-foreground">
                Automatically format code when saving files
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.formatOnSave ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setFormatOnSave(!settingsState.editor.formatOnSave)
              }
            >
              {settingsState.editor.formatOnSave ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Format on Paste</div>
              <div className="text-xs text-muted-foreground">
                Format pasted content automatically
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.formatOnPaste ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void updateEditorSetting(
                  "formatOnPaste",
                  !settingsState.editor.formatOnPaste,
                )
              }
            >
              {settingsState.editor.formatOnPaste ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visual Features</CardTitle>
          <CardDescription>
            Configure visual aids and code highlighting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sticky Scroll</div>
              <div className="text-xs text-muted-foreground">
                Keep function/class headers visible while scrolling
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.stickyScroll ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setStickyScroll(!settingsState.editor.stickyScroll)
              }
            >
              {settingsState.editor.stickyScroll ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                Bracket Pair Colorization
              </div>
              <div className="text-xs text-muted-foreground">
                Colorize matching brackets with different colors
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.bracketPairColorization
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                void setBracketPairColorization(
                  !settingsState.editor.bracketPairColorization,
                )
              }
            >
              {settingsState.editor.bracketPairColorization
                ? "Enabled"
                : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Indent Guides</div>
              <div className="text-xs text-muted-foreground">
                Show vertical lines at indentation levels
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.indentGuides ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void updateEditorSetting(
                  "indentGuides",
                  !settingsState.editor.indentGuides,
                )
              }
            >
              {settingsState.editor.indentGuides ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Minimap</div>
              <div className="text-xs text-muted-foreground">
                Show code overview minimap on the right
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.minimapEnabled ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setMinimapEnabled(!settingsState.editor.minimapEnabled)
              }
            >
              {settingsState.editor.minimapEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-completion</CardTitle>
          <CardDescription>
            Configure automatic bracket and quote insertion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-close Brackets</div>
              <div className="text-xs text-muted-foreground">
                Automatically insert closing brackets
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.autoClosingBrackets ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setAutoClosingBrackets(
                  !settingsState.editor.autoClosingBrackets,
                )
              }
            >
              {settingsState.editor.autoClosingBrackets
                ? "Enabled"
                : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-close Quotes</div>
              <div className="text-xs text-muted-foreground">
                Automatically insert closing quotes
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.autoClosingQuotes ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setAutoClosingQuotes(
                  !settingsState.editor.autoClosingQuotes,
                )
              }
            >
              {settingsState.editor.autoClosingQuotes ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-surround</div>
              <div className="text-xs text-muted-foreground">
                Surround selected text with brackets/quotes
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.autoSurround ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void updateEditorSetting(
                  "autoSurround",
                  !settingsState.editor.autoSurround,
                )
              }
            >
              {settingsState.editor.autoSurround ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Font and Indentation</CardTitle>
          <CardDescription>
            Configure editor font size and tab behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Font Size</div>
              <div className="text-xs text-muted-foreground">
                Editor font size in pixels
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void setEditorFontSize(
                    Math.max(8, settingsState.editor.fontSize - 1),
                  )
                }
              >
                -
              </Button>
              <span className="w-8 text-center text-sm">
                {settingsState.editor.fontSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void setEditorFontSize(
                    Math.min(32, settingsState.editor.fontSize + 1),
                  )
                }
              >
                +
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Tab Size</div>
              <div className="text-xs text-muted-foreground">
                Number of spaces per tab
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void setTabSize(Math.max(1, settingsState.editor.tabSize - 1))
                }
              >
                -
              </Button>
              <span className="w-8 text-center text-sm">
                {settingsState.editor.tabSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void setTabSize(Math.min(8, settingsState.editor.tabSize + 1))
                }
              >
                +
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Insert Spaces</div>
              <div className="text-xs text-muted-foreground">
                Use spaces instead of tabs
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.insertSpaces ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setInsertSpaces(!settingsState.editor.insertSpaces)
              }
            >
              {settingsState.editor.insertSpaces ? "Spaces" : "Tabs"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scrolling</CardTitle>
          <CardDescription>Configure scroll behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Smooth Scrolling</div>
              <div className="text-xs text-muted-foreground">
                Enable smooth scroll animations
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.smoothScrolling ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void setSmoothScrolling(!settingsState.editor.smoothScrolling)
              }
            >
              {settingsState.editor.smoothScrolling ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Mouse Wheel Zoom</div>
              <div className="text-xs text-muted-foreground">
                Zoom with Ctrl+Mouse Wheel
              </div>
            </div>
            <Button
              variant={
                settingsState.editor.mouseWheelZoom ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                void updateEditorSetting(
                  "mouseWheelZoom",
                  !settingsState.editor.mouseWheelZoom,
                )
              }
            >
              {settingsState.editor.mouseWheelZoom ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cursor</CardTitle>
          <CardDescription>
            Configure cursor appearance and behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Cursor Style</div>
              <div className="text-xs text-muted-foreground">
                Shape of the cursor in the editor
              </div>
            </div>
            <Select
              value={settingsState.editor.cursorStyle}
              onValueChange={(value) =>
                void updateEditorSetting("cursorStyle", value as any)
              }
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
              <div className="text-xs text-muted-foreground">
                Cursor blink animation style
              </div>
            </div>
            <Select
              value={settingsState.editor.cursorBlinking}
              onValueChange={(value) =>
                void updateEditorSetting("cursorBlinking", value as any)
              }
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
  );
}
