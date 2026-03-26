import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: any[];
  executedActions?: any[];
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useAIChat(projectId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/ai-chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      // F6: Join project room for scoped broadcasts
      if (projectId) {
        socket.emit('joinProject', { projectId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('aiTyping', (data: { typing: boolean }) => {
      setIsTyping(data.typing);
    });

    socket.on('aiResponse', (data: {
      text: string;
      actions?: any[];
      executedActions?: any[];
      timestamp: string;
    }) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.text,
        timestamp: data.timestamp,
        actions: data.actions,
        executedActions: data.executedActions,
      };
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('boardUpdated', () => {
      // Trigger board refresh — dispatched as custom event
      window.dispatchEvent(new CustomEvent('ai-board-updated'));
    });

    socket.on('chatReset', () => {
      setMessages([]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Re-join project room when projectId changes (without recreating socket)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !projectId) return;
    socket.emit('joinProject', { projectId });
  }, [projectId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socketRef.current || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);

      socketRef.current.emit('sendMessage', {
        message: text.trim(),
        projectId,
      });
    },
    [projectId],
  );

  const resetChat = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('resetChat');
    }
    setMessages([]);
  }, []);

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    resetChat,
  };
}
