import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  FolderOpen,
  File,
  GitBranch,
  Settings,
  Terminal as TerminalIcon,
  Search,
  Puzzle,
  BookOpen,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useIDEStore } from "../../stores/ideStore";
import { getAppVersion } from "../../utils/version";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import CloneDialog from "./CloneDialog";

const StartupPage: React.FC = () => {
  const { state, actions } = useIDEStore();
  const [appVersion, setAppVersion] = useState("0.x.0");
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentQuery, setRecentQuery] = useState("");
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const version = await getAppVersion();
        if (isMounted) {
          setAppVersion(version);
        }
      } catch (error) {
        console.error("Failed to load app version:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const recentWorkspaces = state().recentWorkspaces;

  const filteredWorkspaces = useMemo(() => {
    const needle = recentQuery.toLowerCase();
    return recentWorkspaces.filter(
      (workspace) =>
        workspace.name.toLowerCase().includes(needle) || workspace.path.toLowerCase().includes(needle),
    );
  }, [recentQuery, recentWorkspaces]);

  const handleRecentSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRecentQuery(event.target.value);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setRecentOpen(false);
  }, []);

  const handleOpenRecent = useCallback(
    (workspace: (typeof recentWorkspaces)[number]) => {
      actions.openRecentWorkspace(workspace);
      setRecentOpen(false);
    },
    [actions, recentWorkspaces],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-8 pt-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-2 text-primary">Rainy Coder</h1>
          <p className="text-xl text-muted-foreground">Editing evolved</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Start Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Zap size={24} className="text-primary" />
              Start
            </h2>

            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start h-12 text-left" onClick={actions.createNewFile}>
                <FileText size={20} className="mr-3" />
                <div>
                  <div className="font-medium">New File</div>
                  <div className="text-sm text-muted-foreground">Create a new file</div>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-left"
                onClick={actions.openFolderDialog}
              >
                <File size={20} className="mr-3" />
                <div>
                  <div className="font-medium">Open File...</div>
                  <div className="text-sm text-muted-foreground">Open an existing file</div>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-left"
                onClick={actions.openFolderDialog}
              >
                <FolderOpen size={20} className="mr-3" />
                <div>
                  <div className="font-medium">Open Folder...</div>
                  <div className="text-sm text-muted-foreground">Open a folder as workspace</div>
                </div>
              </Button>

              <Button variant="ghost" className="w-full justify-start h-12 text-left" onClick={() => setIsCloneDialogOpen(true)}>
                <GitBranch size={20} className="mr-3" />
                <div>
                  <div className="font-medium">Clone Git Repository...</div>
                  <div className="text-sm text-muted-foreground">Clone from a Git repository</div>
                </div>
              </Button>

              <Button variant="ghost" className="w-full justify-start h-12 text-left" onClick={actions.openTerminal}>
                <TerminalIcon size={20} className="mr-3" />
                <div>
                  <div className="font-medium">Open Terminal</div>
                  <div className="text-sm text-muted-foreground">Open integrated terminal</div>
                </div>
              </Button>

              <Button variant="ghost" className="w-full justify-start h-12 text-left" onClick={actions.openSettings}>
                <Settings size={20} className="mr-3" />
                <div>
                  <div className="font-medium">Settings</div>
                  <div className="text-sm text-muted-foreground">Configure editor settings</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Recent Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <BookOpen size={24} className="text-primary" />
              Recent
            </h2>

            {recentWorkspaces.length > 0 ? (
              <>
                <div className="space-y-2">
                  {recentWorkspaces.map((project) => (
                    <Button
                      key={project.path}
                      variant="ghost"
                      className="w-full justify-start h-12 text-left"
                      onClick={() => actions.openRecentWorkspace(project)}
                    >
                      <FolderOpen size={20} className="mr-3" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{project.name}</div>
                        <div className="text-sm truncate text-muted-foreground">{project.path}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="mt-8">
                  <Button variant="outline" className="w-full" onClick={() => setRecentOpen(true)}>
                    More...
                  </Button>
                </div>

                <Dialog open={recentOpen} onOpenChange={setRecentOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recent Workspaces</DialogTitle>
                      <DialogDescription>Browse, open, or clear your recent projects.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Search by name or path"
                        value={recentQuery}
                        onChange={handleRecentSearch}
                      />

                      {filteredWorkspaces.length > 0 ? (
                        <div className="max-h-64 overflow-auto space-y-2">
                          {filteredWorkspaces.map((workspace) => (
                            <Button
                              key={workspace.path}
                              variant="ghost"
                              className="w-full justify-start h-12 text-left"
                              onClick={() => handleOpenRecent(workspace)}
                            >
                              <FolderOpen size={20} className="mr-3" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{workspace.name}</div>
                                <div className="text-sm truncate text-muted-foreground">{workspace.path}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No matching workspaces.</div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={handleCloseDialog}>
                          Close
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            actions.clearRecentWorkspaces();
                            setRecentOpen(false);
                          }}
                        >
                          Clear Recently Opened
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No recent workspaces yet.</div>
            )}
          </div>
        </div>

        {/* Walkthroughs Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Search size={24} className="text-primary" />
            Walkthroughs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <CardTitle className="text-base">Get Started with Rainy Coder</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>Customize your editor, learn the basics, and start coding</CardDescription>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-secondary text-secondary-foreground flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <CardTitle className="text-base">Learn the Fundamentals</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>Master keyboard shortcuts and essential features</CardDescription>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
                    <Puzzle size={16} />
                  </div>
                  <CardTitle className="text-base">Boost your Productivity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>Discover advanced features and productivity tips</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">© {currentYear} Enosis Labs, Inc.</div>
          <div className="text-sm text-muted-foreground">Version {appVersion}</div>
        </div>
      </div>

      <CloneDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        onSuccess={(path) => {
          setIsCloneDialogOpen(false);
          actions.loadWorkspace({ name: path.split(/[/\\]/).pop() || path, path, type: "folder" });
        }}
      />
    </div>
  );
};

export default StartupPage;
