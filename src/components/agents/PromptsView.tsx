import { useState } from 'react';
import {
  SearchIcon,
  CodeIcon,
  BugIcon,
  SparklesIcon,
  FileCodeIcon,
  BookOpenIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  StarIcon,
  FilterIcon,
  CheckIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  testing: CheckCircleIcon,
  optimization: TrendingUpIcon,
  security: ShieldCheckIcon,
};

const categoryColors = {
  code: 'bg-blue-500/10 text-blue-500',
  debug: 'bg-red-500/10 text-red-500',
  review: 'bg-purple-500/10 text-purple-500',
  refactor: 'bg-green-500/10 text-green-500',
  documentation: 'bg-yellow-500/10 text-yellow-500',
  testing: 'bg-pink-500/10 text-pink-500',
  optimization: 'bg-orange-500/10 text-orange-500',
  security: 'bg-cyan-500/10 text-cyan-500',
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Trigger onUse when Enter or Space is pressed
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent default Space scrolling behavior
      onUse(prompt);
    }
  };

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-0.5 bg-card/50 backdrop-blur-sm border-border/50 min-h-[120px]"
      onClick={() => onUse(prompt)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Use prompt: ${prompt.title}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn('size-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mt-0.5', categoryColor)}>
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <CardTitle className="text-base leading-tight line-clamp-2 min-h-10 group-hover:text-primary transition-colors duration-200">
                {prompt.title}
              </CardTitle>
              {prompt.isFavorite && (
                <StarIcon className="size-4 fill-yellow-500 text-yellow-500 shrink-0 mt-0.5" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {prompt.description}
        </CardDescription>
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [prompts] = useState<Prompt[]>(defaultPrompts);

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      searchQuery === '' ||
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(prompt.category);
    const matchesFavorite = !showFavoritesOnly || prompt.isFavorite;

    return matchesSearch && matchesCategory && matchesFavorite;
  });

  const handleUsePrompt = (prompt: Prompt) => {
    console.log('Using prompt:', prompt.title);
    // TODO: Implement prompt usage - could copy to clipboard or load into chat
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categories = Object.keys(categoryIcons) as Array<keyof typeof categoryIcons>;
  const favoriteCount = prompts.filter(p => p.isFavorite).length;
  const activeFiltersCount = selectedCategories.length + (showFavoritesOnly ? 1 : 0);

  return (
    <div className="flex h-full flex-col relative">
      {/* Prompts content area with proper padding and overflow handling */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent px-4 md:px-8 py-6">
        <div className="w-full max-w-7xl mx-auto space-y-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Prompt Library</h1>
              <p className="text-muted-foreground">Pre-configured prompts for common coding tasks</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FilterIcon className="size-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs h-5 min-w-5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                  checked={showFavoritesOnly}
                  onCheckedChange={setShowFavoritesOnly}
                >
                  <StarIcon className="size-4 mr-2 fill-yellow-500 text-yellow-500" />
                  Favorites ({favoriteCount})
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Categories</DropdownMenuLabel>

                {categories.map((category) => {
                  const Icon = categoryIcons[category];
                  return (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    >
                      <Icon className="size-4 mr-2" />
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Active filters summary */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="size-4" />
              <span>
                Showing {filteredPrompts.length} of {prompts.length} prompts
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs ml-2"
                onClick={() => {
                  setSelectedCategories([]);
                  setShowFavoritesOnly(false);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Prompts Grid */}
        {filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} onUse={handleUsePrompt} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <SearchIcon className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No prompts found</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your search or filters to find what you need.'
                : 'Get started by creating your first custom prompt.'}
            </p>
            {(searchQuery || activeFiltersCount > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategories([]);
                  setShowFavoritesOnly(false);
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Pro Tip */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              Pro Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click on any prompt card to use it immediately. Favorite prompts appear at the top for quick access.
              Use filters to quickly find prompts by category or search for specific keywords.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
