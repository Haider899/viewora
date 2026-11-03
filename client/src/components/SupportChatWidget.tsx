import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { SupportConversation, SupportFaq, SupportMessage } from '../types/index.js';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Bot,
  UserCheck,
  Sparkles,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react';

export const SupportChatWidget: React.FC = () => {
  const { user } = useAuth();

  // If user is not logged in, support agent chat is completely unavailable and hidden
  if (!user) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);

  // File attachment state
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Clean up any legacy anonymous convo ID from localStorage
    localStorage.removeItem('vistara_support_convo_id');
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load FAQs once
  useEffect(() => {
    api.getSupportFaqs().then((res) => {
      if (res.success && res.data) {
        setFaqs(res.data);
      }
    });
  }, []);

  // Initialize or fetch conversation when widget opened for logged-in user
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    const initChat = async () => {
      setLoading(true);
      try {
        const userConvoKey = `vistara_support_convo_id_${user.id}`;
        const storedConvoId = localStorage.getItem(userConvoKey) || undefined;
        const res = await api.getOrCreateSupportConversation({
          conversationId: storedConvoId,
        });

        if (isMounted && res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
          localStorage.setItem(userConvoKey, res.data.id);
        }
      } catch (err) {
        console.error('Error starting support conversation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // Periodic polling for agent replies when chat is open
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getSupportConversation(conversation.id);
        if (res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        // silent fail on polling error
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, conversation?.id]);

  // Handle File Selection (Base64)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Attachment size must be under 5 MB.');
      return;
    }

    setAttachmentName(file.name);
    setAttachmentType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentData(null);
    setAttachmentName(null);
    setAttachmentType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent && !attachmentData) return;
    if (!conversation) return;

    setSending(true);
    setInputMessage('');

    const attUrl = attachmentData || undefined;
    const attName = attachmentName || undefined;
    removeAttachment();

    try {
      const res = await api.sendSupportMessage(conversation.id, {
        message: messageContent || (attName ? `Attached file: ${attName}` : 'Attachment'),
        attachmentUrl: attUrl,
        attachmentName: attName,
      });

      if (res.success && res.data) {
        setConversation(res.data.conversation);
        setMessages(res.data.conversation.messages || []);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Escalate to Human Support Agent
  const handleEscalate = async () => {
    if (!conversation) return;
    setEscalating(true);
    try {
      const res = await api.escalateSupportConversation(conversation.id);
      if (res.success && res.data) {
        setConversation(res.data.conversation);
        setMessages(res.data.conversation.messages || []);
      }
    } catch (err) {
      console.error('Error escalating conversation:', err);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <>
      {/* 1. Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-700/25 hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-emerald-400/30"
          aria-label="Open Live Chat Support"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-700"></span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight">Live Support</span>
            <span className="text-[10px] text-emerald-100 font-medium leading-none">Instant Help & FAQs</span>
          </div>
        </button>
      )}

      {/* 2. Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[580px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
                {conversation?.status === 'AGENT_ACTIVE' ? (
                  <UserCheck className="w-5 h-5 text-slate-950" />
                ) : (
                  <Bot className="w-5 h-5 text-slate-950" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  Vistara Support Desk
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                </span>
                <span className="text-[11px] text-slate-300">
                  {conversation?.status === 'WAITING_FOR_AGENT'
                    ? '⏳ Agent connecting...'
                    : conversation?.status === 'AGENT_ACTIVE'
                    ? `👨‍💼 ${conversation.assignedTo?.fullName || 'Support Specialist'}`
                    : '🤖 AI Assistant (24/7)'}
                </span>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5">
              {conversation?.status === 'BOT' && (
                <button
                  onClick={handleEscalate}
                  disabled={escalating}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Talk directly to a human support agent"
                >
                  <UserCheck className="w-3 h-3" />
                  {escalating ? 'Connecting...' : 'Talk to Agent'}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Alert Bar (if waiting for human agent) */}
          {conversation?.status === 'WAITING_FOR_AGENT' && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-[11px] text-amber-800">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                Request forwarded to support staff. Agent will reply here.
              </span>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Connecting to support...</span>
              </div>
            ) : (
              <>
                {/* Message items */}
                {messages.map((msg) => {
                  const isUser = msg.senderType === 'USER';
                  const isAgent = msg.senderType === 'AGENT';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] font-semibold text-slate-400 px-1">
                        {isUser ? 'You' : isAgent ? `👨‍💼 ${msg.senderName}` : '🤖 Vistara AI'}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                          isUser
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                            : isAgent
                            ? 'bg-purple-50 text-slate-900 border border-purple-200 rounded-tl-xs'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        }`}
                      >
                        {msg.message}

                        {/* Attachment display if present */}
                        {msg.attachmentUrl && (
                          <div className="mt-2.5 pt-2 border-t border-black/10">
                            {msg.attachmentUrl.startsWith('data:image/') ||
                            msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                              <div
                                onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                                className="cursor-pointer group relative rounded-xl overflow-hidden border border-black/10 max-h-40 bg-black/5"
                              >
                                <img
                                  src={msg.attachmentUrl}
                                  alt={msg.attachmentName || 'Attachment'}
                                  className="w-full object-cover group-hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                                  Click to expand
                                </div>
                              </div>
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                download={msg.attachmentName || 'attachment'}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-xl bg-black/5 hover:bg-black/10 text-inherit font-medium transition-colors text-[11px]"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="truncate max-w-[180px]">
                                  {msg.attachmentName || 'Download File'}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick FAQ Suggestion Chips */}
          {faqs.length > 0 && conversation?.status === 'BOT' && (
            <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Suggested:
              </span>
              {faqs.slice(0, 4).map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => handleSendMessage(faq.question)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[10px] font-semibold whitespace-nowrap transition-all shadow-2xs"
                >
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Preview Chip */}
          {attachmentData && (
            <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium truncate max-w-[240px]">
                  {attachmentName}
                </span>
              </div>
              <button
                onClick={removeAttachment}
                className="w-5 h-5 rounded-full hover:bg-emerald-200/80 flex items-center justify-center text-emerald-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              title="Attach screenshot or receipt (Max 5MB)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                conversation?.status === 'WAITING_FOR_AGENT'
                  ? 'Type your message for support agent...'
                  : 'Ask question or type "agent"...'
              }
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={sending || (!inputMessage.trim() && !attachmentData)}
              className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-white flex items-center justify-center shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
