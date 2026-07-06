/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, FileText, Save, CheckCircle2, Trash2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const documentRegex = /<game_document\s+title="([^"]+)">([\s\S]*?)<\/game_document>/g;

function parseMessageText(text: string) {
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = documentRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'document', title: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}

const MessageContent = ({ text }: { text: string }) => {
  const parts = parseMessageText(text);
  const [savedLocallyDocs, setSavedLocallyDocs] = useState<Record<string, boolean>>({});
  const [savingLocallyDocs, setSavingLocallyDocs] = useState<Record<string, boolean>>({});

  const handleSaveLocally = async (title: string, content: string) => {
    setSavingLocallyDocs(prev => ({ ...prev, [title]: true }));
    try {
      const res = await fetch('/api/save-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        setSavedLocallyDocs(prev => ({ ...prev, [title]: true }));
      } else {
        console.error('Failed to save document locally');
        alert("Failed to save document locally.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving document locally.");
    } finally {
      setSavingLocallyDocs(prev => ({ ...prev, [title]: false }));
    }
  };

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return (
            <div key={idx} className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
              <ReactMarkdown>{part.content}</ReactMarkdown>
            </div>
          );
        } else {
          const isSavedLocally = savedLocallyDocs[part.title];
          const isSavingLocally = savingLocallyDocs[part.title];
          
          return (
            <div key={idx} className="border border-emerald-500/30 bg-slate-900 rounded-xl overflow-hidden my-3 shadow-md">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-emerald-400" />
                  <span className="font-mono text-sm font-medium text-emerald-100">{part.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSaveLocally(part.title, part.content)}
                    disabled={isSavedLocally || isSavingLocally}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      isSavedLocally 
                        ? 'bg-slate-700 text-slate-300 cursor-default'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {isSavingLocally ? (
                      <><Loader2 size={14} className="animate-spin" /> Saving...</>
                    ) : isSavedLocally ? (
                      <><CheckCircle2 size={14} /> Saved Locally</>
                    ) : (
                      <><Save size={14} /> Save Locally</>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto prose prose-invert prose-sm max-w-none prose-p:leading-relaxed bg-slate-950/50 custom-scrollbar">
                <ReactMarkdown>{part.content}</ReactMarkdown>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gda_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      { role: 'assistant', text: "Hello! I am your Game Design Assistant. Let's start planning your game documents and keep our coding on track. What kind of game are we building?" }
    ];
  });
  
  useEffect(() => {
    localStorage.setItem('gda_chat_history', JSON.stringify(messages));
  }, [messages]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleClearChat = () => {
    setMessages([
      { role: 'assistant', text: "Hello! I am your Game Design Assistant. Let's start planning your game documents and keep our coding on track. What kind of game are we building?" }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Create the history for the API call (excluding the initial greeting to keep it lean, or including it - let's include it)
    const history = messages.map(m => ({
      role: m.role,
      text: m.text
    }));

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: userMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: '**Error:** Failed to connect to the assistant. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Game Design Assistant</h1>
            <p className="text-xs text-slate-400">Minimizing hallucination, maintaining scope.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mt-1 border border-emerald-500/30">
                  <Bot size={18} />
                </div>
              )}
              
              <div 
                className={`px-5 py-4 max-w-[85%] sm:max-w-[75%] rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-slate-800 border border-slate-700 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <MessageContent text={msg.text} />
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mt-1 border border-blue-500/30">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mt-1 border border-emerald-500/30">
                <Bot size={18} />
              </div>
              <div className="px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-emerald-500" />
                <span className="text-sm text-slate-400">Assistant is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 sm:p-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-emerald-500/50 transition-colors shadow-inner"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Discuss your game design here..."
              className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none border-0 focus:ring-0 px-3 py-2.5 text-slate-100 placeholder-slate-500"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 mb-0.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={20} className={isLoading ? "opacity-0" : "opacity-100"} />
              {isLoading && <Loader2 size={20} className="animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-3">
            Press Enter to send, Shift + Enter for new line.
          </p>
        </div>
      </footer>
    </div>
  );
}
