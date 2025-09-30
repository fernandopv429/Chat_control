import React, { useRef, useEffect } from 'react';
import { Message } from '../App';

interface ChatHistoryProps {
  messages: Message[];
  isProcessing: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isProcessing }) => {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);
  
  const getBubbleClasses = (sender: Message['sender']) => {
    switch (sender) {
      case 'user':
        // Azul para o usuário, alinhado à direita. `rounded-br-none` cria um efeito de "balão de fala".
        return 'bg-brand-primary self-end text-white rounded-br-none';
      case 'ai':
        // Cinza escuro para a IA, alinhada à esquerda. `rounded-bl-none` cria um efeito de "balão de fala".
        return 'bg-gray-800 self-start text-brand-text-primary rounded-bl-none';
      case 'system':
        // Transparente, centralizado e em itálico para mensagens do sistema.
        return 'bg-transparent text-center self-center text-brand-text-secondary text-sm italic';
      default:
        return '';
    }
  };

  return (
    <div className="flex-grow p-6 overflow-y-auto">
      <div className="flex flex-col space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`px-4 py-3 rounded-2xl max-w-lg md:max-w-xl break-words ${getBubbleClasses(msg.sender)}`}
          >
            {msg.text}
          </div>
        ))}
        {/* Indicador visual de digitação que aparece quando o assistente está processando uma resposta. */}
        {isProcessing && (
           <div className="self-start flex items-center space-x-2" aria-label="Assistente está digitando">
             <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center justify-center space-x-1.5">
               <span className="w-2 h-2 bg-brand-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
               <span className="w-2 h-2 bg-brand-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
               <span className="w-2 h-2 bg-brand-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
             </div>
           </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};
