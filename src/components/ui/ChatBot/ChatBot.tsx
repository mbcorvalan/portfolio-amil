'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatBot.module.scss';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! Ask me anything about Belen\'s experience or work.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const MAX_QUESTIONS = 3;
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled)'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleWindowKeyDown);
    return () => document.removeEventListener('keydown', handleWindowKeyDown);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (questionCount >= MAX_QUESTIONS) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    const newCount = questionCount + 1;
    setQuestionCount(newCount);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, something went wrong.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      if (newCount >= MAX_QUESTIONS) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: 'For more information, feel free to reach out at bcorvalan.amil@gmail.com 📩',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.wrapper}>
      {open && (
        <div className={styles.panel} ref={panelRef} role="dialog" aria-modal="true" aria-label="Chat with an assistant about Belen">
          <div className={styles.header}>
            <span>Ask about Belen</span>
            <button onClick={closePanel} className={styles.close} aria-label="Close chat">✕</button>
          </div>
          <div className={styles.messages} aria-live="polite" aria-label="Chat messages">
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.assistant}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.assistant} ${styles.typing}`} aria-label="Typing...">
                <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={questionCount >= MAX_QUESTIONS ? 'No more questions' : 'Type a message...'}
              disabled={loading || questionCount >= MAX_QUESTIONS}
              aria-label="Type a message"
            />
            <button onClick={send} disabled={loading || !input.trim() || questionCount >= MAX_QUESTIONS} className={styles.send} aria-label="Send">
              ↑
            </button>
          </div>
        </div>
      )}
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={styles.trigger}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
      >
        {open ? '✕' : '✦'}
      </button>
    </div>
  );
};
