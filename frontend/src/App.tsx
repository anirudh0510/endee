import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, FileText, Bot, User, Loader2, Plus, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm your Personal Knowledge Assistant. Upload a PDF to get started!", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, { message: input });
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorDetail = error.response?.data?.detail || "Sorry, I encountered an error. Please make sure the backend is running.";
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorDetail,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE}/upload`, formData);
      const botMsg: Message = {
        id: Date.now().toString(),
        text: `Successfully indexed "${file.name}". You can now ask questions about it!`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload PDF. Please try again.');
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="glass"
        style={{ width: '300px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', borderRight: '1px solid var(--card-border)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="glow-shadow" style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '12px' }}>
            <Bot size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>MindVault</h2>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Documents</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {fileName ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}
              >
                <FileText size={18} color="var(--primary-color)" />
                <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
              </motion.div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No documents uploaded</p>
            )}
          </div>
        </div>

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
            padding: '1rem', borderRadius: '12px', background: 'var(--primary-color)', 
            color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
        >
          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          {isUploading ? 'Indexing...' : 'Upload PDF'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" style={{ display: 'none' }} />
      </motion.aside>

      {/* Main Chat Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ 
          flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' 
        }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: '1rem'
                }}
              >
                {msg.sender === 'bot' && (
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={20} color="var(--primary-color)" />
                  </div>
                )}
                <div style={{ 
                  maxWidth: '70%', 
                  padding: '1rem 1.25rem', 
                  borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: msg.sender === 'user' ? 'var(--primary-color)' : 'var(--card-bg)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--card-border)',
                  color: 'white',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
                }}>
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="var(--secondary-color)" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} color="var(--primary-color)" />
              </div>
              <div className="glass" style={{ padding: '1rem', borderRadius: '20px', display: 'flex', gap: '4px' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '2rem', background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)' }}>
          <div className="glass" style={{ 
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', 
            borderRadius: '16px', maxWidth: '900px', margin: '0 auto' 
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about your documents..."
              style={{ 
                flex: 1, background: 'none', border: 'none', color: 'white', 
                fontSize: '1rem', outline: 'none', padding: '0.5rem 0'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              style={{ 
                background: 'var(--primary-color)', border: 'none', borderRadius: '10px', 
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', cursor: 'pointer', color: 'white',
                opacity: (!input.trim() || isTyping) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
