/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  User, 
  Plane, 
  Briefcase, 
  Info, 
  MapPin, 
  Headphones, 
  CreditCard, 
  X,
  Calendar,
  ShieldCheck,
  Globe,
  RefreshCw,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  role: 'user' | 'model';
  text: string;
};

const QUICK_ACTIONS = [
  { label: "Flight Status", icon: Plane, text: "Can you check my flight status?" },
  { label: "Baggage Policy", icon: Briefcase, text: "What is the baggage allowance?" },
  { label: "Check-in Info", icon: Calendar, text: "When does online check-in open?" },
  { label: "Lost & Found", icon: MapPin, text: "I lost my luggage at the airport." },
  { label: "Special Assistance", icon: ShieldCheck, text: "How do I request a wheelchair?" },
  { label: "Refund Policy", icon: CreditCard, text: "What is your refund policy for tickets?" },
];

const RELATED_QUESTIONS = [
  "What is the carry-on weight limit?",
  "How can I change my seat?",
  "Do you provide meals on long-haul flights?",
  "What documents are needed for international travel?",
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef<string>('');

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', sessionId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('history', (history: Message[]) => {
      if (history.length === 0) {
        setMessages([
          { role: 'model', text: "Welcome to SkyLink Airways. I am AVI, your professional aviation assistant. How may I assist you with your travel requirements today?" }
        ]);
      } else {
        setMessages(history);
      }
    });

    socket.on('chunk', ({ text }: { text: string }) => {
      currentResponseRef.current += text;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return [...prev.slice(0, -1), { ...last, text: currentResponseRef.current }];
        } else {
          return [...prev, { role: 'model', text: currentResponseRef.current }];
        }
      });
    });

    socket.on('done', () => {
      setIsLoading(false);
      currentResponseRef.current = '';
    });

    socket.on('error', (err: string) => {
      setMessages(prev => [...prev, { role: 'model', text: err }]);
      setIsLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string = input) => {
    if (!text.trim() || isLoading || !socketRef.current) return;

    const userMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    currentResponseRef.current = '';

    socketRef.current.emit('message', { sessionId, text });
  };

  const resetChat = () => {
    window.location.reload();
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500",
      isDarkMode ? "bg-[#020617]" : "bg-[#F1F5F9]"
    )}>
      <div className={cn(
        "w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[92vh] border transition-all duration-500",
        isDarkMode ? "bg-[#0F172A]/80 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-200"
      )}>
        
        {/* Sidebar - Professional Aviation Theme */}
        <div className={cn(
          "hidden md:flex w-80 p-8 flex-col transition-colors duration-500",
          isDarkMode ? "bg-[#020617]/50 text-white border-r border-slate-800" : "bg-[#0F172A] text-white"
        )}>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Plane className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">AVI</h1>
              <p className="text-[10px] text-sky-400 uppercase tracking-[0.2em] font-bold">SkyLink Assistant</p>
            </div>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-6">Passenger Services</p>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.text)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group border border-transparent",
                      isDarkMode ? "hover:bg-white/5 hover:border-white/10" : "hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    <action.icon className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn(
              "p-6 rounded-3xl border transition-colors",
              isDarkMode ? "bg-sky-500/5 border-sky-500/10" : "bg-sky-500/10 border-sky-500/20"
            )}>
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-4 h-4 text-sky-400" />
                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Global Network</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                SkyLink Airways operates in 120+ destinations worldwide with 24/7 ground support.
              </p>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Related Inquiries</p>
              <div className="space-y-2">
                {RELATED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className={cn(
                      "w-full text-left p-3 text-xs rounded-xl transition-all border border-transparent",
                      isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700 flex-1 mr-2">
                <div className={cn(
                  "w-2 h-2 rounded-full shadow-[0_0_8px]",
                  isConnected ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                )} />
                <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">
                  {isConnected ? "Connected" : "Offline Mode"}
                </p>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <button 
              onClick={resetChat}
              className="w-full flex items-center gap-3 p-4 bg-sky-500/10 rounded-2xl border border-sky-500/20 hover:bg-sky-500/20 transition-colors text-sky-400"
            >
              <RefreshCw className="w-4 h-4" />
              <p className="text-xs font-bold tracking-wide uppercase">New Session</p>
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Header */}
          <div className={cn(
            "p-8 border-b flex items-center justify-between backdrop-blur-xl sticky top-0 z-10 transition-colors",
            isDarkMode ? "bg-[#0F172A]/50 border-slate-800" : "bg-white/80 border-slate-100"
          )}>
            <div className="flex items-center gap-5">
              <div className="md:hidden w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Plane className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-slate-900")}>
                  SkyLink Passenger Support
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Verified Assistant
                  </p>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">•</span>
                  <div className="flex items-center gap-1.5">
                    {isConnected ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", isConnected ? "text-emerald-500" : "text-red-500")}>
                      {isConnected ? "Real-time" : "Local Mode"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className={cn("p-3 rounded-2xl transition-all", isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400")}>
                <Info className="w-5 h-5" />
              </button>
              <button className={cn("p-3 rounded-2xl transition-all", isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400")}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth transition-colors",
              isDarkMode ? "bg-[#020617]/30" : "bg-[#FDFDFD]"
            )}
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm transition-colors",
                    msg.role === 'user' 
                      ? (isDarkMode ? "bg-slate-800" : "bg-slate-100") 
                      : (isDarkMode ? "bg-sky-500/20" : "bg-sky-50")
                  )}>
                    {msg.role === 'user' ? (
                      <User className={cn("w-5 h-5", isDarkMode ? "text-slate-400" : "text-slate-600")} />
                    ) : (
                      <Plane className={cn("w-5 h-5", isDarkMode ? "text-sky-400" : "text-sky-600")} />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[75%] p-5 rounded-3xl text-[15px] leading-relaxed shadow-lg transition-all",
                    msg.role === 'user' 
                      ? (isDarkMode ? "bg-sky-600 text-white rounded-tr-none" : "bg-[#0F172A] text-white rounded-tr-none") 
                      : (isDarkMode ? "bg-[#1E293B] border border-slate-800 text-slate-200 rounded-tl-none" : "bg-white border border-slate-100 text-slate-700 rounded-tl-none")
                  )}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && !currentResponseRef.current && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
                  isDarkMode ? "bg-sky-500/20" : "bg-sky-50"
                )}>
                  <Plane className={cn("w-5 h-5", isDarkMode ? "text-sky-400" : "text-sky-600")} />
                </div>
                <div className={cn(
                  "p-5 rounded-3xl rounded-tl-none flex gap-1.5 items-center shadow-sm",
                  isDarkMode ? "bg-[#1E293B] border border-slate-800" : "bg-white border border-slate-100"
                )}>
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Mobile Quick Actions */}
          <div className={cn(
            "md:hidden px-8 py-3 border-t overflow-x-auto flex gap-3 no-scrollbar transition-colors",
            isDarkMode ? "bg-[#0F172A] border-slate-800" : "bg-white border-slate-100"
          )}>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSend(action.text)}
                className={cn(
                  "whitespace-nowrap flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"
                )}
              >
                <action.icon className="w-3.5 h-3.5 text-sky-500" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className={cn(
            "p-8 border-t transition-colors",
            isDarkMode ? "bg-[#0F172A] border-slate-800" : "bg-white border-slate-100"
          )}>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Inquire about flights, baggage, or reservations..."
                className={cn(
                  "w-full border rounded-2xl py-5 pl-8 pr-16 text-[15px] transition-all outline-none font-medium",
                  isDarkMode 
                    ? "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/30" 
                    : "bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-sky-500/10 focus:bg-white focus:border-sky-500/30"
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-3 p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg",
                  isDarkMode ? "bg-sky-600 text-white hover:bg-sky-500 shadow-sky-600/20" : "bg-[#0F172A] text-white hover:bg-slate-900 shadow-slate-900/10"
                )}
              >
                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-6">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                SkyLink Airways • Official Support Channel
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Headphones className="w-3 h-3 text-sky-500" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">24/7 Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
