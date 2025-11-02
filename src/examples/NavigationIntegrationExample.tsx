/**
 * Example integration of Monaco navigation features and diagnostic system
 * This file demonstrates how to integrate all the new features into your IDE
 */

import React, { useState } from 'react';
import MonacoEditor from '../components/ide/MonacoEditor';
import Breadcrumbs from '../components/ide/Breadcrumbs';
import StatusBar from '../components/ide/StatusBar';
import ProblemsPanel from '../components/ide/ProblemsPanel';
import { editorState } from '../stores/editorStore';
import { cn } from '../lib/cn';

const NavigationIntegrationExample: React.FC = () => {
  const [showProblems, setShowProblems] = useState(false);
  const [code, setCode] = useState(`// Try these features:
// 1. Type some code and watch breadcrumbs update
// 2. Create syntax errors to see diagnostics
// 3. Use F12 on a symbol to go to definition
// 4. Use Shift+F12 to find references
// 5. Use F2 to rename a symbol

interface User {
  name: string;
  age: number;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(name: string): User | undefined {
    return this.users.find(u => u.name === name);
  }

  getAllUsers(): User[] {
    return this.users;
  }
}

const service = new UserService();
service.addUser({ name: 'John', age: 30 });
const john = service.getUser('John');
console.log(john);
`);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top toolbar with breadcrumbs */}
      <div className="border-b border-border">
        <Breadcrumbs 
          editor={editorState.view} 
          className="h-8"
        />
      </div>

      {/* Main editor area */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={code}
          language="javascript"
          onChange={(value) => setCode(value)}
        />
      </div>

      {/* Problems panel (toggleable) */}
      {showProblems && (
        <div className="h-64 border-t border-border">
          <ProblemsPanel 
            onClose={() => setShowProblems(false)}
          />
        </div>
      )}

      {/* Status bar with problem counts */}
      <StatusBar />

      {/* Floating action button to toggle problems panel */}
      <button
        onClick={() => setShowProblems(!showProblems)}
        className={cn(
          "fixed bottom-20 right-4 px-4 py-2 rounded-lg shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "transition-all duration-200"
        )}
      >
        {showProblems ? 'Hide' : 'Show'} Problems
      </button>

      {/* Keyboard shortcuts help */}
      <div className="fixed top-4 right-4 p-4 bg-muted rounded-lg shadow-lg text-xs max-w-xs">
        <h4 className="font-semibold mb-2">Navigation Shortcuts</h4>
        <ul className="space-y-1 text-muted-foreground">
          <li><kbd>F12</kbd> - Go to Definition</li>
          <li><kbd>Alt+F12</kbd> - Peek Definition</li>
          <li><kbd>Shift+F12</kbd> - Find References</li>
          <li><kbd>F2</kbd> - Rename Symbol</li>
          <li><kbd>Ctrl+Shift+O</kbd> - Show Outline</li>
          <li><kbd>Shift+Alt+F</kbd> - Format Document</li>
          <li><kbd>Ctrl+/</kbd> - Toggle Comment</li>
        </ul>
      </div>
    </div>
  );
};

export default NavigationIntegrationExample;
