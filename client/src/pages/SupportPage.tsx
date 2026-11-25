import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { SupportConversation, SupportMessage } from '../types/index.js';
import { FormattedChatText } from '../components/FormattedChatText.js';
import {
  Headphones,
  UserCheck,
  Send,
  Paperclip,
  Clock,
  X,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Mail,
  HelpCircle,
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const key = `uads_support_convo_id_${user.id}`;
        const storedId = localStorage.getItem(key) || undefined;
        const res = await api.getOrCreateSupportConversation({ conversationId: storedId });
        if (mounted && res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
          localStorage.setItem(key, res.data.id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!conversation?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getSupportConversation(conversation.id);
        if (res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
        }
      } catch {}
    }, 3500);
    return () => clearInterval(interval);
  }, [conversation?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAttachmentData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentData(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (customText?: string) => {
    const text = (customText || inputMessage).trim();
    if ((!text && !attachmentData) || !conversation) return;
    setSending(true);
    setInputMessage('');
    const attUrl = attachmentData || undefined;
    const attName = attachmentName || undefined;
    removeAttachment();
    try {
      const res = await api.sendSupportMessage(conversation.id, {
        message: text || (attName ? `Attached file: ${attName}` : 'Attachment'),
        attachmentUrl: attUrl,
        attachmentName: attName,
      });
      if (res.success && res.data) {
        setConversation(res.data.conversation);
        setMessages(res.data.conversation.messages || []);
      }
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async () => {
    if (!conversation) return;
    setEscalating(true);
    try {
      const res = await api.escalateSupportConversation(conversation.id);
      if (res.success && res.data) {
        setConversation(res.data.conversation);
        setMessages(res.data.conversation.messages || []);
      }
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page-in">
      {/* Left Sidebar: Quick Account Checks & Direct Escalation */}
      <div className="lg:col-span-4 space-y-5">
        <div className="card-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">U-Ads Support</h3>
              <p className="text-xs text-slate-500">Available 24/7 for all account questions</p>
            </div>
          </div>

          {conversation?.ticketNumber && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Ticket</span>
              <span className="font-mono font-bold text-slate-900">{conversation.ticketNumber}</span>
            </div>
          )}

          {conversation?.status === 'BOT' && (
            <button
              type="button"
              onClick={handleEscalate}
              disabled={escalating}
              className="btn-primary w-full"
            >
              <UserCheck className="w-4 h-4" />
              <span>{escalating ? 'Connecting…' : 'Talk to a human'}</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Typical deposit verification: 10–30 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>support@u-ads.com</span>
            </div>
          </div>
        </div>

        <div className="card-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Quick Status Checks</span>
          </div>
          <div className="space-y-2">
            {[
              'Check my deposit status',
              'Check my withdrawal status',
              'Check my wallet balance',
              'Check my referral progress',
              'What are the withdrawal rules?',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                className="w-full text-left px-3.5 py-2.5 rounded-[10px] bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Main Column: Full Synchronized Conversation */}
      <div className="lg:col-span-8 card-white overflow-hidden flex flex-col h-[640px] max-h-[75vh]">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              {conversation?.status === 'AGENT_ACTIVE' ? (
                <UserCheck className="w-4 h-4 text-white" />
              ) : (
                <Headphones className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                U-Ads Support Conversation
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-slate-300">
                {conversation?.status === 'WAITING_FOR_AGENT'
                  ? 'Waiting in live support queue'
                  : conversation?.status === 'AGENT_ACTIVE'
                  ? `Connected with ${conversation.assignedTo?.fullName || 'Support Specialist'}`
                  : 'Instant account-aware help'}
              </div>
            </div>
          </div>

          {conversation?.status === 'BOT' && (
            <button
              type="button"
              onClick={handleEscalate}
              disabled={escalating}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {escalating ? 'Connecting…' : 'Talk to a human'}
            </button>
          )}
        </div>

        {conversation?.status === 'WAITING_FOR_AGENT' && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <span className="font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Queue position #{conversation.queuePosition || 1} · Estimated wait ~
              {conversation.estimatedWaitMinutes || 3} min
            </span>
            {conversation.ticketNumber && (
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {conversation.ticketNumber}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 w-2/3 rounded-2xl skeleton-shimmer" />
              <div className="h-12 w-1/2 ml-auto rounded-2xl skeleton-shimmer" />
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.senderType === 'USER';
              const isAgent = msg.senderType === 'AGENT';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <span className="text-[11px] font-semibold text-slate-400 px-1">
                    {isUser ? 'You' : isAgent ? msg.senderName : 'U-Ads Support'}
                  </span>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : isAgent
                        ? 'bg-emerald-50 text-slate-900 border border-emerald-200 rounded-tl-xs'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    <FormattedChatText text={msg.message} isUser={isUser} />
                    {msg.attachmentUrl && (
                      <div className="mt-2 pt-2 border-t border-black/10">
                        {msg.attachmentUrl.startsWith('data:image/') ? (
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.attachmentName || 'Attachment'}
                            className="max-h-48 rounded-xl border border-black/10"
                          />
                        ) : (
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName || 'attachment'}
                            className="flex items-center gap-2 text-xs underline"
                          >
                            <FileText className="w-4 h-4" />
                            <span>{msg.attachmentName || 'Download attachment'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {attachmentData && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-2 truncate">
              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{attachmentName}</span>
            </span>
            <button type="button" onClick={removeAttachment} className="p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary !px-3"
            title="Attach receipt or screenshot"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a message..."
            className="flex-1 h-10 px-3.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={sending || (!inputMessage.trim() && !attachmentData)}
            className="btn-primary !px-4"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
