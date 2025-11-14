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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';
import { useChatStore, useChatActions } from '@/stores/chatStore';
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
  const [selectedTeam, setSelectedTeam] = useState('personal');

  const recentChats = chats.filter((chat) => !chat.isArchived);
  const archivedChats = chats.filter((chat) => chat.isArchived);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar/80 to-transparent backdrop-blur-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 px-2 h-10 hover:bg-sidebar-accent/50 transition-all duration-200"
            >
              <div className="size-6 rounded-md bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
                <Logo className="size-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Rainy AI</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm border border-white/10" />
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 backdrop-blur-xl bg-background/95 border-border/50">
            {teams.map((team) => {
              const TeamIcon = team.icon;
              const isSelected = selectedTeam === team.id;
              return (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className="gap-2 cursor-pointer transition-colors"
                >
                  <TeamIcon className="size-4" />
                  <span className="flex-1">{team.name}</span>
                  {isSelected && <CheckIcon className="size-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <div className="size-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-3 space-y-2">
        <Button
          onClick={createNewChat}
          className="w-full justify-start gap-2 h-9 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm transition-all duration-200 hover:shadow-md"
          variant="default"
        >
          <PlusIcon className="size-4" />
          <span className="text-sm font-medium">New Chat</span>
        </Button>

        <div className="relative flex items-center group">
          <SearchIcon className="absolute left-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search chats..."
            className="pl-9 pr-10 h-8 bg-muted/20 backdrop-blur-sm border-border/30 focus-visible:border-primary/50 focus-visible:bg-background/50 text-sm transition-all duration-200"
          />
          <div className="absolute right-2 flex items-center justify-center size-5 rounded bg-muted/30 backdrop-blur-sm text-xs text-muted-foreground font-medium border border-border/30">
            /
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-0.5">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150">
          <HomeIcon className="size-4" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150">
          <SparklesIcon className="size-4" />
          <span className="text-xs font-medium">Ask AI</span>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 h-8 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150">
          <FileStackIcon className="size-4" />
          <span className="text-xs font-medium">Prompts</span>
        </Button>
      </div>

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
                    'group/item relative flex items-center rounded-lg overflow-hidden transition-all duration-150',
                    isActive && 'bg-sidebar-accent/70 shadow-sm'
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8 transition-all duration-150',
                      isActive ? 'hover:bg-sidebar-accent/70' : 'hover:bg-accent/50'
                    )}
                    onClick={() => selectChat(chat.id)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate min-w-0 font-medium">
                      {chat.title}
                    </span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-all duration-200 hover:bg-accent"
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
                    'group/item relative flex items-center rounded-lg overflow-hidden transition-all duration-150',
                    isActive && 'bg-sidebar-accent/70 shadow-sm'
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8 transition-all duration-150',
                      isActive ? 'hover:bg-sidebar-accent/70' : 'hover:bg-accent/50'
                    )}
                    onClick={() => selectChat(chat.id)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate min-w-0 font-medium">
                      {chat.title}
                    </span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-all duration-200 hover:bg-accent"
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

      <div className="p-3 border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar/50 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <div className="size-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <WandSparklesIcon className="size-2.5 text-white" />
            </div>
            <span className="font-medium">Powered by Rainy AI</span>
          </span>
        </div>
      </div>
    </div>
  );
}