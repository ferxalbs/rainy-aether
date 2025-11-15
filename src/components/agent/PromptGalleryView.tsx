/**
 * Prompt Gallery View
 *
 * Gallery of pre-configured prompts for common AI tasks
 */

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Star,
  StarOff,
  Trash2,
  Edit,
  Copy,
  Code,
  Bug,
  FileText,
  Wand2,
  MessageSquare,
  Grid3x3,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  usePromptState,
  toggleFavorite,
  deletePrompt,
  type PromptTemplate
} from '@/stores/promptStore';
import { cn } from '@/lib/cn';

interface PromptGalleryViewProps {
  onUsePrompt?: (prompt: PromptTemplate) => void;
  onCreatePrompt?: () => void;
  onEditPrompt?: (prompt: PromptTemplate) => void;
}

export const PromptGalleryView: React.FC<PromptGalleryViewProps> = ({
  onUsePrompt,
  onCreatePrompt,
  onEditPrompt
}) => {
  const promptState = usePromptState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { id: 'all', label: 'All Prompts', icon: Grid3x3 },
    { id: 'coding', label: 'Coding', icon: Code },
    { id: 'debugging', label: 'Debugging', icon: Bug },
    { id: 'documentation', label: 'Documentation', icon: FileText },
    { id: 'refactoring', label: 'Refactoring', icon: Wand2 },
    { id: 'general', label: 'General', icon: MessageSquare },
    { id: 'favorites', label: 'Favorites', icon: Star }
  ];

  const filteredPrompts = useMemo(() => {
    let filtered = promptState.prompts;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter((p) => p.isFavorite);
      } else {
        filtered = filtered.filter((p) => p.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort: favorites first, then by updated date
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [promptState.prompts, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: PromptTemplate['category']) => {
    switch (category) {
      case 'coding':
        return Code;
      case 'debugging':
        return Bug;
      case 'documentation':
        return FileText;
      case 'refactoring':
        return Wand2;
      case 'general':
        return MessageSquare;
      default:
        return MessageSquare;
    }
  };

  const getCategoryColor = (category: PromptTemplate['category']) => {
    switch (category) {
      case 'coding':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'debugging':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'documentation':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'refactoring':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'general':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      await deletePrompt(id);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add toast notification here
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Prompt Gallery</h2>
            <p className="text-sm text-muted-foreground">
              Browse and use pre-configured prompts
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button onClick={onCreatePrompt}>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-48 border-r border-border bg-background p-4">
          <nav className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              const count =
                category.id === 'all'
                  ? promptState.prompts.length
                  : category.id === 'favorites'
                  ? promptState.prompts.filter((p) => p.isFavorite).length
                  : promptState.prompts.filter((p) => p.category === category.id).length;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </div>
                  <Badge variant={isActive ? 'secondary' : 'outline'} className="ml-auto">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Prompts Grid/List */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {filteredPrompts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">No prompts found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Create your first prompt to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={onCreatePrompt}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Prompt
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                    : 'space-y-4'
                )}
              >
                {filteredPrompts.map((prompt) => {
                  const CategoryIcon = getCategoryIcon(prompt.category);

                  return (
                    <Card
                      key={prompt.id}
                      className="group relative transition-all hover:border-primary hover:shadow-md"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'rounded-lg p-2',
                                getCategoryColor(prompt.category)
                              )}
                            >
                              <CategoryIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{prompt.name}</CardTitle>
                              <CardDescription className="mt-1">
                                {prompt.description}
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleToggleFavorite(prompt.id)}
                          >
                            {prompt.isFavorite ? (
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {prompt.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {prompt.content}
                        </p>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => onUsePrompt?.(prompt)}
                          >
                            Use Prompt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(prompt.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditPrompt?.(prompt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(prompt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
