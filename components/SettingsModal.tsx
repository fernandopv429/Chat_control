


import React, { useState, useEffect, useRef } from 'react';
import { Knowledge, UserInfo, Tool } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWebhookUrl: string;
  currentWakeWord: string;
  currentIsWakeWordRequired: boolean;
  isSilentMode: boolean;
  isSystemMessageEnabled: boolean;
  currentSystemMessage: string;
  isKnowledgeEnabled: boolean;
  currentKnowledge: Knowledge;
  currentUserInfo: UserInfo;
  currentTools: Tool[];
  onSave: (settings: { 
    newWebhookUrl: string;
    newWakeWord: string; 
    newIsWakeWordRequired: boolean;
    newIsSilentMode: boolean;
    newIsSystemMessageEnabled: boolean; 
    newSystemMessage: string; 
    newIsKnowledgeEnabled: boolean;
    newKnowledge: Knowledge;
    newUserInfo: UserInfo;
    newTools: Tool[];
  }) => void;
  onSendSystemMessage: (message: string, isEnabled: boolean) => void;
  onSendKnowledge: (knowledge: Knowledge, isEnabled: boolean) => void;
}

const MAX_HISTORY_SIZE = 10;

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentWebhookUrl,
  currentWakeWord, 
  currentIsWakeWordRequired,
  isSilentMode,
  isSystemMessageEnabled,
  currentSystemMessage,
  isKnowledgeEnabled,
  currentKnowledge,
  currentUserInfo,
  currentTools,
  onSave,
  onSendSystemMessage,
  onSendKnowledge
}) => {
  const [webhookUrlInput, setWebhookUrlInput] = useState(currentWebhookUrl);
  const [wakeWordInput, setWakeWordInput] = useState(currentWakeWord);
  const [isWakeWordRequiredInput, setIsWakeWordRequiredInput] = useState(currentIsWakeWordRequired);
  const [isSilentModeInput, setIsSilentModeInput] = useState(isSilentMode);
  const [systemMessageEnabled, setSystemMessageEnabled] = useState(isSystemMessageEnabled);
  const [systemMessageInput, setSystemMessageInput] = useState(currentSystemMessage);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(isKnowledgeEnabled);
  const [knowledgeInput, setKnowledgeInput] = useState<Knowledge>(currentKnowledge);
  const [userInfoInput, setUserInfoInput] = useState<UserInfo>(currentUserInfo);
  const [editableTools, setEditableTools] = useState<Tool[]>(currentTools);
  const [newToolName, setNewToolName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setWebhookUrlInput(currentWebhookUrl);
      setWakeWordInput(currentWakeWord);
      setIsWakeWordRequiredInput(currentIsWakeWordRequired);
      setIsSilentModeInput(isSilentMode);
      setSystemMessageEnabled(isSystemMessageEnabled);
      setSystemMessageInput(currentSystemMessage);
      setKnowledgeEnabled(isKnowledgeEnabled);
      setKnowledgeInput(currentKnowledge);
      setUserInfoInput(currentUserInfo);
      setEditableTools(currentTools);
      
      try {
        const savedHistory = localStorage.getItem('systemMessageHistory');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error("Failed to parse system message history:", error);
        setHistory([]);
      }
    } else {
        setIsHistoryVisible(false); // Esconde o histórico quando o modal fecha
    }
  }, [isOpen, currentWebhookUrl, currentWakeWord, currentIsWakeWordRequired, isSilentMode, isSystemMessageEnabled, currentSystemMessage, isKnowledgeEnabled, currentKnowledge, currentUserInfo, currentTools]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if ((wakeWordInput.trim() || !isWakeWordRequiredInput) && webhookUrlInput.trim()) {
      if (systemMessageInput.trim() && !history.includes(systemMessageInput.trim())) {
        const newHistory = [systemMessageInput.trim(), ...history];
        const limitedHistory = newHistory.slice(0, MAX_HISTORY_SIZE);
        localStorage.setItem('systemMessageHistory', JSON.stringify(limitedHistory));
        setHistory(limitedHistory);
      }

      onSave({
        newWebhookUrl: webhookUrlInput.trim(),
        newWakeWord: wakeWordInput.trim(),
        newIsWakeWordRequired: isWakeWordRequiredInput,
        newIsSilentMode: isSilentModeInput,
        newIsSystemMessageEnabled: systemMessageEnabled,
        newSystemMessage: systemMessageInput,
        newIsKnowledgeEnabled: knowledgeEnabled,
        newKnowledge: knowledgeInput,
        newUserInfo: userInfoInput,
        newTools: editableTools,
      });
      onClose();
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const content = base64.split(',')[1];
        setKnowledgeInput({
            type: 'file',
            content: content,
            fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setKnowledgeInput({
        type: 'text',
        content: '',
        fileName: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleHistoryItemClick = (prompt: string) => {
    setSystemMessageInput(prompt);
    setIsHistoryVisible(false);
  };

  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfoInput(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTool = () => {
    const trimmedName = newToolName.trim();
    if (trimmedName && !editableTools.some(tool => tool.name.toLowerCase() === trimmedName.toLowerCase())) {
        const newTool: Tool = {
            id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: trimmedName,
        };
        setEditableTools([...editableTools, newTool]);
        setNewToolName('');
    }
  };

  const handleRemoveTool = (toolId: string) => {
      setEditableTools(editableTools.filter(tool => tool.id !== toolId));
  };


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-brand-surface rounded-xl p-8 shadow-2xl w-full max-w-lg m-4 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="settings-title" className="text-2xl font-bold text-brand-text-primary">Configurações</h2>
          <button 
            onClick={onClose} 
            className="text-brand-text-secondary hover:text-brand-text-primary transition-colors"
            aria-label="Fechar configurações"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="wakeWord" className="text-brand-text-secondary font-medium">
            Palavra de Ativação
          </label>
          <input
            id="wakeWord"
            type="text"
            value={wakeWordInput}
            onChange={(e) => setWakeWordInput(e.target.value)}
            className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-gray-800 disabled:cursor-not-allowed"
            placeholder="Ex: Nexus, Ok Google"
            disabled={!isWakeWordRequiredInput}
          />
           <label className="flex items-center space-x-3 cursor-pointer group mt-3">
              <input
                type="checkbox"
                className="hidden"
                checked={isWakeWordRequiredInput}
                onChange={() => setIsWakeWordRequiredInput(!isWakeWordRequiredInput)}
              />
              <div className="w-6 h-6 border-2 border-brand-text-secondary rounded-md flex items-center justify-center transition-all duration-200 group-hover:border-brand-primary">
                {isWakeWordRequiredInput && (
                  <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-brand-text-secondary group-hover:text-brand-text-primary transition-colors duration-200">
                Iniciar comando com palavra de ativação
              </span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer group mt-3">
              <input
                type="checkbox"
                className="hidden"
                checked={isSilentModeInput}
                onChange={() => setIsSilentModeInput(!isSilentModeInput)}
              />
              <div className="w-6 h-6 border-2 border-brand-text-secondary rounded-md flex items-center justify-center transition-all duration-200 group-hover:border-brand-primary">
                {isSilentModeInput && (
                  <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-brand-text-secondary group-hover:text-brand-text-primary transition-colors duration-200">
                Modo Silencioso (Apenas Executar)
              </span>
          </label>
           <p className="text-sm text-gray-500 pl-9 -mt-2">O assistente não dará respostas por voz, apenas executará os comandos.</p>
        </div>

        <hr className="border-gray-700" />
        
        <div className="flex flex-col gap-2">
          <label htmlFor="webhookUrl" className="text-brand-text-secondary font-medium">
            URL do Webhook
          </label>
          <input
            id="webhookUrl"
            type="url"
            value={webhookUrlInput}
            onChange={(e) => setWebhookUrlInput(e.target.value)}
            className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="https://seu-webhook.com/api"
          />
        </div>

        <hr className="border-gray-700" />
        
        <div className="flex flex-col gap-4">
            <h3 className="text-brand-text-secondary font-medium">Minhas Informações</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label htmlFor="userName" className="text-brand-text-secondary text-sm">Nome</label>
                    <input id="userName" name="name" type="text" value={userInfoInput.name} onChange={handleUserInfoChange} className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="userPhone" className="text-brand-text-secondary text-sm">Telefone</label>
                    <input id="userPhone" name="phone" type="tel" value={userInfoInput.phone} onChange={handleUserInfoChange} className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label htmlFor="userEmail" className="text-brand-text-secondary text-sm">E-mail</label>
                <input id="userEmail" name="email" type="email" value={userInfoInput.email} onChange={handleUserInfoChange} className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <p className="text-sm text-gray-500 mt-1">Essas informações serão enviadas ao webhook com cada comando.</p>
        </div>


        <hr className="border-gray-700" />

        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer group flex-grow">
              <input
                type="checkbox"
                className="hidden"
                checked={systemMessageEnabled}
                onChange={() => setSystemMessageEnabled(!systemMessageEnabled)}
              />
              <div className="w-6 h-6 border-2 border-brand-text-secondary rounded-md flex items-center justify-center transition-all duration-200 group-hover:border-brand-primary">
                {systemMessageEnabled && (
                  <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-brand-text-secondary group-hover:text-brand-text-primary transition-colors duration-200 font-medium">
                Ativar System Message
              </span>
            </label>
            <button
              onClick={() => onSendSystemMessage(systemMessageInput, systemMessageEnabled)}
              disabled={!systemMessageEnabled || !systemMessageInput.trim()}
              className="ml-auto bg-brand-primary text-white text-sm font-bold py-1.5 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
          
          {systemMessageEnabled && (
            <div className="flex flex-col gap-2 relative">
               <div className="flex justify-between items-center mb-1">
                 <label htmlFor="systemMessage" className="text-brand-text-secondary text-sm">
                   Prompt do Sistema
                 </label>
                 {history.length > 0 && (
                   <button 
                     onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                     className="text-brand-text-secondary hover:text-brand-primary transition-colors"
                     aria-label="Mostrar histórico de prompts"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </button>
                 )}
               </div>
              <textarea
                id="systemMessage"
                value={systemMessageInput}
                onChange={(e) => setSystemMessageInput(e.target.value)}
                className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary h-32 resize-none"
                placeholder="Escreva seu prompt aqui..."
              />

              {isHistoryVisible && (
                  <div className="absolute top-full mt-2 w-full bg-brand-secondary border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {history.map((prompt, index) => (
                          <button
                              key={index}
                              onClick={() => handleHistoryItemClick(prompt)}
                              className="w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-primary hover:text-white truncate"
                          >
                              {prompt}
                          </button>
                      ))}
                  </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Este prompt será enviado ao webhook com cada comando.</p>
            </div>
          )}
        </div>

        <hr className="border-gray-700" />

        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer group flex-grow">
              <input
                type="checkbox"
                className="hidden"
                checked={knowledgeEnabled}
                onChange={() => setKnowledgeEnabled(!knowledgeEnabled)}
              />
              <div className="w-6 h-6 border-2 border-brand-text-secondary rounded-md flex items-center justify-center transition-all duration-200 group-hover:border-brand-primary">
                {knowledgeEnabled && (
                  <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-brand-text-secondary group-hover:text-brand-text-primary transition-colors duration-200 font-medium">
                Ativar Conhecimento
              </span>
            </label>
            <button
              onClick={() => onSendKnowledge(knowledgeInput, knowledgeEnabled)}
              disabled={!knowledgeEnabled || !knowledgeInput.content.trim()}
              className="ml-auto bg-brand-primary text-white text-sm font-bold py-1.5 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
          
          {knowledgeEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="knowledge" className="text-brand-text-secondary text-sm">
                  Base de Conhecimento
                </label>
                {knowledgeInput.type === 'file' && knowledgeInput.fileName ? (
                   <button onClick={handleClearFile} className="text-xs text-red-400 hover:text-red-300 transition-colors">Limpar Arquivo</button>
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      id="knowledge-file-input"
                    />
                    <label htmlFor="knowledge-file-input" className="cursor-pointer text-sm text-brand-primary hover:underline">
                      Escolher Arquivo
                    </label>
                  </>
                )}
              </div>

              {knowledgeInput.type === 'file' && knowledgeInput.fileName ? (
                <div className="bg-brand-secondary border border-gray-600 rounded-lg px-4 py-3 text-brand-text-secondary flex items-center justify-between animate-fade-in">
                  <span className="truncate pr-2" title={knowledgeInput.fileName}>{knowledgeInput.fileName}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <textarea
                  id="knowledge"
                  value={knowledgeInput.content}
                  onChange={(e) => setKnowledgeInput({ type: 'text', content: e.target.value })}
                  className="bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary h-32 resize-none"
                  placeholder="Insira sua base de conhecimento aqui ou escolha um arquivo..."
                />
              )}
              <p className="text-sm text-gray-500 mt-1">Este conteúdo será enviado ao webhook com cada comando.</p>
            </div>
          )}
        </div>

        <hr className="border-gray-700" />
        
        <div className="flex flex-col gap-4">
          <h3 className="text-brand-text-secondary font-medium">Gerenciar Ferramentas</h3>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {editableTools.map(tool => (
              <div key={tool.id} className="flex items-center justify-between bg-brand-secondary p-2 rounded-lg animate-fade-in">
                <span className="text-brand-text-primary">{tool.name}</span>
                <button onClick={() => handleRemoveTool(tool.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1" aria-label={`Remover ${tool.name}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTool()}
              placeholder="Nome da nova ferramenta"
              className="flex-grow bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button onClick={handleAddTool} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors disabled:bg-gray-600" disabled={!newToolName.trim()}>
              Adicionar
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            disabled={(isWakeWordRequiredInput && !wakeWordInput.trim()) || !webhookUrlInput.trim()}
            className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};