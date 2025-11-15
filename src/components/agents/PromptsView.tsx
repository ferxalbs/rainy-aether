import { useState } from 'react';
import {
  SearchIcon,
  PlusIcon,
  CodeIcon,
  BugIcon,
  SparklesIcon,
  FileCodeIcon,
  TerminalIcon,
  BookOpenIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  PencilIcon,
  Trash2Icon,
  CopyIcon,
  StarIcon,
  MoreVerticalIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';

interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'code' | 'debug' | 'review' | 'refactor' | 'documentation' | 'testing' | 'optimization' | 'security';
  isFavorite: boolean;
  tags: string[];
  createdAt: Date;
}

const categoryIcons = {
  code: CodeIcon,
  debug: BugIcon,
  review: SparklesIcon,
  refactor: FileCodeIcon,
  documentation: BookOpenIcon,
  testing: TerminalIcon,
  optimization: TrendingUpIcon,
  security: ShieldCheckIcon,
};

const categoryColors = {
  code: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  debug: 'bg-red-500/10 text-red-500 border-red-500/20',
  review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  refactor: 'bg-green-500/10 text-green-500 border-green-500/20',
  documentation: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  testing: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  optimization: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  security: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

const defaultPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Code Review Assistant',
    description: 'Review code for best practices, bugs, and improvements',
    content: 'You are an expert code reviewer. Analyze the following code for:\n- Code quality and best practices\n- Potential bugs and edge cases\n- Performance improvements\n- Security vulnerabilities\n- Maintainability and readability\n\nProvide specific suggestions with examples.',
    category: 'review',
    isFavorite: true,
    tags: ['code-review', 'best-practices', 'quality'],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Debug Helper',
    description: 'Help identify and fix bugs in code',
    content: 'You are a debugging expert. Help me understand and fix the following issue:\n- Analyze the error message and stack trace\n- Identify the root cause\n- Suggest specific fixes\n- Explain why the bug occurred\n- Provide preventive measures',
    category: 'debug',
    isFavorite: true,
    tags: ['debugging', 'troubleshooting', 'errors'],
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    title: 'Component Generator',
    description: 'Generate React components with TypeScript',
    content: 'You are a React expert. Generate a production-ready React component with:\n- TypeScript types and interfaces\n- Proper component structure\n- JSDoc documentation\n- Accessibility features\n- Responsive design\n- Error handling',
    category: 'code',
    isFavorite: false,
    tags: ['react', 'typescript', 'components'],
    createdAt: new Date('2024-01-13'),
  },
  {
    id: '4',
    title: 'Refactoring Guide',
    description: 'Refactor code for better maintainability',
    content: 'You are a refactoring expert. Analyze and refactor the following code:\n- Apply SOLID principles\n- Improve naming conventions\n- Extract reusable functions\n- Reduce complexity\n- Enhance testability\n- Maintain functionality',
    category: 'refactor',
    isFavorite: false,
    tags: ['refactoring', 'clean-code', 'maintainability'],
    createdAt: new Date('2024-01-12'),
  },
  {
    id: '5',
    title: 'Documentation Writer',
    description: 'Generate comprehensive documentation',
    content: 'You are a technical writer. Create clear documentation for:\n- API endpoints and usage\n- Function parameters and return values\n- Code examples\n- Common use cases\n- Troubleshooting tips\n- Best practices',
    category: 'documentation',
    isFavorite: true,
    tags: ['documentation', 'technical-writing', 'api'],
    createdAt: new Date('2024-01-11'),
  },
  {
    id: '6',
    title: 'Test Case Generator',
    description: 'Create unit and integration tests',
    content: 'You are a testing expert. Generate comprehensive tests:\n- Unit tests for functions\n- Integration tests for features\n- Edge cases and error scenarios\n- Mocking and fixtures\n- Test descriptions\n- Code coverage considerations',
    category: 'testing',
    isFavorite: false,
    tags: ['testing', 'unit-tests', 'quality-assurance'],
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '7',
    title: 'Performance Optimizer',
    description: 'Optimize code for better performance',
    content: 'You are a performance optimization expert. Analyze and improve:\n- Algorithmic complexity\n- Memory usage\n- Bundle size\n- Rendering performance\n- Network requests\n- Caching strategies',
    category: 'optimization',
    isFavorite: false,
    tags: ['performance', 'optimization', 'efficiency'],
    createdAt: new Date('2024-01-09'),
  },
  {
    id: '8',
    title: 'Security Auditor',
    description: 'Identify security vulnerabilities',
    content: 'You are a security expert. Audit the code for:\n- XSS vulnerabilities\n- SQL injection risks\n- Authentication issues\n- Authorization flaws\n- Data validation\n- Secure coding practices',
    category: 'security',
    isFavorite: true,
    tags: ['security', 'vulnerabilities', 'audit'],
    createdAt: new Date('2024-01-08'),
  },
];

