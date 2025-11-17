import React from 'react';

interface AgentsViewProps {}

const AgentsView: React.FC<AgentsViewProps> = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">En construcción próximamente</h1>
        <p className="text-muted-foreground">Esta funcionalidad estará disponible pronto.</p>
      </div>
    </div>
  );
};

export default AgentsView;
