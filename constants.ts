import { Tool } from './types';

export const WEBHOOK_URL = 'https://autowebhook.nexusdevhub.com/webhook/90a4b483-d0d9-459e-a97c-6ab11ef5190b';

export const DEFAULT_TOOLS: Tool[] = [
  { id: 'google-drive', name: 'Google Drive' },
  { id: 'google-sheets', name: 'Google Sheets' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'gmail', name: 'Gmail' },
  { id: 'agenda', name: 'Agenda' },
  { id: 'notificacoes', name: 'Notificações' },
  { id: 'google-calendar', name: 'Calendário Google' },
  { id: 'trello', name: 'Trello' },
  { id: 'jira', name: 'Jira' },
  { id: 'slack', name: 'Slack' },
];
