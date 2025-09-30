
import React from 'react';
import { Tool } from '../types';

interface ToolSelectorProps {
  tools: Tool[];
  selectedTools: Set<string>;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({ tools, selectedTools }) => {
  return (
    <div className="flex flex-col space-y-3">
      {tools.map((tool) => {
        const isSelected = selectedTools.has(tool.name);
        return (
          <div 
            key={tool.id} 
            className={`flex items-center space-x-3 p-2.5 rounded-lg transition-all duration-300 ${isSelected ? 'bg-brand-primary/20' : 'bg-transparent'}`}
            aria-live="polite"
            aria-label={`${tool.name}${isSelected ? ', ativado' : ''}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-brand-primary scale-125' : 'bg-brand-text-secondary/50'}`}></div>
            <span className={`transition-colors duration-200 ${isSelected ? 'text-brand-text-primary font-semibold' : 'text-brand-text-secondary'}`}>
              {tool.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
