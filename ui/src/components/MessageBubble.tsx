import type { ChatMessage } from '../types/chat';
import { SourcesCard } from './SourcesCard';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>

        {message.role === 'assistant' && message.sources && (
          <SourcesCard sources={message.sources} />
        )}
      </div>
    </div>
  );
}
