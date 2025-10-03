



import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob } from '@google/genai';
import { sendCommandToWebhook } from './services/webhookService';
import { DEFAULT_TOOLS, DEFAULT_WEBHOOK_URL } from './constants';
import { Tool, Knowledge, UserInfo } from './types';
import { encode, decode, decodeAudioData, createBlob } from './utils/audio';
import { ToolSelector } from './components/ToolSelector';
import { ChatHistory } from './components/ChatHistory';
import { MicButton } from './components/MicButton';
import { Header } from './components/Header';
import { StatusIndicator } from './components/StatusIndicator';
import { WebhookLog } from './components/WebhookLog';
import { SettingsModal } from './components/SettingsModal';

type SessionState = 'idle' | 'connecting' | 'active' | 'error';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
}

interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
  sendToolResponse: (response: { functionResponses: { id: string; name: string; response: { result: string; }; }; }) => void;
}

// Helper para formatar a resposta do webhook para o log
const formatWebhookResponseForLog = (response: any): string => {
  if (typeof response === 'object' && response !== null) {
    if (response.message && Object.keys(response).length === 1) {
        return `Resposta: ${response.message}`;
    }
    return Object.entries(response)
      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${JSON.stringify(value, null, 2)}`)
      .join('\n');
  }
  return `Resposta: ${response.toString()}`;
};

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<Message[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<Tool[]>(() => {
    const savedTools = localStorage.getItem('tools');
    if (savedTools) {
      try {
        const parsed = JSON.parse(savedTools);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        return DEFAULT_TOOLS;
      }
    }
    return DEFAULT_TOOLS;
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('webhookUrl') || DEFAULT_WEBHOOK_URL);
  const [wakeWord, setWakeWord] = useState<string>(() => localStorage.getItem('wakeWord') || 'Nexus');
  const [isWakeWordRequired, setIsWakeWordRequired] = useState<boolean>(() => localStorage.getItem('isWakeWordRequired') !== 'false');
  const [isSilentMode, setIsSilentMode] = useState<boolean>(() => localStorage.getItem('isSilentMode') === 'true');
  const [systemMessage, setSystemMessage] = useState<string>(() => localStorage.getItem('systemMessage') || '');
  const [isSystemMessageEnabled, setIsSystemMessageEnabled] = useState<boolean>(() => localStorage.getItem('isSystemMessageEnabled') === 'true');
  const [knowledge, setKnowledge] = useState<Knowledge>(() => {
    const saved = localStorage.getItem('knowledge');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && 'type' in parsed && 'content' in parsed) {
          return parsed as Knowledge;
        }
      } catch (e) {
        // Fallback for old string format
        return { type: 'text', content: saved, fileName: undefined };
      }
    }
    return { type: 'text', content: '', fileName: undefined };
  });
  const [isKnowledgeEnabled, setIsKnowledgeEnabled] = useState<boolean>(() => localStorage.getItem('isKnowledgeEnabled') === 'true');
  const [userInfo, setUserInfo] = useState<UserInfo>(() => {
    const saved = localStorage.getItem('userInfo');
    return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [statusText, setStatusText] = useState('Clique no microfone para começar');
  const [textInput, setTextInput] = useState('');
  const [isTextMode, setIsTextMode] = useState(false);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextAudioStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isProcessingRef = useRef(false);
  
  const addMessage = useCallback((text: string, sender: 'user' | 'ai' | 'system') => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender }]);
  }, []);

  useEffect(() => {
    if (window.location.protocol !== 'https-:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      addMessage("Erro: O microfone requer uma conexão segura (HTTPS). Por favor, acesse a aplicação via HTTPS ou localhost.", 'system');
    }
  }, [addMessage]);

  useEffect(() => {
    if (process.env.API_KEY) {
        try {
          aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch(e) {
          console.error("Failed to initialize GoogleGenAI", e);
          addMessage("Erro: Falha ao inicializar o cliente de IA. Verifique a chave de API.", 'system');
        }
    } else {
      console.error("API_KEY environment variable not set.");
      addMessage("Erro: A chave de API não está configurada.", 'system');
    }
  }, [addMessage]);


  useEffect(() => {
    localStorage.setItem('webhookUrl', webhookUrl);
  }, [webhookUrl]);
  
  useEffect(() => {
    localStorage.setItem('wakeWord', wakeWord);
  }, [wakeWord]);

  useEffect(() => {
    localStorage.setItem('isWakeWordRequired', String(isWakeWordRequired));
  }, [isWakeWordRequired]);

  useEffect(() => {
    localStorage.setItem('isSilentMode', String(isSilentMode));
  }, [isSilentMode]);

  useEffect(() => {
    localStorage.setItem('systemMessage', systemMessage);
  }, [systemMessage]);
  
  useEffect(() => {
    localStorage.setItem('isSystemMessageEnabled', String(isSystemMessageEnabled));
  }, [isSystemMessageEnabled]);

  useEffect(() => {
    localStorage.setItem('knowledge', JSON.stringify(knowledge));
  }, [knowledge]);

  useEffect(() => {
    localStorage.setItem('isKnowledgeEnabled', String(isKnowledgeEnabled));
  }, [isKnowledgeEnabled]);

  useEffect(() => {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }, [userInfo]);

  useEffect(() => {
    localStorage.setItem('tools', JSON.stringify(tools));
  }, [tools]);

  const addWebhookLog = useCallback((text: string) => {
    setWebhookLogs(prev => {
      const newLogs: Message[] = [...prev, { id: Date.now().toString(), text, sender: 'system' }];
      // Mantém apenas os 50 logs mais recentes para evitar sobrecarga
      if (newLogs.length > 50) {
        return newLogs.slice(-50);
      }
      return newLogs;
    });
  }, []);
  
  const getActiveOptions = useCallback((overrides: { systemMessage?: boolean, knowledge?: boolean } = {}): string[] => {
    const active: string[] = [];
    const isSystemEnabled = overrides.systemMessage ?? isSystemMessageEnabled;
    const isKnowledgeOn = overrides.knowledge ?? isKnowledgeEnabled;

    if (isSystemEnabled) active.push('System Message');
    if (isKnowledgeOn) active.push('Conhecimento');
    return active;
  }, [isSystemMessageEnabled, isKnowledgeEnabled]);
  
  const selectToolsWithAI = useCallback(async (command: string): Promise<string[]> => {
    if (!aiRef.current) {
        addWebhookLog("Erro: Cliente de IA não inicializado.");
        return [];
    }

    const toolNames = tools.map(t => t.name);

    try {
        const response = await aiRef.current.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Dado o comando do usuário: "${command}", e a lista de ferramentas disponíveis: [${toolNames.join(', ')}]. Quais ferramentas desta lista são as mais relevantes para executar o comando? Retorne um objeto JSON com uma chave "ferramentas" contendo um array de strings com os nomes das ferramentas. Se nenhuma for relevante, o array deve ser vazio.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ferramentas: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            }
                        }
                    },
                    required: ['ferramentas']
                }
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result && Array.isArray(result.ferramentas)) {
            // Filtra o resultado para garantir que apenas ferramentas válidas sejam retornadas
            const validTools = result.ferramentas.filter((tool: any) => 
                typeof tool === 'string' && toolNames.includes(tool)
            );
            return validTools;
        }
        return [];
    } catch (error) {
        console.error("Erro ao selecionar ferramentas com IA:", error);
        addWebhookLog("Erro: Falha ao determinar as ferramentas necessárias.");
        return [];
    }
  }, [addWebhookLog, tools]);

  const setProcessing = useCallback((state: boolean) => {
    isProcessingRef.current = state;
    setIsProcessing(state);
  }, []);

  const stopSession = useCallback(async () => {
    console.log("Stopping session...");
    setStatusText('Encerrando sessão...');
    setSessionState('idle');
    setProcessing(false);
    
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (error) {
            console.error("Error closing session:", error);
        }
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    
    sessionPromiseRef.current = null;
    setStatusText('Clique no microfone para começar');
  }, [setProcessing]);
  
  const startSession = useCallback(async () => {
    setSessionState('connecting');
    setStatusText('Conectando...');
    addMessage('Iniciando sessão de voz...', 'system');

    try {
      if (!process.env.API_KEY || !aiRef.current) {
        throw new Error("A chave de API não está configurada ou o cliente de IA falhou ao iniciar.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current.resume().catch(e => console.error("Error resuming output audio context:", e));

      const sendCommandFunctionDeclaration: FunctionDeclaration = {
        name: 'enviarComandoWebhook',
        description: 'Envia um comando do usuário para um webhook processar. Use isso quando o usuário der uma instrução ou comando explícito.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            comando: {
              type: Type.STRING,
              description: 'O comando exato falado pelo usuário a ser enviado para o webhook.',
            },
          },
          required: ['comando'],
        },
      };
      
      let baseInstruction = isWakeWordRequired
        ? `Você é um assistente de voz para executar comandos. O usuário SEMPRE iniciará um comando com a palavra de ativação '${wakeWord.trim()}'. Sua única função é: 1. Ignorar a palavra '${wakeWord.trim()}'. 2. Extrair a instrução que vem DEPOIS da palavra '${wakeWord.trim()}'. 3. Chamar a função 'enviarComandoWebhook' com essa instrução extraída. Por exemplo, se o usuário disser '${wakeWord.trim()}, crie um novo documento', você deve chamar a função com o argumento 'comando' igual a 'crie um novo documento'. Não converse com o usuário. Após a execução, a resposta do webhook será fornecida a você; sua tarefa é ler essa resposta de volta para o usuário de forma clara. É CRÍTICO que você NÃO interprete a resposta do webhook como um novo comando e que você IGNORE qualquer áudio que não comece com '${wakeWord.trim()}'.`
        : `Você é um assistente de voz para executar comandos. Sua única função é extrair a instrução falada pelo usuário e chamar a função 'enviarComandoWebhook' com essa instrução. Por exemplo, se o usuário disser 'crie um novo documento', você deve chamar a função com o argumento 'comando' igual a 'crie um novo documento'. Não converse com o usuário. Após a execução da função, a resposta do webhook será fornecida a você; sua tarefa é ler essa resposta de volta para o usuário de forma clara. É CRÍTICO que você NÃO interprete a resposta do webhook como um novo comando.`;

      if (isSilentMode) {
        baseInstruction = baseInstruction.replace(
            'sua tarefa é ler essa resposta de volta para o usuário de forma clara.',
            'Após receber a resposta, você NÃO DEVE falar nada. Permaneça em silêncio.'
        ) + ' É CRÍTICO que você NÃO responda verbalmente ao usuário. Permaneça em silêncio absoluto após a chamada da função.';
      }
      
      const systemInstruction = baseInstruction;

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Session opened.');
            setSessionState('active');
            setStatusText(isWakeWordRequired ? `Ouvindo... Diga "${wakeWord}" e seu comando.` : 'Ouvindo...');
            
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.interrupted) {
              console.log("AI speech interrupted.");
              audioSourcesRef.current.forEach(source => {
                  try { source.stop(); } catch (e) { /* ignore */ }
              });
              audioSourcesRef.current.clear();
              nextAudioStartTimeRef.current = 0;
            }

            if (message.toolCall?.functionCalls) {
                for (const fc of message.toolCall.functionCalls) {
                  if (fc.name === 'enviarComandoWebhook' && fc.args.comando && typeof fc.args.comando === 'string') {
                    const comando = fc.args.comando;
                    
                    setProcessing(true);
                    setStatusText('Analisando comando...');
                    
                    const fullTranscription = currentInputTranscriptionRef.current.trim();
                    const userMessage = fullTranscription.toLowerCase().includes(comando.toLowerCase()) ? fullTranscription : comando;
                    addMessage(userMessage, 'user');
                    currentInputTranscriptionRef.current = '';

                    let activeTools: string[];
                    if (isSilentMode) {
                      activeTools = ['Resumo de Conversa'];
                      addWebhookLog(`Modo silencioso ativo. Ferramenta selecionada: Resumo de Conversa`);
                    } else {
                      addWebhookLog(`Analisando ferramentas para: "${comando}"`);
                      activeTools = await selectToolsWithAI(comando);
                    }
                    setSelectedTools(new Set(activeTools));
                    
                    addWebhookLog(`Ferramentas selecionadas: ${activeTools.length > 0 ? activeTools.join(', ') : 'Nenhuma'}`);
                    setStatusText('Processando seu comando...');
                    addWebhookLog(`Enviando comando: "${comando}"`);

                    try {
                      const opcoesAtivas = getActiveOptions();

                      const webhookResponse = await sendCommandToWebhook(
                        webhookUrl,
                        comando,
                        activeTools,
                        opcoesAtivas,
                        isSystemMessageEnabled ? systemMessage : undefined,
                        isKnowledgeEnabled ? knowledge : undefined,
                        userInfo
                      );
                      
                      const formattedLog = formatWebhookResponseForLog(webhookResponse);
                      addWebhookLog(formattedLog);

                      if (isSilentMode) {
                          addMessage('Comando executado em modo silencioso.', 'system');
                      }

                      const spokenResponse = webhookResponse.message || formattedLog.replace(/^Resposta: /, '').replace(/\n/g, ', ');
                      sessionPromiseRef.current?.then(session => session.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: spokenResponse } }
                      }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                        addWebhookLog(`Erro: ${errorMessage}`);
                        sessionPromiseRef.current?.then(session => session.sendToolResponse({
                          functionResponses: { id: fc.id, name: fc.name, response: { result: `Falha ao processar comando: ${errorMessage}` } }
                        }));
                    }
                  }
                }
            }
            
            if (!isSilentMode) {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && outputAudioContextRef.current) {
                  const audioCtx = outputAudioContextRef.current;
                  
                  if (isProcessingRef.current) {
                    setProcessing(false);
                    setStatusText(isWakeWordRequired ? `Ouvindo... Diga "${wakeWord}" e seu comando.` : 'Ouvindo...');
                  }
                  const audioData = decode(base64Audio);
                  const audioBuffer = await decodeAudioData(audioData, audioCtx, 24000, 1);
                  
                  nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, audioCtx.currentTime);
                  
                  const source = audioCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(audioCtx.destination);
                  source.start(nextAudioStartTimeRef.current);
                  
                  nextAudioStartTimeRef.current += audioBuffer.duration;
                  audioSourcesRef.current.add(source);
                  source.onended = () => audioSourcesRef.current.delete(source);
              }
            }

            if (message.serverContent?.turnComplete) {
              if (isProcessingRef.current) {
                setProcessing(false);
                setStatusText(isWakeWordRequired ? `Ouvindo... Diga "${wakeWord}" e seu comando.` : 'Ouvindo...');
              }
              
              const fullTranscription = currentInputTranscriptionRef.current.trim();
              if (fullTranscription) {
                  console.log(`Transcrição restante ignorada (comando já processado): "${fullTranscription}"`);
              }
              
              if (currentOutputTranscriptionRef.current.trim()) {
                addMessage(currentOutputTranscriptionRef.current, 'ai');
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error event:', e);
            const errorMessage = e.message === 'Network error' 
              ? 'Ocorreu um erro de rede. Verifique sua conexão e tente novamente.'
              : e.message;
            addMessage(`Erro na sessão: ${errorMessage}`, 'system');
            setStatusText('Erro de conexão. Tente novamente.');
            setProcessing(false);
            setSessionState('error');
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log(`Session closed. Code: ${e.code}, Reason: "${e.reason}", Was Clean: ${e.wasClean}`);
            if (sessionState !== 'idle') {
                stopSession();
            }
          },
        },
        config: {
          systemInstruction: systemInstruction,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [sendCommandFunctionDeclaration] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      addMessage(`Falha ao iniciar: ${errorMessage}`, 'system');
      setStatusText('Falha ao iniciar. Verifique as permissões.');
      setSessionState('error');
    }
  }, [stopSession, sessionState, setProcessing, webhookUrl, wakeWord, systemMessage, isSystemMessageEnabled, knowledge, isKnowledgeEnabled, isWakeWordRequired, isSilentMode, getActiveOptions, userInfo, addMessage, selectToolsWithAI, addWebhookLog]);

  useEffect(() => {
    return () => {
      if (sessionState !== 'idle') {
        stopSession();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicClick = () => {
    if (sessionState === 'active' || sessionState === 'connecting') {
      stopSession();
    } else {
      startSession();
    }
  };

  const handleSaveSettings = (settings: { 
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
  }) => {
    setWebhookUrl(settings.newWebhookUrl);
    setWakeWord(settings.newWakeWord);
    setIsWakeWordRequired(settings.newIsWakeWordRequired);
    setIsSilentMode(settings.newIsSilentMode);
    setIsSystemMessageEnabled(settings.newIsSystemMessageEnabled);
    setSystemMessage(settings.newSystemMessage);
    setIsKnowledgeEnabled(settings.newIsKnowledgeEnabled);
    setKnowledge(settings.newKnowledge);
    setUserInfo(settings.newUserInfo);
    setTools(settings.newTools);

    if (sessionState === 'active') {
      setStatusText(settings.newIsWakeWordRequired ? `Ouvindo... Diga "${settings.newWakeWord}" e seu comando.` : 'Ouvindo...');
    } else {
      setStatusText('Clique no microfone para começar');
    }
  };

  const handleSendSystemMessage = useCallback(async (message: string, isEnabled: boolean) => {
    if (!isEnabled || !message.trim()) {
      addWebhookLog("Erro: A mensagem de sistema deve estar ativada e não pode estar vazia para ser enviada.");
      return;
    }

    addWebhookLog(`Enviando prompt do System Message: "${message}"`);
    setIsSettingsOpen(false); // Fecha o modal para mostrar o log
    try {
      const opcoesAtivas = getActiveOptions({ systemMessage: isEnabled });

      const webhookResponse = await sendCommandToWebhook(
        webhookUrl,
        message, // Usa a mensagem do prompt como comando
        [], // Ferramentas não são selecionadas para envio manual
        opcoesAtivas,
        message,  // E também como a mensagem de sistema
        isKnowledgeEnabled ? knowledge : undefined,
        userInfo
      );
      
      const formattedLog = formatWebhookResponseForLog(webhookResponse);
      addWebhookLog(formattedLog);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        addWebhookLog(`Erro ao enviar prompt: ${errorMessage}`);
    }
  }, [webhookUrl, isKnowledgeEnabled, knowledge, getActiveOptions, userInfo, addWebhookLog]);

  const handleSendKnowledge = useCallback(async (knowledgeContent: Knowledge, isEnabled: boolean) => {
    if (!isEnabled || !knowledgeContent.content.trim()) {
      addWebhookLog("Erro: O Conhecimento deve estar ativado e não pode estar vazio para ser enviado.");
      return;
    }

    addWebhookLog(`Enviando conteúdo do Conhecimento...`);
    setIsSettingsOpen(false);
    try {
      const opcoesAtivas = getActiveOptions({ knowledge: isEnabled });

      const webhookResponse = await sendCommandToWebhook(
        webhookUrl,
        'Envio de base de conhecimento.',
        [], // Ferramentas não são selecionadas para envio manual
        opcoesAtivas,
        isSystemMessageEnabled ? systemMessage : undefined,
        knowledgeContent,
        userInfo
      );
      
      const formattedLog = formatWebhookResponseForLog(webhookResponse);
      addWebhookLog(formattedLog);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        addWebhookLog(`Erro ao enviar conhecimento: ${errorMessage}`);
    }
  }, [webhookUrl, isSystemMessageEnabled, systemMessage, getActiveOptions, userInfo, addWebhookLog]);

  const handleSendTextMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const command = textInput.trim();
    if (!command || sessionState !== 'idle') return;

    setIsTextMode(false);

    addMessage(command, 'user');
    setTextInput('');
    setProcessing(true);
    setStatusText('Analisando comando...');
    
    let activeTools: string[];
    if (isSilentMode) {
      activeTools = ['Resumo de Conversa'];
      addWebhookLog(`Modo silencioso ativo. Ferramenta selecionada: Resumo de Conversa`);
    } else {
      addWebhookLog(`Analisando ferramentas para: "${command}"`);
      activeTools = await selectToolsWithAI(command);
    }
    setSelectedTools(new Set(activeTools));

    addWebhookLog(`Ferramentas selecionadas: ${activeTools.length > 0 ? activeTools.join(', ') : 'Nenhuma'}`);
    setStatusText('Processando seu comando...');
    addWebhookLog(`Enviando comando de texto: "${command}"`);

    try {
      const opcoesAtivas = getActiveOptions();
      const webhookResponse = await sendCommandToWebhook(
        webhookUrl,
        command,
        activeTools,
        opcoesAtivas,
        isSystemMessageEnabled ? systemMessage : undefined,
        isKnowledgeEnabled ? knowledge : undefined,
        userInfo
      );
      
      const formattedLog = formatWebhookResponseForLog(webhookResponse);
      addWebhookLog(formattedLog);
      
      if (isSilentMode) {
        addMessage('Comando executado em modo silencioso.', 'system');
      } else {
        const aiResponseText = webhookResponse.message || (typeof webhookResponse === 'string' ? webhookResponse : formatWebhookResponseForLog(webhookResponse));
        addMessage(aiResponseText, 'ai');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addWebhookLog(`Erro: ${errorMessage}`);
      addMessage(`Falha ao processar comando: ${errorMessage}`, 'system');
    } finally {
      setProcessing(false);
      setStatusText('Clique no microfone para começar');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-background text-brand-text-primary font-sans">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />
      <main className="flex-grow flex flex-col md:flex-row overflow-y-auto p-4 gap-4">
        {/* Coluna 1: Ferramentas */}
        <div className="w-full md:w-1/4 bg-brand-surface rounded-xl p-6 flex flex-col gap-6 shadow-lg md:h-full overflow-y-auto">
          <h2 className="text-xl font-bold text-brand-text-primary">Ferramentas Disponíveis</h2>
          <ToolSelector tools={tools} selectedTools={selectedTools} />
        </div>
        
        {/* Coluna 2: Chat de Voz */}
        <div className="w-full md:w-2/4 flex flex-col bg-brand-surface rounded-xl shadow-lg h-96 md:h-full">
          <ChatHistory messages={messages} isProcessing={isProcessing} />
          <div className="p-6 border-t border-gray-700 flex flex-col items-center justify-center gap-4 min-h-[160px] relative">
            {isTextMode ? (
              <div className="w-full flex flex-col items-center justify-center gap-4">
                <form onSubmit={handleSendTextMessage} className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTextMode(false)}
                    className="p-2.5 bg-brand-secondary rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
                    aria-label="Mudar para entrada de voz"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Digite um comando..."
                    className="flex-grow bg-brand-secondary border border-gray-600 text-brand-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    aria-label="Campo para digitar comando"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isProcessing}
                    className="p-2.5 bg-brand-primary rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label="Enviar comando por texto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              <>
                <MicButton sessionState={sessionState} isProcessing={isProcessing} onClick={handleMicClick} />
                <StatusIndicator statusText={statusText} />
                {sessionState === 'idle' && (
                  <button onClick={() => setIsTextMode(true)} className="absolute bottom-6 right-6 p-3 bg-brand-secondary rounded-full hover:bg-gray-700 transition-colors" aria-label="Mudar para entrada de texto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Coluna 3: Logs do Webhook */}
        <div className="w-full md:w-1/4 h-96 md:h-full">
         <WebhookLog logs={webhookLogs} />
        </div>
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentWebhookUrl={webhookUrl}
        currentWakeWord={wakeWord}
        currentIsWakeWordRequired={isWakeWordRequired}
        isSilentMode={isSilentMode}
        isSystemMessageEnabled={isSystemMessageEnabled}
        currentSystemMessage={systemMessage}
        isKnowledgeEnabled={isKnowledgeEnabled}
        currentKnowledge={knowledge}
        currentUserInfo={userInfo}
        currentTools={tools}
        onSave={handleSaveSettings}
        onSendSystemMessage={handleSendSystemMessage}
        onSendKnowledge={handleSendKnowledge}
      />
    </div>
  );
};

export default App;