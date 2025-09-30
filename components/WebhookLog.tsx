
import React, { useRef, useEffect } from 'react';
import { Message } from '../App';

interface WebhookLogProps {
  logs: Message[];
}

export const WebhookLog: React.FC<WebhookLogProps> = ({ logs }) => {
  const endOfLogsRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const getLogColor = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.startsWith('erro') || lowerText.includes('falha')) {
      return 'text-red-400';
    }
    if (lowerText.startsWith('enviando')) {
      return 'text-yellow-400';
    }
    return 'text-green-400';
  }

  return (
    <div className="w-full h-full bg-brand-surface rounded-xl p-6 flex flex-col gap-6 shadow-lg overflow-hidden">
      <h2 className="text-xl font-bold text-brand-text-primary">Log do Webhook</h2>
      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col space-y-2 text-sm">
          {logs.length === 0 ? (
             <p className="text-brand-text-secondary italic">Aguardando comandos...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="font-mono">
                <span className="text-gray-500 mr-2 select-none">{new Date(parseInt(log.id)).toLocaleTimeString()}</span>
                <span className={`${getLogColor(log.text)} whitespace-pre-wrap break-words`}>
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div ref={endOfLogsRef} />
        </div>
      </div>
    </div>
  );
};