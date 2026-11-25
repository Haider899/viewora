import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { SupportConversation, SupportFaq, SupportMessage } from '../types/index.js';
import { FormattedChatText } from './FormattedChatText.js';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Headphones,
  UserCheck,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Clock,
  ArrowRight,
  Mail,
} from 'lucide-react';

interface SupportChatWidgetProps {
  /** Optional navigate handler for public visitors or opening the full Support page */
  navigate?: (route: string) => void;
  /** Hide floating button when already viewing the dedicated Support page */
  hidden?: boolean;
}

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ navigate, hidden = false }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [selectedGuestFaq, setSelectedGuestFaq] = useState<SupportFaq | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);

  // File attachment state
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.removeItem('vistara_support_convo_id');
    localStorage.removeItem('uads_support_convo_id');
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Load FAQs once (works for both guests and signed-in members)
  useEffect(() => {
    api
      .getSupportFaqs()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setFaqs(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Load conversation when opened by logged-in member
  useEffect(() => {
    if (!isOpen || !user) return;
    let isMounted = true;
    const initChat = async () => {
      setLoading(true);
      try {
        const userConvoKey = `uads_support_convo_id_${user.id}`;
        const storedConvoId = localStorage.getItem(userConvoKey) || undefined;
        const res = await api.getOrCreateSupportConversation({ conversationId: storedConvoId });
        if (isMounted && res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
          localStorage.setItem(userConvoKey, res.data.id);
        }
      } catch (err) {
        console.error('Error loading support conversation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initChat();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // Poll for agent updates while open
  useEffect(() => {
    if (!isOpen || !user || !conversation?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getSupportConversation(conversation.id);
        if (res.success && res.data) {
          setConversation(res.data);
          setMessages(res.data.messages || []);
        }
      } catch {
        // silent
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, user, conversation?.id]);

  if (hidden) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
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
      console.error('Error sending support message:', err);
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
    } catch (err) {
      console.error('Error escalating conversation:', err);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <>
      {/* Sleek Compact Circular Floating Shortcut (stays clear of mobile bottom bar) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-13 h-13 p-3.5 rounded-full bg-slate-900 hover:bg-emerald-600 text-white shadow-lg shadow-slate-900/20 hover:shadow-emerald-600/30 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95 flex items-center justify-center cursor-pointer"
          aria-label="Open U-Ads Support"
          title="U-Ads Support"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </button>
      )}

      {/* Support Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[560px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-modal-in">
          {/* Unified Header — Single Brand: U-Ads Support */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                {conversation?.status === 'AGENT_ACTIVE' ? (
                  <UserCheck className="w-4 h-4 text-white" />
                ) : (
                  <Headphones className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  U-Ads Support
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {!user
                    ? 'Quick Answers & Help'
                    : conversation?.status === 'WAITING_FOR_AGENT'
                    ? 'Connecting you to a specialist'
                    : conversation?.status === 'AGENT_ACTIVE'
                    ? conversation.assignedTo?.fullName || 'Live Specialist'
                    : 'Online 24/7'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {user && conversation?.status === 'BOT' && (
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={escalating}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {escalating ? 'Connecting…' : 'Talk to a human'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Support"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logged-out Guest Support Experience (§6) */}
          {!user ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900">How can we help you today?</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Browse instant answers below or sign in to chat live with our support team about your account.
                </p>
              </div>

              {selectedGuestFaq ? (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 animate-page-in">
                  <button
                    type="button"
                    onClick={() => setSelectedGuestFaq(null)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    ← Back to topics
                  </button>
                  <div className="text-xs font-bold text-slate-900">{selectedGuestFaq.question}</div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <FormattedChatText text={selectedGuestFaq.answer} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Common Questions
                  </div>
                  {(faqs.length > 0
                    ? faqs
                    : [
                        {
                          id: 'fallback-1',
                          category: 'Deposits',
                          question: 'How long does deposit verification take?',
                          keywords: ['deposit'],
                          answer: 'USD deposits are normally verified within **10 to 30 minutes** after you submit your transaction reference and receipt.',
                        },
                        {
                          id: 'fallback-2',
                          category: 'Withdrawals',
                          question: 'What is the minimum withdrawal amount?',
                          keywords: ['withdrawal'],
                          answer: 'The minimum USD withdrawal is **$10.00**, available via Crypto (USDT TRC-20) or USD Bank Wire.',
                        },
                      ]
                  ).map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => setSelectedGuestFaq(faq)}
                      className="w-full text-left p-3 rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 transition-all cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Email us: <strong className="text-slate-900">support@u-ads.com</strong>
                  </span>
                </div>
                {navigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate('login');
                    }}
                    className="btn-primary w-full"
                  >
                    Sign In for Live Chat
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Queue Banner (Ticket #, Queue Position, Est. Wait) */}
              {conversation?.status === 'WAITING_FOR_AGENT' && (
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 space-y-1 text-[11px] text-amber-900">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Waiting for a support specialist
                    </span>
                    {conversation.ticketNumber && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                        {conversation.ticketNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-amber-700">
                    <span>Queue position: #{conversation.queuePosition || 1}</span>
                    <span>Estimated wait: ~{conversation.estimatedWaitMinutes || 3} min</span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
                {loading ? (
                  <div className="space-y-3 py-4">
                    <div className="h-14 w-3/4 rounded-2xl skeleton-shimmer" />
                    <div className="h-10 w-1/2 ml-auto rounded-2xl skeleton-shimmer" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isUser = msg.senderType === 'USER';
                      const isAgent = msg.senderType === 'AGENT';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <span className="text-[10px] font-semibold text-slate-400 px-1 flex items-center gap-1">
                            {isUser ? (
                              'You'
                            ) : isAgent ? (
                              <>
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                {msg.senderName}
                              </>
                            ) : (
                              <>
                                <Headphones className="w-3 h-3 text-slate-400" />
                                U-Ads Support
                              </>
                            )}
                          </span>

                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
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
                                {msg.attachmentUrl.startsWith('data:image/') ||
                                msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage(msg.attachmentUrl || null)}
                                    className="block rounded-xl overflow-hidden border border-black/10 max-h-36 cursor-pointer"
                                  >
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || 'Attachment'}
                                      className="w-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <a
                                    href={msg.attachmentUrl}
                                    download={msg.attachmentName || 'attachment'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-black/5 text-inherit font-medium text-[11px]"
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

                          <span className="text-[10px] text-slate-400 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Account Prompts */}
              {conversation?.status === 'BOT' && (
                <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    'Check my deposit status',
                    'Check my wallet balance',
                    'Check my referral progress',
                    'Withdrawal limits',
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(promptText)}
                      className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              )}

              {/* Attachment Preview */}
              {attachmentData && (
                <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2 truncate">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-medium truncate max-w-[240px]">{attachmentName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="w-5 h-5 rounded-full hover:bg-emerald-200/80 flex items-center justify-center text-emerald-800 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Input Footer — clean placeholder, no internal trigger leak */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
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
                  className="w-9 h-9 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title="Attach receipt or screenshot (Max 5 MB)"
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
                      handleSendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={sending || (!inputMessage.trim() && !attachmentData)}
                  className="w-9 h-9 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl max-h-[90vh] animate-modal-in">
            <img
              src={lightboxImage}
              alt="Attachment Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-white flex items-center justify-center shadow-lg cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
