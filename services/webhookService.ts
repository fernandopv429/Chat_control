
import { WEBHOOK_URL } from '../constants';
import { Knowledge, UserInfo } from '../types';

export const sendCommandToWebhook = async (
  command: string, 
  activeTools: string[], 
  opcoesAtivas: string[],
  systemMessage?: string, 
  conhecimento?: Knowledge,
  userInfo?: UserInfo
): Promise<any> => {
  try {
    const payload: { 
      comando: string; 
      ferramentasAtivas: string[];
      opcoesAtivas: string[];
      systemMessage?: string;
      conhecimento?: Knowledge;
      userInfo?: UserInfo;
    } = {
      comando: command,
      ferramentasAtivas: activeTools,
      opcoesAtivas: opcoesAtivas,
    };

    if (systemMessage) {
      payload.systemMessage = systemMessage;
    }
    if (conhecimento) {
      payload.conhecimento = conhecimento;
    }
    if (userInfo) {
      payload.userInfo = userInfo;
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      const errorDetails = responseText || 'Não foi possível ler o corpo da resposta de erro.';
      throw new Error(`Webhook respondeu com status: ${response.status}. Detalhes: ${errorDetails}`);
    }

    if (!responseText) {
      return { message: "Comando recebido com sucesso pelo webhook." };
    }

    try {
      // Tenta analisar como JSON
      return JSON.parse(responseText);
    } catch (e) {
      // Se falhar, retorna como uma mensagem em um objeto consistente
      return { message: responseText };
    }

  } catch (error) {
    console.error('Error sending command to webhook:', error);
    if (error instanceof Error) {
        // Re-lança o erro para ser tratado pelo chamador
        throw error;
    }
    throw new Error('Ocorreu um erro desconhecido na comunicação com o webhook.');
  }
};