/**
 * PromptCard component for displaying individual prompts
 */
function PromptCard({ prompt, onUse }: { prompt: Prompt; onUse: (prompt: Prompt) => void }) {
  const Icon = categoryIcons[prompt.category];
  const categoryColor = categoryColors[prompt.category];

  return (
    <Card className="group hover:shadow-md transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn('size-10 rounded-lg flex items-center justify-center', categoryColor)}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{prompt.title}</CardTitle>
              <CardDescription className="text-xs mt-1 truncate">
                {prompt.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {prompt.isFavorite && (
              <StarIcon className="size-4 fill-yellow-500 text-yellow-500" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVerticalIcon className="size-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <CopyIcon className="size-4 text-muted-foreground" />
                  <span>Copy Prompt</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PencilIcon className="size-4 text-muted-foreground" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <StarIcon className="size-4 text-muted-foreground" />
                  <span>{prompt.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2Icon className="size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {prompt.content}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {prompt.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {prompt.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{prompt.tags.length - 3}
            </Badge>
          )}
        </div>
        <Button
          onClick={() => onUse(prompt)}
          className="w-full"
          size="sm"
        >
          Use Prompt
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Prompts view component - library of pre-configured AI prompts
 *
 * Displays a searchable gallery of prompt templates that users can browse, favorite,
 * and use to configure the AI assistant for specific tasks. Supports categories,
 * tags, and custom prompt creation.
 *
 * @returns The prompts library view
 */
export function PromptsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [prompts] = useState<Prompt[]>(defaultPrompts);

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || prompt.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const favoritePrompts = filteredPrompts.filter(p => p.isFavorite);
  const otherPrompts = filteredPrompts.filter(p => !p.isFavorite);

  const handleUsePrompt = (prompt: Prompt) => {
    console.log('Using prompt:', prompt.title);
    // TODO: Implement prompt usage - could copy to clipboard or load into chat
  };

  const categories = Object.keys(categoryIcons) as Array<keyof typeof categoryIcons>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Prompt Library</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Pre-configured AI prompts for common tasks
              </p>
            </div>
            <Button className="gap-2">
              <PlusIcon className="size-4" />
              New Prompt
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="size-4" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
        <div className="p-6 space-y-8">
          {/* Favorites */}
          {favoritePrompts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StarIcon className="size-5 fill-yellow-500 text-yellow-500" />
                <h2 className="text-lg font-semibold text-foreground">Favorites</h2>
                <Badge variant="secondary">{favoritePrompts.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritePrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} onUse={handleUsePrompt} />
                ))}
              </div>
            </div>
          )}

          {/* All Prompts */}
          {otherPrompts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Prompts` : 'All Prompts'}
                </h2>
                <Badge variant="secondary">{otherPrompts.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherPrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} onUse={handleUsePrompt} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredPrompts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <SearchIcon className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No prompts found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Try adjusting your search or filters, or create a new prompt to get started.
              </p>
              <Button className="mt-6 gap-2">
                <PlusIcon className="size-4" />
                Create New Prompt
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
