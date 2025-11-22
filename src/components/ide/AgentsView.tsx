import React from 'react';
import { AgentsLayout } from '../agents/AgentsLayout';

interface AgentsViewProps { }

const AgentsView: React.FC<AgentsViewProps> = () => {
  return (
    <div className="h-full w-full">
      <AgentsLayout />
    </div>
  );
};

export default AgentsView;
