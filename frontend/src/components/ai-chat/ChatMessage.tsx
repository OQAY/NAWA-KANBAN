import type { ChatMessage as ChatMessageType } from './useAIChat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-bubble">
        <p className="chat-text">{message.text}</p>

        {message.executedActions && message.executedActions.length > 0 && (
          <div className="chat-actions">
            {message.executedActions.map((action, i) => (
              <span
                key={i}
                className={`chat-action-badge ${action.success ? 'action-success' : 'action-error'}`}
              >
                {action.success ? '✓' : '✗'} {action.action.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="chat-time">{time}</span>
    </div>
  );
}
