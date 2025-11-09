import React from 'react';
import {
  useSettingsState,
  setShowCurrentProblemInStatus,
  setProblemsSortOrder,
  setProblemsAutoReveal,
  ProblemsSortOrder,
} from '../../stores/settingsStore';
import { cn } from '@/lib/cn';

/**
 * Problems Settings UI Component
 * Provides configuration options for the Problems panel
 */
export const ProblemsSettings: React.FC = () => {
  const settings = useSettingsState();

  const handleShowCurrentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setShowCurrentProblemInStatus(e.target.checked);
  };

  const handleSortOrderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await setProblemsSortOrder(e.target.value as ProblemsSortOrder);
  };

  const handleAutoRevealChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setProblemsAutoReveal(e.target.checked);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Problems Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how problems are displayed and handled in the editor
        </p>
      </div>

      {/* Show Current Problem in Status Bar */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.problems.showCurrentInStatus}
            onChange={handleShowCurrentChange}
            className={cn(
              "w-4 h-4 rounded border-2 cursor-pointer",
              "focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            )}
          />
          <div className="flex flex-col">
            <span className="font-medium">Show Current Problem in Status Bar</span>
            <span className="text-sm text-muted-foreground">
              Display the problem at the current cursor position in the status bar
            </span>
          </div>
        </label>
      </div>

      {/* Sort Order */}
      <div className="flex flex-col gap-2">
        <label htmlFor="sort-order" className="font-medium">
          Sort Order
        </label>
        <select
          id="sort-order"
          value={settings.problems.sortOrder}
          onChange={handleSortOrderChange}
          className={cn(
            "px-3 py-2 rounded border bg-background",
            "focus:ring-2 focus:ring-offset-2 focus:ring-primary",
            "cursor-pointer"
          )}
        >
          <option value="severity">By Severity (Errors First)</option>
          <option value="position">By Position (Top to Bottom)</option>
          <option value="name">By File Name</option>
        </select>
        <span className="text-sm text-muted-foreground">
          How problems are sorted in the Problems panel
        </span>
      </div>

      {/* Auto Reveal */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.problems.autoReveal}
            onChange={handleAutoRevealChange}
            className={cn(
              "w-4 h-4 rounded border-2 cursor-pointer",
              "focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            )}
          />
          <div className="flex flex-col">
            <span className="font-medium">Auto Reveal in Problems Panel</span>
            <span className="text-sm text-muted-foreground">
              Automatically scroll to and highlight the problem when cursor moves to it
            </span>
          </div>
        </label>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 rounded bg-muted/50 border">
        <p className="text-sm">
          <strong>Note:</strong> These settings affect how problems are displayed throughout the IDE.
          Changes are saved automatically.
        </p>
      </div>
    </div>
  );
};

export default ProblemsSettings;
