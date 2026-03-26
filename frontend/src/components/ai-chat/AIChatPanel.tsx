import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIChat } from './useAIChat';
import ChatMessage from './ChatMessage';
import VoiceInput from './VoiceInput';
import './AIChatPanel.css';

interface AIChatPanelProps {
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatPanel({ projectId, isOpen, onClose }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isTyping, isConnected, sendMessage, resetChat } = useAIChat(projectId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  return (
    <div className={`ai-chat-panel ${isOpen ? 'ai-chat-panel-open' : ''}`}>
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-chat-header-left">
          <div className={`ai-status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <h3>KANBA AI</h3>
        </div>
        <div className="ai-chat-header-actions">
          <button
            className="btn-reset-chat"
            onClick={resetChat}
            title="Limpar conversa"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button className="btn-close-chat" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <p>Olá! Sou o <strong>KANBA</strong>, seu assistente de board.</p>
            <p>Posso criar, mover e gerenciar suas tasks por texto ou voz.</p>
            <div className="ai-chat-suggestions">
              <button onClick={() => sendMessage('Me dá um resumo do board')}>
                Resumo do board
              </button>
              <button onClick={() => sendMessage('Quais tasks estão pendentes?')}>
                Tasks pendentes
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-bubble chat-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-chat-input-area">
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          disabled={isTyping || !isConnected}
        />
        <input
          ref={inputRef}
          type="text"
          className="ai-chat-input"
          placeholder={isConnected ? 'Digite uma mensagem...' : 'Conectando...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected || isTyping}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || isTyping || !isConnected}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
