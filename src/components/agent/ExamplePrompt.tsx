import React from 'react';
import { Badge } from '../ui/badge';

interface ExamplePromptProps {
  text: string;
}

export const ExamplePrompt: React.FC<ExamplePromptProps> = ({ text }) => (
  <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
    {text}
  </Badge>
);