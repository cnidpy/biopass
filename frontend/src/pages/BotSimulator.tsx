import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { Send, Bot, User, Smartphone, RefreshCw, QrCode, Sparkles, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  mediaAttachment?: any;
}

export const BotSimulator: React.FC = () => {
  const [phone, setPhone] = useState('595981123456');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: `👋 *¡Hola! Bienvenido a Doorway Cortex Bio-Pass (Mobile Health Passport).*\n\nTu pasaporte médico inteligente y seguro en tu bolsillo.\n⏱️ *El registro dura menos de 3 minutos.*\n\nPor favor, selecciona tu idioma de preferencia:\n*[1]* Español 🇪🇸\n*[2]* Guaraní 🇵🇾\n\n_Responde con 1 o 2 para comenzar._`,
      timestamp: '22:45',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSending(true);

    try {
      const res = await api.post('/bot/simulate-message', {
        from: phone,
        body: text,
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaAttachment: res.data.mediaAttachment,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Error de comunicación con el motor Baileys.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    handleSendMessage(cmd);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-emerald-400" />
            <span>Simulador de Bot WhatsApp (Baileys)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Prueba en vivo el Onboarding 100% Self-Service, OCR, pagos y comandos NLP sin requerir WhatsApp físico.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Número Emulado:</span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-36 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 text-center"
          />
        </div>
      </div>

      {/* WhatsApp Interface Wrapper */}
      <div className="max-w-md mx-auto bg-slate-900 border-4 border-slate-800 rounded-[36px] shadow-2xl overflow-hidden flex flex-col h-[650px] relative">
        
        {/* WhatsApp Header */}
        <div className="bg-[#075E54] px-4 py-3 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-950/40 flex items-center justify-center p-1 border border-white/20">
              <Bot className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Bio-Pass Official Assistant</h3>
              <span className="text-[10px] text-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                en línea • Baileys Engine
              </span>
            </div>
          </div>
          <button
            onClick={() => handleQuickCommand('REINICIAR')}
            title="Reiniciar conversación"
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-xs font-bold flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Message Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-md text-xs whitespace-pre-line leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#005c4b] text-white rounded-br-xs'
                    : 'bg-[#202c33] text-slate-100 rounded-bl-xs border border-slate-700/50'
                }`}
              >
                {msg.text}

                <div className="mt-1 flex items-center justify-end space-x-1 text-[9px] text-slate-400">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-[#111b21] border-t border-slate-800 p-2 overflow-x-auto flex space-x-2 text-[10px]">
          <button
            onClick={() => handleQuickCommand('1')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0"
          >
            [1] Español
          </button>
          <button
            onClick={() => handleQuickCommand('Juan Carlos Silva, 4892310')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0"
          >
            Cédula Demo
          </button>
          <button
            onClick={() => handleQuickCommand('Maria Perez, 0981123456')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0"
          >
            Contacto
          </button>
          <button
            onClick={() => handleQuickCommand('1, 3 - Alergia a Penicilina')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0"
          >
            Condiciones
          </button>
          <button
            onClick={() => handleQuickCommand('8492')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0"
          >
            PIN: 8492
          </button>
          <button
            onClick={() => handleQuickCommand('PAGAR')}
            className="px-2.5 py-1 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold shrink-0"
          >
            Confirmar Pago
          </button>
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="bg-[#202c33] p-3 flex items-center space-x-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-[#2a3942] text-white text-xs px-4 py-2.5 rounded-2xl outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={sending}
            className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-white flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
