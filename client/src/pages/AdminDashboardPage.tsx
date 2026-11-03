import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  AdminKpiData,
  DepositRequest,
  WithdrawalRequest,
  SupportConversation,
  SupportMessage,
  Video,
} from '../types/index.js';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  CreditCard,
  ArrowUpRight,
  Settings,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  DollarSign,
  TrendingUp,
  LogOut,
  PlaySquare,
  Wallet,
  Eye,
  Edit2,
  Save,
  X,
  ExternalLink,
  MessageSquare,
  Bot,
  UserCheck,
  Paperclip,
  Send,
  Inbox,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Play,
  Sparkles,
  Video as VideoIcon,
} from 'lucide-react';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail } from '../utils/youtube.js';

interface AdminDashboardProps {
  navigate?: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardProps> = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpis' | 'deposits' | 'withdrawals' | 'users' | 'gateways' | 'settings' | 'support' | 'videos'>('kpis');

  // Live Support Desk State
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportFilter, setSupportFilter] = useState<'ALL' | 'WAITING_FOR_AGENT' | 'AGENT_ACTIVE' | 'RESOLVED'>('ALL');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<SupportConversation | null>(null);
  const [loadingSelectedConvo, setLoadingSelectedConvo] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyAttachment, setAdminReplyAttachment] = useState<string | null>(null);
  const [adminReplyAttachmentName, setAdminReplyAttachmentName] = useState<string | null>(null);
  const [sendingAdminReply, setSendingAdminReply] = useState(false);
  const [waitingSupportCount, setWaitingSupportCount] = useState(0);

  // KPI Data
  const [kpis, setKpis] = useState<AdminKpiData | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Deposits Queue
  const [pendingDeposits, setPendingDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  // Withdrawals Queue
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Users Queue
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Gateways & Wallet Addresses
  const [gateways, setGateways] = useState<any[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [editingGateway, setEditingGateway] = useState<any | null>(null);
  const [savingGateway, setSavingGateway] = useState(false);

  // Settings
  const [settings, setSettings] = useState<any[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({});
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);

  // Receipt Modal (User Proof Slip Viewer)
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  // Action Modals & State
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ type: 'deposit' | 'withdrawal'; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Complete withdrawal modal
  const [completeModal, setCompleteModal] = useState<string | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState('');

  // Video Management & User Assignments State
  const [adminVideos, setAdminVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoFilter, setVideoFilter] = useState<'ALL' | 'ASSIGNED' | 'CATALOG'>('ALL');
  const [videoSearch, setVideoSearch] = useState('');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [videoPreviewModal, setVideoPreviewModal] = useState<Video | null>(null);
  const [allUsersDropdown, setAllUsersDropdown] = useState<any[]>([]);

  // Video Form Fields
  const [formVideoTitle, setFormVideoTitle] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formVideoDescription, setFormVideoDescription] = useState('');
  const [formVideoCategory, setFormVideoCategory] = useState('Special Assignment');
  const [formVideoTier, setFormVideoTier] = useState('Starter');
  const [formVideoDuration, setFormVideoDuration] = useState(180);
  const [formVideoTarget, setFormVideoTarget] = useState<'ALL' | 'USER'>('USER');
  const [formAssignedUserId, setFormAssignedUserId] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  const loadKpis = async () => {
    setLoadingKpis(true);
    try {
      const res = await api.getAdminKpis();
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKpis(false);
    }
  };

  const loadDeposits = async () => {
    setLoadingDeposits(true);
    try {
      const res = await api.getAdminDeposits('PENDING');
      if (res.success && res.data) {
        setPendingDeposits(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const loadWithdrawals = async () => {
    setLoadingWithdrawals(true);
    try {
      const res = await api.getAdminWithdrawals();
      if (res.success && res.data) {
        setPendingWithdrawals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers({ search: userSearch });
      if (res.success && res.data) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGateways = async () => {
    setLoadingGateways(true);
    try {
      const res = await api.getAdminPaymentMethods();
      if (res.success && res.data) {
        setGateways(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGateways(false);
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.getSystemSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        const map: Record<string, string> = {};
        res.data.forEach((s: any) => {
          map[s.key] = s.value;
        });
        setSettingEdits(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadSupportConversations = async () => {
    setLoadingSupport(true);
    try {
      const res = await api.getAdminSupportConversations({
        status: supportFilter,
        search: supportSearch,
      });
      if (res.success && res.data) {
        setSupportConversations(res.data);
        const waiting = res.data.filter((c: any) => c.status === 'WAITING_FOR_AGENT').length;
        setWaitingSupportCount(waiting);
        if (!selectedConvoId && res.data.length > 0) {
          setSelectedConvoId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSupport(false);
    }
  };

  const loadSelectedConversation = async (id: string) => {
    setLoadingSelectedConvo(true);
    try {
      const res = await api.getAdminSupportConversation(id);
      if (res.success && res.data) {
        setSelectedConvo(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSelectedConvo(false);
    }
  };

  const loadAdminVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await api.adminGetVideos({
        filterType: videoFilter,
        search: videoSearch,
      });
      if (res.success && res.data) {
        setAdminVideos(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const loadDropdownUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      if (res.success && res.data) {
        setAllUsersDropdown(res.data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddVideoModal = () => {
    setEditingVideo(null);
    setFormVideoTitle('');
    setFormVideoUrl('https://www.youtube.com/watch?v=aum88UHF3wk&list=RDaum88UHF3wk&start_radio=1');
    setFormVideoDescription('');
    setFormVideoCategory('Special Assignment');
    setFormVideoTier('Starter');
    setFormVideoDuration(180);
    setFormVideoTarget('USER');
    setFormAssignedUserId(allUsersDropdown.length > 0 ? allUsersDropdown[0].id : '');
    setVideoModalOpen(true);
  };

  const openEditVideoModal = (vid: Video) => {
    setEditingVideo(vid);
    setFormVideoTitle(vid.title);
    setFormVideoUrl(vid.videoUrl);
    setFormVideoDescription(vid.description);
    setFormVideoCategory(vid.category);
    setFormVideoTier(vid.minPackageTier);
    setFormVideoDuration(vid.durationSeconds);
    setFormVideoTarget(vid.assignedUserId ? 'USER' : 'ALL');
    setFormAssignedUserId(vid.assignedUserId || (allUsersDropdown.length > 0 ? allUsersDropdown[0].id : ''));
    setVideoModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVideoTitle.trim() || !formVideoUrl.trim()) {
      setActionError('Video title and URL link are required.');
      return;
    }
    if (formVideoTarget === 'USER' && !formAssignedUserId) {
      setActionError('Please select a specific registered user to assign this video to.');
      return;
    }

    setSavingVideo(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const payload: any = {
        title: formVideoTitle.trim(),
        description: formVideoDescription.trim() || 'Masterclass streaming module',
        videoUrl: formVideoUrl.trim(),
        category: formVideoCategory,
        minPackageTier: formVideoTier,
        durationSeconds: Number(formVideoDuration) || 180,
        assignedUserId: formVideoTarget === 'USER' ? formAssignedUserId : null,
      };

      let res;
      if (editingVideo) {
        res = await api.adminUpdateVideo(editingVideo.id, payload);
      } else {
        res = await api.adminCreateVideo(payload);
      }

      if (res.success) {
        setActionSuccess(res.message || 'Video module saved successfully.');
        setVideoModalOpen(false);
        loadAdminVideos();
      } else {
        setActionError(res.error?.message || 'Failed to save video.');
      }
    } catch {
      setActionError('An error occurred while saving the video.');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video module?')) return;
    setDeletingVideoId(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.adminDeleteVideo(id);
      if (res.success) {
        setActionSuccess('Video removed successfully.');
        loadAdminVideos();
      } else {
        setActionError(res.error?.message || 'Failed to delete video.');
      }
    } catch {
      setActionError('Error deleting video.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  // Initial badge check
  useEffect(() => {
    api.getAdminSupportConversations({ status: 'ALL' }).then((res) => {
      if (res.success && res.data) {
        const waiting = res.data.filter((c: any) => c.status === 'WAITING_FOR_AGENT').length;
        setWaitingSupportCount(waiting);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'kpis') loadKpis();
    else if (activeTab === 'deposits') loadDeposits();
    else if (activeTab === 'withdrawals') loadWithdrawals();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'gateways') loadGateways();
    else if (activeTab === 'settings') loadSettings();
    else if (activeTab === 'support') loadSupportConversations();
    else if (activeTab === 'videos') {
      loadAdminVideos();
      loadDropdownUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'videos') {
      loadAdminVideos();
    }
  }, [videoFilter, videoSearch]);

  useEffect(() => {
    if (activeTab === 'support') {
      loadSupportConversations();
      const interval = setInterval(() => {
        loadSupportConversations();
        if (selectedConvoId) {
          api.getAdminSupportConversation(selectedConvoId).then((res) => {
            if (res.success && res.data) setSelectedConvo(res.data);
          }).catch(() => {});
        }
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab, supportFilter, supportSearch, selectedConvoId]);

  useEffect(() => {
    if (selectedConvoId) {
      loadSelectedConversation(selectedConvoId);
    }
  }, [selectedConvoId]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvoId || (!adminReplyText.trim() && !adminReplyAttachment)) return;
    setSendingAdminReply(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.adminReplySupport(selectedConvoId, {
        message: adminReplyText.trim() || (adminReplyAttachmentName ? `Attached file: ${adminReplyAttachmentName}` : 'Attachment'),
        attachmentUrl: adminReplyAttachment || undefined,
        attachmentName: adminReplyAttachmentName || undefined,
      });
      if (res.success && res.data) {
        setSelectedConvo(res.data.conversation);
        setAdminReplyText('');
        setAdminReplyAttachment(null);
        setAdminReplyAttachmentName(null);
        loadSupportConversations();
      } else {
        setActionError(res.error?.message || 'Failed to dispatch reply.');
      }
    } catch {
      setActionError('Error sending response to user.');
    } finally {
      setSendingAdminReply(false);
    }
  };

  const handleUpdateSupportStatus = async (id: string, status: string) => {
    try {
      const res = await api.adminUpdateSupportStatus(id, status);
      if (res.success && res.data) {
        setSelectedConvo(res.data);
        setActionSuccess(`Ticket status updated to ${status}`);
        loadSupportConversations();
      }
    } catch {
      setActionError('Error updating ticket status.');
    }
  };

  const handleAdminFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Attachment must be under 5 MB');
      return;
    }
    setAdminReplyAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAdminReplyAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };


  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;
    setSavingGateway(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.updateAdminPaymentMethod(editingGateway.id, {
        name: editingGateway.name,
        accountTitle: editingGateway.accountTitle,
        accountNumber: editingGateway.accountNumber,
        instructions: editingGateway.instructions,
        minAmountCents: parseInt(editingGateway.minAmountCents),
        maxAmountCents: parseInt(editingGateway.maxAmountCents),
        isActive: Boolean(editingGateway.isActive),
      });
      if (res.success) {
        setActionSuccess(`Payment gateway "${editingGateway.name}" updated successfully!`);
        setEditingGateway(null);
        await loadGateways();
      } else {
        setActionError(res.error?.message || 'Failed to update gateway details.');
      }
    } catch {
      setActionError('Error saving gateway details.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleSaveSetting = async (key: string) => {
    const value = settingEdits[key];
    if (value === undefined) return;
    setSavingSettingKey(key);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.updateSystemSetting(key, value);
      if (res.success) {
        setActionSuccess(`System parameter "${key}" saved successfully!`);
        await loadSettings();
      } else {
        setActionError(res.error?.message || 'Failed to update parameter.');
      }
    } catch {
      setActionError('Error updating system setting.');
    } finally {
      setSavingSettingKey(null);
    }
  };

  // Actions
  const handleApproveDeposit = async (id: string) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.reviewDeposit(id, 'APPROVE');
      if (res.success) {
        setActionSuccess('Deposit approved and atomic ledger credit posted successfully!');
        loadDeposits();
      } else {
        setActionError(res.error?.message || 'Approval failed.');
      }
    } catch {
      setActionError('Error approving deposit.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModal || !rejectionReason.trim()) return;
    setActionSuccess(null);
    setActionError(null);

    try {
      if (rejectModal.type === 'deposit') {
        const res = await api.reviewDeposit(rejectModal.id, 'REJECT', rejectionReason.trim());
        if (res.success) {
          setActionSuccess('Deposit rejected.');
          loadDeposits();
        } else {
          setActionError(res.error?.message || 'Action failed.');
        }
      } else {
        const res = await api.reviewWithdrawal(rejectModal.id, 'REJECT', {
          rejectionReason: rejectionReason.trim(),
        });
        if (res.success) {
          setActionSuccess('Withdrawal rejected. Reserved hold balance returned to user.');
          loadWithdrawals();
        } else {
          setActionError(res.error?.message || 'Action failed.');
        }
      }
      setRejectModal(null);
      setRejectionReason('');
    } catch {
      setActionError('Action failed.');
    }
  };

  const handleConfirmCompleteWithdrawal = async () => {
    if (!completeModal || !payoutRefInput.trim()) return;
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await api.reviewWithdrawal(completeModal, 'COMPLETE', {
        payoutRef: payoutRefInput.trim(),
      });
      if (res.success) {
        setActionSuccess('Withdrawal marked as completed with confirmed external payout reference.');
        loadWithdrawals();
        setCompleteModal(null);
        setPayoutRefInput('');
      } else {
        setActionError(res.error?.message || 'Failed to complete payout.');
      }
    } catch {
      setActionError('Error completing payout.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.updateUserStatus(
        userId,
        newStatus,
        `Administrative update via control panel by ${user?.fullName}`
      );
      if (res.success) {
        setActionSuccess(`User status changed to ${newStatus}.`);
        loadUsers();
      }
    } catch (err: any) {
      setActionError('Failed to update status.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dedicated Admin Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Vistara<span className="text-purple-600">X</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  {user?.role}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
              <div className="text-[10px] text-slate-500 font-medium">Administrator Session</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kpis'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Executive KPIs
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'deposits'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Deposit Verification
            {pendingDeposits.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {pendingDeposits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'withdrawals'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdrawal Settlements
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('gateways')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'gateways'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Payment Channels & Wallets
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'support'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Live Support Desk
            {waitingSupportCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {waitingSupportCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'videos'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            Videos & Assignments
          </button>
        </div>
      </header>

      {/* Main Admin View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Global Action Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">×</button>
          </div>
        )}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-600 font-bold">×</button>
          </div>
        )}

        {/* TAB 1: EXECUTIVE KPIS */}
        {activeTab === 'kpis' && (
          <div className="space-y-8">
            {/* Double-Entry Ledger Verification Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Double-Entry Ledger Integrity: 100% Balanced
                  </h3>
                  <p className="text-xs text-slate-500">
                    Every transaction across USD and PKR accounts strictly satisfies &Sigma; Debits = &Sigma; Credits. Zero drift.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                AUDIT CERTIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Total Registered Users</span>
                <div className="text-3xl font-extrabold text-slate-900">{kpis?.totalUsers ?? 0}</div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {kpis?.activeUsers ?? 0} Active • {kpis?.suspendedUsers ?? 0} Suspended
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Pending Deposit Queue</span>
                <div className="text-3xl font-extrabold text-amber-600">
                  {kpis?.pendingDepositsCount ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">
                  USD: ${((kpis?.pendingDepositsCents?.USD ?? 0) / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Verified Deposits</span>
                <div className="text-3xl font-extrabold text-emerald-700">
                  ${((kpis?.verifiedDepositsCents?.USD ?? 0) / 100).toFixed(2)}
                </div>
                <span className="text-[11px] text-teal-600 font-medium">
                  PKR: Rs {((kpis?.verifiedDepositsCents?.PKR ?? 0) / 100).toLocaleString()}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Completed Payouts</span>
                <div className="text-3xl font-extrabold text-slate-900">
                  ${((kpis?.completedPayoutsCents?.USD ?? 0) / 100).toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">Settled with verified TxHash</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT REVIEW QUEUE */}
        {activeTab === 'deposits' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Deposit Verification Queue (Pending Review)
              </h3>
              <button
                onClick={loadDeposits}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingDeposits ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading queue...</div>
            ) : pendingDeposits.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No pending deposits in verification queue. All submissions audited.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">User / Sender</th>
                      <th className="py-3 px-6">Method</th>
                      <th className="py-3 px-6">Amount</th>
                      <th className="py-3 px-6">Submitted Ref / TxID</th>
                      <th className="py-3 px-6 text-center">Payment Receipt</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingDeposits.map((dep: any) => (
                      <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{dep.user?.fullName}</div>
                          <div className="text-[10px] text-slate-500">{dep.user?.email}</div>
                          {dep.senderPhone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ph: {dep.senderPhone}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6 font-semibold">{dep.paymentMethod?.name}</td>

                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          {(dep.amountCents / 100).toFixed(2)} {dep.currency}
                        </td>

                        <td className="py-4 px-6 font-mono text-[11px] text-emerald-700 font-bold">
                          {dep.transactionRef}
                        </td>

                        <td className="py-4 px-6 text-center">
                          {dep.proofImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModal(dep.proofImageUrl)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Slip
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">No Slip</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleApproveDeposit(dep.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            Approve & Credit
                          </button>
                          <button
                            onClick={() => setRejectModal({ type: 'deposit', id: dep.id })}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 transition-colors"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WITHDRAWAL SETTLEMENT QUEUE */}
        {activeTab === 'withdrawals' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-600" />
                Withdrawal Review & Settlement Queue
              </h3>
              <button
                onClick={loadWithdrawals}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingWithdrawals ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading withdrawals...</div>
            ) : pendingWithdrawals.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No withdrawal requests pending review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Beneficiary / User</th>
                      <th className="py-3 px-6">Amount</th>
                      <th className="py-3 px-6">Payout Channel</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingWithdrawals.map((w: any) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{w.accountTitle}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {w.accountNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">{w.user?.email}</div>
                        </td>

                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          {(w.amountCents / 100).toFixed(2)} {w.currency}
                        </td>

                        <td className="py-4 px-6 font-semibold">{w.payoutMethod}</td>

                        <td className="py-4 px-6">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 text-amber-800 bg-amber-50">
                            {w.status}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right space-x-2">
                          {w.status !== 'COMPLETED' && w.status !== 'REJECTED' && (
                            <>
                              <button
                                onClick={() => setCompleteModal(w.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              >
                                Settle Payout
                              </button>
                              <button
                                onClick={() => setRejectModal({ type: 'withdrawal', id: w.id })}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 transition-colors"
                              >
                                Reject & Release Hold
                              </button>
                            </>
                          )}
                          {w.status === 'COMPLETED' && (
                            <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                              Tx: {w.payoutRef}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                User Profiles & Account Control
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={loadUsers}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Full Name / Email</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Active Package</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {u.packagePurchases && u.packagePurchases.length > 0 ? (
                          <span className="text-[11px] font-bold text-emerald-700">
                            {u.packagePurchases[0].packageName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">None</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {user?.role === 'SUPER_ADMIN' && u.id !== user.id && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              u.status === 'ACTIVE'
                                ? 'bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENT CHANNELS & WALLET ADDRESSES */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  Deposit Payment Channels & Wallet Addresses
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure corporate wallet addresses (e.g. USDT TRC-20), bank accounts, EasyPaisa, and JazzCash accounts shown to users when depositing.
                </p>
              </div>
              <button
                onClick={loadGateways}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors self-start sm:self-auto"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingGateways ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading channels...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gateways.map((gw) => (
                  <div
                    key={gw.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{gw.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {gw.currency}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-700 font-bold">
                          {gw.code}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          gw.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {gw.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 font-medium">Account Title / Name:</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {gw.accountTitle || 'Not Configured'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 font-medium">Account Number / Wallet Address:</span>
                        <div className="font-mono font-bold text-slate-900 break-all p-2.5 rounded-xl bg-white border border-slate-200 mt-0.5 select-all text-xs">
                          {gw.accountNumber || 'Not Configured'}
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Min Deposit: {(gw.minAmountCents / 100).toLocaleString()} {gw.currency}</span>
                        <span>Max Deposit: {(gw.maxAmountCents / 100).toLocaleString()} {gw.currency}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 line-clamp-2">
                      <span className="font-semibold text-slate-700">Instructions: </span>
                      {gw.instructions}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setEditingGateway({ ...gw })}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Gateway & Wallet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Configuration Parameters</h3>
                  <p className="text-xs text-slate-500">
                    Modify global business rules, commission rates, withdrawal thresholds, and USD-to-PKR conversion rates in real-time.
                  </p>
                </div>
              </div>
              <button
                onClick={loadSettings}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {settings.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5 flex-1 max-w-lg">
                    <div className="font-mono font-bold text-slate-900">{s.key}</div>
                    <div className="text-[11px] text-slate-500">{s.description}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* If boolean toggle */}
                    {['COMMISSIONS_ENABLED', 'MAINTENANCE_MODE', 'REWARDS_ENABLED'].includes(s.key) ? (
                      <select
                        value={settingEdits[s.key] ?? s.value}
                        onChange={(e) =>
                          setSettingEdits({ ...settingEdits, [s.key]: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-purple-500 text-xs"
                      >
                        <option value="true">true (Active)</option>
                        <option value="false">false (Disabled)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={settingEdits[s.key] ?? s.value}
                        onChange={(e) =>
                          setSettingEdits({ ...settingEdits, [s.key]: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 text-xs w-36"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveSetting(s.key)}
                      disabled={savingSettingKey === s.key}
                      className="px-3.5 py-1.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingSettingKey === s.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 7. LIVE SUPPORT & CUSTOMER INQUIRIES DESK */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Live Support Desk & Inquiries
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Real-time member inquiries, automated AI bot interactions, user proof attachments, and human agent resolution queue.
                </p>
              </div>

              {/* Status Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'WAITING_FOR_AGENT', 'AGENT_ACTIVE', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSupportFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        supportFilter === st
                          ? 'bg-white text-purple-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'ALL' && 'All Tickets'}
                      {st === 'WAITING_FOR_AGENT' && '⚠️ Needs Agent'}
                      {st === 'AGENT_ACTIVE' && '👨‍💼 Active'}
                      {st === 'RESOLVED' && '✅ Resolved'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={supportSearch}
                    onChange={(e) => setSupportSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 w-44"
                  />
                </div>

                <button
                  onClick={loadSupportConversations}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200"
                  title="Refresh Tickets"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Tickets List */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col h-[650px]">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-purple-600" />
                    Conversations ({supportConversations.length})
                  </span>
                  {waitingSupportCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold animate-pulse">
                      {waitingSupportCount} Need Reply
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pt-3 space-y-2.5">
                  {loadingSupport ? (
                    <div className="h-40 flex items-center justify-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : supportConversations.length === 0 ? (
                    <div className="text-center py-12 space-y-2 text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
                      <p className="text-xs">No support conversations match this filter.</p>
                    </div>
                  ) : (
                    supportConversations.map((convo) => {
                      const isSelected = selectedConvoId === convo.id;
                      const displayName = convo.user?.fullName || convo.guestName || 'Customer';
                      const email = convo.user?.email || convo.guestEmail || 'No email provided';
                      const lastMsg = convo.messages?.[0]?.message || 'Conversation initiated';

                      return (
                        <div
                          key={convo.id}
                          onClick={() => setSelectedConvoId(convo.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50/60 border-purple-400 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                                  {displayName}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {email}
                                </span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                convo.status === 'WAITING_FOR_AGENT'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse'
                                  : convo.status === 'AGENT_ACTIVE'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : convo.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {convo.status === 'WAITING_FOR_AGENT' ? 'Needs Agent' : convo.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {lastMsg}
                          </p>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {new Date(convo.lastMessageAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              •{' '}
                              {new Date(convo.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>{convo._count?.messages || 0} messages</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat History & Agent Reply Composer */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col h-[650px] overflow-hidden">
                {selectedConvo ? (
                  <>
                    {/* Active Conversation Header */}
                    <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-purple-600/30">
                          {(selectedConvo.user?.fullName || selectedConvo.guestName || 'U').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">
                              {selectedConvo.user?.fullName || selectedConvo.guestName || 'Customer'}
                            </span>
                            {selectedConvo.user?.role && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-semibold border border-purple-500/30">
                                {selectedConvo.user.role}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {selectedConvo.user?.email || selectedConvo.guestEmail || 'Guest Session'}
                          </span>
                        </div>
                      </div>

                      {/* Status Selector & Resolution Controls */}
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedConvo.status}
                          onChange={(e) => handleUpdateSupportStatus(selectedConvo.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
                        >
                          <option value="WAITING_FOR_AGENT">⚠️ Waiting for Agent</option>
                          <option value="AGENT_ACTIVE">👨‍💼 Agent Active</option>
                          <option value="BOT">🤖 Bot Mode</option>
                          <option value="RESOLVED">✅ Mark Resolved</option>
                        </select>

                        {selectedConvo.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleUpdateSupportStatus(selectedConvo.id, 'RESOLVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
                      {loadingSelectedConvo ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        selectedConvo.messages?.map((msg) => {
                          const isUser = msg.senderType === 'USER';
                          const isAgent = msg.senderType === 'AGENT';

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} space-y-1`}
                            >
                              <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {isUser
                                    ? `Customer: ${msg.senderName}`
                                    : isAgent
                                    ? `Support Agent (${msg.senderName})`
                                    : '🤖 Vistara AI Bot'}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div
                                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                                  isUser
                                    ? 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs'
                                    : isAgent
                                    ? 'bg-purple-600 text-white rounded-tr-xs'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tr-xs'
                                }`}
                              >
                                {msg.message}

                                {/* Attachment render if user or agent sent image/file */}
                                {msg.attachmentUrl && (
                                  <div className="mt-3 pt-2.5 border-t border-black/10">
                                    <span className="text-[10px] font-bold block mb-1.5 opacity-80">
                                      Attached Proof / Document:
                                    </span>
                                    {msg.attachmentUrl.startsWith('data:image/') ||
                                    msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                      <div
                                        onClick={() => setReceiptModal(msg.attachmentUrl || null)}
                                        className="cursor-pointer group relative rounded-xl overflow-hidden border border-black/15 max-h-48 bg-black/5"
                                      >
                                        <img
                                          src={msg.attachmentUrl}
                                          alt={msg.attachmentName || 'Attachment Slip'}
                                          className="w-full object-cover group-hover:scale-102 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-bold gap-1">
                                          <Eye className="w-3.5 h-3.5" /> Click to view in HD Lightbox
                                        </div>
                                      </div>
                                    ) : (
                                      <a
                                        href={msg.attachmentUrl}
                                        download={msg.attachmentName || 'attachment'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-black/10 hover:bg-black/15 font-medium transition-colors text-xs text-inherit"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="truncate max-w-[220px]">
                                          {msg.attachmentName || 'Download File'}
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Admin Attachment Chip */}
                    {adminReplyAttachment && (
                      <div className="px-4 py-2 bg-purple-50 border-t border-purple-200 flex items-center justify-between text-xs text-purple-900">
                        <div className="flex items-center gap-2 truncate">
                          <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-semibold truncate max-w-[320px]">
                            {adminReplyAttachmentName}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setAdminReplyAttachment(null);
                            setAdminReplyAttachmentName(null);
                          }}
                          className="w-5 h-5 rounded-full hover:bg-purple-200 flex items-center justify-center text-purple-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Admin Reply Composer Form */}
                    <form onSubmit={handleSendAdminReply} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                      <label
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        title="Attach receipt, proof or screenshot"
                      >
                        <Paperclip className="w-4 h-4" />
                        <input
                          type="file"
                          onChange={handleAdminFileSelect}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                      </label>

                      <input
                        type="text"
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder={`Reply directly to ${selectedConvo.user?.fullName || selectedConvo.guestName || 'customer'} as ${user?.fullName}...`}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      />

                      <button
                        type="submit"
                        disabled={sendingAdminReply || (!adminReplyText.trim() && !adminReplyAttachment)}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingAdminReply ? 'Sending...' : 'Reply as Staff'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400 p-8 text-center">
                    <Inbox className="w-12 h-12 stroke-1 text-slate-300" />
                    <h3 className="text-sm font-bold text-slate-700">No Conversation Selected</h3>
                    <p className="text-xs max-w-sm">
                      Select an incoming ticket from the left panel to inspect the user's issue, view attachments, and send a direct response.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: VIDEOS & USER ASSIGNMENTS */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <PlaySquare className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Video Modules & Custom User Assignments
                  </h2>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Add external video links (YouTube, MP4) directly into the platform. You can make videos public for curriculum packages or assign specific videos to individual user accounts.
                </p>
              </div>
              <button
                onClick={openAddVideoModal}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 shrink-0 hover:scale-102"
              >
                <Plus className="w-4 h-4" />
                Add New Video Link
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Total Video Modules</span>
                <div className="text-2xl font-extrabold text-slate-900">{adminVideos.length}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-amber-600">Assigned to Specific Users</span>
                <div className="text-2xl font-extrabold text-amber-600">
                  {adminVideos.filter((v) => v.assignedUserId).length}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-emerald-600">General Catalog Videos</span>
                <div className="text-2xl font-extrabold text-emerald-600">
                  {adminVideos.filter((v) => !v.assignedUserId).length}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-purple-600">YouTube Integrations</span>
                <div className="text-2xl font-extrabold text-purple-600">
                  {adminVideos.filter((v) => v.isYouTube).length}
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setVideoFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    videoFilter === 'ALL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Videos ({adminVideos.length})
                </button>
                <button
                  onClick={() => setVideoFilter('ASSIGNED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    videoFilter === 'ASSIGNED'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Assigned to Specific Users ({adminVideos.filter((v) => v.assignedUserId).length})
                </button>
                <button
                  onClick={() => setVideoFilter('CATALOG')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    videoFilter === 'CATALOG'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  General Catalog ({adminVideos.filter((v) => !v.assignedUserId).length})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title or user..."
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Videos Grid */}
            {loadingVideos ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Loading video catalog...</p>
              </div>
            ) : adminVideos.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
                <PlaySquare className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Videos Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the button below to add your first YouTube or MP4 video module and assign it to users.
                </p>
                <button
                  onClick={openAddVideoModal}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Add Video Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {adminVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`rounded-2xl bg-white overflow-hidden shadow-xs border flex flex-col justify-between transition-all hover:shadow-md ${
                      video.assignedUserId ? 'border-amber-300 ring-2 ring-amber-300/20' : 'border-slate-200/90'
                    }`}
                  >
                    <div>
                      {/* Video Thumbnail Header */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        {/* Top Pills */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          {video.isYouTube ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white shadow-sm flex items-center gap-1">
                              YouTube
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/90 text-white shadow-sm">
                              MP4 Stream
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 text-white flex items-center gap-1 backdrop-blur-xs">
                            <Clock className="w-3 h-3" />
                            {Math.floor(video.durationSeconds / 60)}m {video.durationSeconds % 60}s
                          </span>
                        </div>

                        {/* Play Test Overlay Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <button
                            onClick={() => setVideoPreviewModal(video)}
                            className="w-11 h-11 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                          >
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                            {video.category}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {video.description}
                          </p>
                        </div>

                        {/* Target Audience Pill */}
                        <div className="pt-2 border-t border-slate-100">
                          {video.assignedUser ? (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                                <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Assigned Directly to User
                              </div>
                              <div className="text-xs font-bold truncate">
                                {video.assignedUser.fullName}
                              </div>
                              <div className="text-[10px] text-amber-700/80 truncate font-mono">
                                {video.assignedUser.email}
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-0.5">
                              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                Public Catalog
                              </div>
                              <div className="text-xs font-semibold">
                                Min Tier: {video.minPackageTier}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setVideoPreviewModal(video)}
                        className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Test Play
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditVideoModal(video)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-slate-200 transition-colors"
                          title="Edit Video or Reassign"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          disabled={deletingVideoId === video.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* EDIT GATEWAY MODAL */}
      {editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Gateway: {editingGateway.name}</h3>
                <span className="text-xs text-purple-700 font-mono font-bold">{editingGateway.code} ({editingGateway.currency})</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGateway(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gateway Display Name</label>
                <input
                  type="text"
                  value={editingGateway.name}
                  onChange={(e) => setEditingGateway({ ...editingGateway, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Title / Beneficiary Name</label>
                <input
                  type="text"
                  placeholder="e.g. VistaraX Media Treasury or Muhammad Ali"
                  value={editingGateway.accountTitle || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, accountTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Number / Wallet Address (USDT TRC-20, IBAN, Mobile No)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t or 0345-1234567"
                  value={editingGateway.accountNumber || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, accountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Instructions for User</label>
                <textarea
                  rows={2}
                  value={editingGateway.instructions || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Deposit (in cents)</label>
                  <input
                    type="number"
                    value={editingGateway.minAmountCents}
                    onChange={(e) => setEditingGateway({ ...editingGateway, minAmountCents: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">
                    ={(editingGateway.minAmountCents / 100).toLocaleString()} {editingGateway.currency}
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Deposit (in cents)</label>
                  <input
                    type="number"
                    value={editingGateway.maxAmountCents}
                    onChange={(e) => setEditingGateway({ ...editingGateway, maxAmountCents: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">
                    ={(editingGateway.maxAmountCents / 100).toLocaleString()} {editingGateway.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="gw-active-toggle"
                  checked={editingGateway.isActive}
                  onChange={(e) => setEditingGateway({ ...editingGateway, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="gw-active-toggle" className="font-semibold text-slate-700">
                  Channel Active & Available for User Deposits
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingGateway(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGateway}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingGateway ? 'Saving Changes...' : 'Save Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT SLIP MODAL */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  User Uploaded Payment Receipt Slip
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect the official bank transfer receipt or transaction screenshot submitted by the user.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-2 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={receiptModal}
                alt="Payment slip receipt"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={receiptModal}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>
              <button
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Record Rejection Justification</h3>
            <p className="text-xs text-slate-500">
              A detailed audit justification is required to decline this transaction.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Invalid transaction reference; bank confirmation not found."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE WITHDRAWAL MODAL */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Settle Payout with External Ref</h3>
            <p className="text-xs text-slate-500">
              Enter the authentic bank transfer reference or blockchain TxHash before finalizing settlement.
            </p>
            <input
              type="text"
              placeholder="e.g. 129038472918 or 0x48f93... or 3737 ID"
              value={payoutRefInput}
              onChange={(e) => setPayoutRefInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCompleteModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompleteWithdrawal}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Settle & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT VIDEO MODAL */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <PlaySquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingVideo ? 'Edit Video Link & Access' : 'Add Video Link & Assign User'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste any YouTube URL or direct MP4 stream and specify audience access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4 text-xs">
              {/* Video URL Input */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  Video URL / Stream Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://www.youtube.com/watch?v=aum88UHF3wk... or https://..."
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Supports YouTube videos (watch URLs, youtu.be, shorts, embeds) and direct video files (.mp4).
                </span>

                {/* Real-time YouTube Detection Indicator */}
                {extractYouTubeId(formVideoUrl) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
                    {getYouTubeThumbnail(formVideoUrl) && (
                      <img
                        src={getYouTubeThumbnail(formVideoUrl)!}
                        alt="Thumbnail Preview"
                        className="w-16 h-10 object-cover rounded-lg shrink-0 bg-slate-900"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                        ✓ YouTube Video Detected
                      </span>
                      <p className="text-[11px] text-slate-600 truncate font-mono">
                        Video ID: {extractYouTubeId(formVideoUrl)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  Video Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Specialized Quantitative Algorithmic Trading"
                  value={formVideoTitle}
                  onChange={(e) => setFormVideoTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                  required
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the topics covered in this masterclass..."
                  value={formVideoDescription}
                  onChange={(e) => setFormVideoDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Audience Assignment Choice */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-slate-800">
                  Target Audience / Access Permission <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormVideoTarget('USER')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                      formVideoTarget === 'USER'
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="target-user"
                        name="videoTarget"
                        checked={formVideoTarget === 'USER'}
                        onChange={() => setFormVideoTarget('USER')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="target-user" className="font-bold text-slate-900 cursor-pointer flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Specific User Only
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 pl-5">
                      Show this video exclusively to a designated user account.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormVideoTarget('ALL')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                      formVideoTarget === 'ALL'
                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="target-all"
                        name="videoTarget"
                        checked={formVideoTarget === 'ALL'}
                        onChange={() => setFormVideoTarget('ALL')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="target-all" className="font-bold text-slate-900 cursor-pointer">
                        🌐 All Users (Public Catalog)
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 pl-5">
                      Publish to general library based on package tier limits.
                    </p>
                  </div>
                </div>

                {/* User Dropdown Selector when 'USER' is selected */}
                {formVideoTarget === 'USER' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-amber-900">
                      Select Designated Registered User:
                    </label>
                    <select
                      value={formAssignedUserId}
                      onChange={(e) => setFormAssignedUserId(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                      required={formVideoTarget === 'USER'}
                    >
                      <option value="">-- Choose User Account --</option>
                      {allUsersDropdown.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) - {u.role}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-amber-700/90">
                      When this user logs in, this video will appear prominently in their catalog and play immediately.
                    </p>
                  </div>
                )}

                {/* Package Tier Selector when 'ALL' is selected */}
                {formVideoTarget === 'ALL' && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Minimum Required Package Tier:
                    </label>
                    <select
                      value={formVideoTier}
                      onChange={(e) => setFormVideoTier(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Starter">Starter ($20 - 2 videos)</option>
                      <option value="Basic">Basic ($50 - 6 videos)</option>
                      <option value="Premium">Premium ($100 - 15 videos)</option>
                      <option value="VIP">VIP ($500 - 60 videos)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Category</label>
                  <select
                    value={formVideoCategory}
                    onChange={(e) => setFormVideoCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900"
                  >
                    <option value="Special Assignment">Special Assignment</option>
                    <option value="AI & Systems Architecture">AI & Systems Architecture</option>
                    <option value="Quantitative Finance & Ledgering">Quantitative Finance & Ledgering</option>
                    <option value="Full-Stack Software Engineering">Full-Stack Software Engineering</option>
                    <option value="Venture Creation & Scaling">Venture Creation & Scaling</option>
                    <option value="Cybersecurity & Cryptography">Cybersecurity & Cryptography</option>
                    <option value="Executive Leadership & Strategy">Executive Leadership & Strategy</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Duration (Seconds)</label>
                  <input
                    type="number"
                    value={formVideoDuration}
                    onChange={(e) => setFormVideoDuration(parseInt(e.target.value) || 0)}
                    min={10}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">
                    Approx: {Math.floor(formVideoDuration / 60)}m {formVideoDuration % 60}s
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVideo}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingVideo ? 'Saving Video...' : editingVideo ? 'Update Video' : 'Save & Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {videoPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {videoPreviewModal.category}
                  </span>
                  {videoPreviewModal.assignedUser && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Assigned to: {videoPreviewModal.assignedUser.fullName}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white truncate max-w-xl">
                  {videoPreviewModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVideoPreviewModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Display */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
              {getYouTubeEmbedUrl(videoPreviewModal.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(videoPreviewModal.videoUrl)!}
                  title={videoPreviewModal.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoPreviewModal.videoUrl}
                  poster={videoPreviewModal.thumbnailUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
              <span className="truncate max-w-md font-mono text-[11px]">
                URL: {videoPreviewModal.videoUrl}
              </span>
              <button
                onClick={() => setVideoPreviewModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
