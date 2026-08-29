import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, User } from 'lucide-react';
import { ChatMessage } from '../../game/types';
import { audioManager } from '../../audio/audioManager';

interface TextChatPanelProps {
  messages: ChatMessage[];
  opponentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

export const TextChatPanel: React.FC<TextChatPanelProps> = ({
  messages,
  opponentName,
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Adjust drawer offset when mobile virtual keyboard opens/closes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const offset = window.innerHeight - window.visualViewport.height;
      setKeyboardOffset(offset > 50 ? offset : 0);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    audioManager.playClick();
    onSendMessage(text);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="text-chat-panel" style={{ bottom: keyboardOffset ? `${keyboardOffset}px` : undefined }}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={18} className="chat-icon" />
          <span>CHAT WITH {opponentName.toUpperCase()}</span>
        </div>
        <button className="chat-close-btn" onClick={onClose} title="Close Chat">
          <X size={18} />
        </button>
      </div>

      {/* Messages List */}
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <MessageSquare size={32} />
            <p>No messages yet. Say hello or start bluffing!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={msg.id}
                className={`chat-bubble-wrapper ${msg.isSelf ? 'self' : 'opponent'}`}
              >
                <div className="chat-bubble-header">
                  <span className="sender-name">
                    {msg.isSelf ? 'YOU' : msg.sender}
                  </span>
                  <span className="timestamp">{timeStr}</span>
                </div>
                <div className="chat-bubble-text">{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={inputText}
          maxLength={200}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          className="chat-send-btn"
          type="submit"
          disabled={!inputText.trim()}
          title="Send Message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
