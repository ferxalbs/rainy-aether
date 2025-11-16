import { useState } from 'react';
import {
  SearchIcon,
  HomeIcon,
  SparklesIcon,
  FileStackIcon,
  ZapIcon,
  MessageCircleDashedIcon,
  WandSparklesIcon,
  BoxIcon,
  ChevronDownIcon,
  UsersIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  CheckIcon,
  MoreVerticalIcon,
  Share2Icon,
  PencilIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  Trash2Icon,
  PlusIcon,
  BotIcon,
  Columns2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';
import { useChatStore, useChatActions } from '@/stores/chatStore';
import { useAgentNavigationState, useAgentNavigationActions } from '@/stores/agentNavigationStore';
import { useAgents } from '@/hooks/useAgents';
import { AgentSelector } from './AgentSelector';
import { cn } from '@/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const iconMap = {
  zap: ZapIcon,
  'message-circle-dashed': MessageCircleDashedIcon,
  'wand-sparkles': WandSparklesIcon,
  box: BoxIcon,
};

const teams = [
  { id: 'personal', name: 'Personal', icon: UsersIcon },
  { id: 'work', name: 'Work Team', icon: BriefcaseIcon },
  { id: 'education', name: 'Education', icon: GraduationCapIcon },
];

/**
 * Render the chat sidebar with a team selector, new chat button, search input, quick navigation, and lists of recent and archived chats.
 *
 * The sidebar displays non-archived chats under "Recent" and archived chats under "Archived", highlights the currently selected chat, and provides per-chat actions for share, rename, archive/unarchive, and delete. Team selection updates local UI state; clicking a chat selects it; dedicated controls trigger creating, archiving, unarchiving, and deleting chats.
 *
 * @returns The React element for the chat sidebar containing the header/team selector, top actions, searchable chat lists, and footer branding.
 */
export function ChatSidebar() {
  const { chats, selectedChatId } = useChatStore();
  const { selectChat, archiveChat, unarchiveChat, deleteChat, createNewChat } = useChatActions();
  const { currentView } = useAgentNavigationState();
  const { setView } = useAgentNavigationActions();
  const { selectedAgentId, selectAgent } = useAgents();
  const [selectedTeam, setSelectedTeam] = useState('personal');
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const recentChats = chats.filter((chat) => !chat.isArchived);
  const archivedChats = chats.filter((chat) => chat.isArchived);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 px-2 h-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="size-6 rounded-md bg-primary flex items-center justify-center">
                <Logo className="size-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Rainy AI</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-primary" />
                <ChevronDownIcon className="size-3.5" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {teams.map((team) => {
              const TeamIcon = team.icon;
              const isSelected = selectedTeam === team.id;
              return (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className="gap-2 cursor-pointer"
                >
                  <TeamIcon className="size-4" />
                  <span className="flex-1">{team.name}</span>
                  {isSelected && <CheckIcon className="size-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <div className="size-4 rounded-full bg-primary" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-3 space-y-2">
        <Button
          onClick={createNewChat}
          className="w-full justify-start gap-2 h-9"
          variant="default"
        >
          <PlusIcon className="size-4" />
          <span className="text-sm font-medium">New Chat</span>
        </Button>

        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-9 pr-10 h-8 bg-muted text-sm"
          />
          <div className="absolute right-2 flex items-center justify-center size-5 rounded bg-background text-xs text-muted-foreground font-medium border border-border">
            /
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentView === 'home' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setView('home')}
        >
          <HomeIcon className="size-4" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentView === 'ask-ai' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setView('ask-ai')}
        >
          <SparklesIcon className="size-4" />
          <span className="text-xs font-medium">Ask AI</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentView === 'prompts' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setView('prompts')}
        >
          <FileStackIcon className="size-4" />
          <span className="text-xs font-medium">Prompts</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentView === 'abby' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setView('abby')}
        >
          <SparklesIcon className="size-4" />
          <span className="text-xs font-medium">Abby Mode</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            currentView === 'split-view' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setView('split-view')}
        >
          <Columns2Icon className="size-4" />
          <span className="text-xs font-medium">Split View</span>
        </Button>
      </div>

      {/* Agents Section */}
      <div className="px-3 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            showAgentSelector && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          onClick={() => setShowAgentSelector(!showAgentSelector)}
        >
          <BotIcon className="size-4" />
          <span className="text-xs font-medium">Agents</span>
        </Button>
      </div>

      {/* Agent Selector Collapsible Section */}
      {showAgentSelector && (
        <>
          <Separator />
          <div className="px-1 py-2">
            <AgentSelector
              selectedAgentId={selectedAgentId}
              onSelectAgent={selectAgent}
              compact
            />
          </div>
        </>
      )}

      <Separator />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
        <div className="p-3 space-y-4">
          <div className="space-y-1">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent
              </p>
            </div>
            {recentChats.map((chat) => {
              const Icon =
                iconMap[chat.icon as keyof typeof iconMap] ||
                MessageCircleDashedIcon;
              const isActive = selectedChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  className={cn(
                    'group/item relative flex items-center rounded-md overflow-hidden',
                    isActive && 'bg-sidebar-accent'
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8 text-sidebar-foreground',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent'
                    )}
                    onClick={() => selectChat(chat.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="text-sm truncate min-w-0">
                      {chat.title}
                    </span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreVerticalIcon className="size-4" />
                        <span className="sr-only">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-48"
                      side="right"
                      align="start"
                    >
                      <DropdownMenuItem>
                        <Share2Icon className="size-4 text-muted-foreground" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PencilIcon className="size-4 text-muted-foreground" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveChat(chat.id)}>
                        <ArchiveIcon className="size-4 text-muted-foreground" />
                        <span>Archive</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteChat(chat.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Archived
              </p>
            </div>
            {archivedChats.map((chat) => {
              const Icon =
                iconMap[chat.icon as keyof typeof iconMap] ||
                MessageCircleDashedIcon;
              const isActive = selectedChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  className={cn(
                    'group/item relative flex items-center rounded-md overflow-hidden',
                    isActive && 'bg-sidebar-accent'
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8 text-sidebar-foreground',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent'
                    )}
                    onClick={() => selectChat(chat.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="text-sm truncate min-w-0">
                      {chat.title}
                    </span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreVerticalIcon className="size-4" />
                        <span className="sr-only">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-48"
                      side="right"
                      align="start"
                    >
                      <DropdownMenuItem>
                        <Share2Icon className="size-4 text-muted-foreground" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PencilIcon className="size-4 text-muted-foreground" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => unarchiveChat(chat.id)}>
                        <ArchiveRestoreIcon className="size-4 text-muted-foreground" />
                        <span>Unarchive</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteChat(chat.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="size-4 rounded-full bg-primary flex items-center justify-center">
            <WandSparklesIcon className="size-2.5 text-primary-foreground" />
          </div>
          <span>Powered by Rainy AI</span>
        </div>
      </div>
    </div>
  );
}