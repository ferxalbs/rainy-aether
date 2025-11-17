import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Lightbulb, Code } from 'lucide-react';

export function AbbyView() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="size-8 text-purple-500" />
        <div>
          <h1 className="text-xl font-bold">Abby Agent (Mockup)</h1>
          <p className="text-sm text-muted-foreground">
            Creative assistant for design and prototyping
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <Lightbulb className="mx-auto size-8 text-yellow-500 mb-2" />
          <h3 className="font-semibold">Ideas</h3>
          <p className="text-sm text-muted-foreground">Generate creative ideas</p>
          <Button disabled size="sm" className="mt-2 opacity-50">
            Generate (Mockup)
          </Button>
        </div>

        <div className="p-4 rounded-lg border bg-card text-center">
          <Code className="mx-auto size-8 text-blue-500 mb-2" />
          <h3 className="font-semibold">Prototyping</h3>
          <p className="text-sm text-muted-foreground">Rapid prototyping tools</p>
          <Button disabled size="sm" className="mt-2 opacity-50">
            Prototype (Mockup)
          </Button>
        </div>

        <div className="p-4 rounded-lg border bg-card text-center">
          <Sparkles className="mx-auto size-8 text-purple-500 mb-2" />
          <h3 className="font-semibold">Design</h3>
          <p className="text-sm text-muted-foreground">UI/UX design assistance</p>
          <Button disabled size="sm" className="mt-2 opacity-50">
            Design (Mockup)
          </Button>
        </div>
      </div>
    </div>
  );
}
