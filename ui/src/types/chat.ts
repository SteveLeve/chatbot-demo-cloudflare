import type { DocumentSource } from './index';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: DocumentSource[];
  timestamp: Date;
}
