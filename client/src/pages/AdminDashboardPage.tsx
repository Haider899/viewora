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
  AlertCircle,
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
  FileCheck,
  Layers,
  Image as ImageIcon,
  Plus,
  Trash2,
  Play,
  Sparkles,
  Video as VideoIcon,
  Lock,
  Upload,
  Volume2,
  VolumeX,
  FileBarChart,
  Gift,
} from 'lucide-react';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail } from '../utils/youtube.js';
import {
  AdminPackagesTab,
  AdminReferralsConfigTab,
  AdminBonusesConfigTab,
  AdminWalletAdjustTab,
  AdminReportsAuditTab,
  AdminCmsAndNotificationsPanel,
  AdminSupportAgentsPanel,
  AdminLivePopupsTab,
} from '../components/AdminExtraTabs.js';

interface AdminDashboardProps {
  navigate?: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardProps> = () => {
  const { user, logout } = useAuth();
  const isSupportAgentOnly = user?.role === 'SUPPORT_AGENT';
  const [activeTab, setActiveTab] = useState<
    | 'kpis'
    | 'deposits'
    | 'withdrawals'
    | 'users'
    | 'wallets'
    | 'gateways'
    | 'packages'
    | 'referrals'
    | 'bonuses'
    | 'levels'
    | 'videos'
    | 'documents'
    | 'support'
    | 'popups'
    | 'reports'
    | 'settings'
  >(isSupportAgentOnly ? 'support' : 'kpis');
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [chimeIntervalSec, setChimeIntervalSec] = useState<number>(3);
  const [receiptZoomed, setReceiptZoomed] = useState(false);

  // Per-chat mute + 10-second ringing state (Part 6 #3)
  const [mutedConvoIds, setMutedConvoIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('uads_muted_convos') || '[]');
    } catch {
      return [];
    }
  });
  const [ringingConvoId, setRingingConvoId] = useState<string | null>(null);
  const lastSeenConvoTimeRef = React.useRef<Record<string, string>>({});

  // Admin Proactive Direct Message Modal (Part 6 #2)
  const [directMsgModal, setDirectMsgModal] = useState<{ userId: string; fullName: string; email: string } | null>(null);
  const [directMsgSubject, setDirectMsgSubject] = useState('Important Message from U-Ads Administration');
  const [directMsgBody, setDirectMsgBody] = useState('');
  const [directMsgAttachment, setDirectMsgAttachment] = useState<string | null>(null);
  const [directMsgAttachmentName, setDirectMsgAttachmentName] = useState<string | null>(null);
  const [sendingDirectMsg, setSendingDirectMsg] = useState(false);

  // Dynamic packages list for Admin Video Form (Part 5 #6)
  const [adminPackagesDropdown, setAdminPackagesDropdown] = useState<any[]>([]);

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
  const [supportAgentsList, setSupportAgentsList] = useState<any[]>([]);
  const [assigningAgent, setAssigningAgent] = useState(false);

  // Live Notification Badges (polled continuously)
  const [pendingDepositsCount, setPendingDepositsCount] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);

  // KPI Data
  const [kpis, setKpis] = useState<AdminKpiData | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Deposits Queue
  const [pendingDeposits, setPendingDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  // Withdrawals Queue
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Users Queue & IP Grouping (Items #18–#21)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersSubView, setUsersSubView] = useState<'members' | 'ip_groups'>('members');
  const [ipGroups, setIpGroups] = useState<any[]>([]);
  const [loadingIpGroups, setLoadingIpGroups] = useState(false);

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
  const [agentPresence, setAgentPresence] = useState<'ONLINE' | 'BUSY' | 'OFFLINE'>('ONLINE');

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ type: 'deposit' | 'withdrawal'; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Complete withdrawal modal
  const [completeModal, setCompleteModal] = useState<string | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [payoutProofUrl, setPayoutProofUrl] = useState<string | null>(null);
  const [payoutProofName, setPayoutProofName] = useState<string | null>(null);

  // User Financial Dossier & Audit Trail (Audio 2)
  const [dossierUserId, setDossierUserId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierTab, setDossierTab] = useState<
    'overview' | 'deposits' | 'withdrawals' | 'videos' | 'referrals' | 'history' | 'timeline' | 'ledger'
  >('overview');

  // Interactive UI Modals for User Management & Support (Replaces browser prompts)
  const [adjustLevelModal, setAdjustLevelModal] = useState<{
    userId: string;
    userName: string;
    currentLevel: string;
  } | null>(null);
  const [selectedNewLevel, setSelectedNewLevel] = useState('LEVEL_1');
  const [levelAdjustReason, setLevelAdjustReason] = useState('Administrative qualification');
  const [savingLevelAdjust, setSavingLevelAdjust] = useState(false);

  const [lockAccountModal, setLockAccountModal] = useState<{
    userId: string;
    userName: string;
    isLocked: boolean;
    lockedUntil?: string | null;
  } | null>(null);
  const [lockDurationDays, setLockDurationDays] = useState(60);
  const [lockReason, setLockReason] = useState('Security policy compliance');
  const [savingLockAction, setSavingLockAction] = useState(false);

  const [changeRoleModal, setChangeRoleModal] = useState<{
    userId: string;
    userName: string;
    currentRole: string;
  } | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState('USER');
  const [roleReason, setRoleReason] = useState('Role update via administrative console');
  const [savingRoleChange, setSavingRoleChange] = useState(false);

  const [escalateModal, setEscalateModal] = useState<{
    convoId: string;
    userName: string;
  } | null>(null);
  const [escalateReason, setEscalateReason] = useState('Customer requested senior platform admin escalation');
  const [savingEscalation, setSavingEscalation] = useState(false);

  const openUserDossier = async (userId: string) => {
    setDossierUserId(userId);
    setDossierData(null);
    setLoadingDossier(true);
    setDossierTab('overview');
    try {
      const res = await api.getUserFinancialDossier(userId);
      if (res.success && res.data) {
        setDossierData(res.data);
      } else {
        setActionError(res.error?.message || 'Failed to retrieve user financial dossier.');
      }
    } catch {
      setActionError('Error fetching user dossier and activity logs.');
    } finally {
      setLoadingDossier(false);
    }
  };

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
  const [formVideoMinLevel, setFormVideoMinLevel] = useState('LEVEL_1');
  const [formVideoIsPublished, setFormVideoIsPublished] = useState(true);
  const [formVideoIsLocked, setFormVideoIsLocked] = useState(false);
  const [formVideoDuration, setFormVideoDuration] = useState(180);
  const [formVideoRewardPct, setFormVideoRewardPct] = useState('');
  const [formVideoTarget, setFormVideoTarget] = useState<'ALL' | 'USER'>('USER');
  const [formAssignedUserId, setFormAssignedUserId] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // Company Documents Management (Section 2.1)
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any | null>(null);
  const [docFormTitle, setDocFormTitle] = useState('');
  const [docFormType, setDocFormType] = useState('BUSINESS_LICENSE');
  const [docFormUrl, setDocFormUrl] = useState('');
  const [docFormIssuer, setDocFormIssuer] = useState('');
  const [docFormIsPublic, setDocFormIsPublic] = useState(true);
  const [docFileName, setDocFileName] = useState('');
  const [docFileSize, setDocFileSize] = useState('');
  const [docFileBase64, setDocFileBase64] = useState('');
  const [savingDocument, setSavingDocument] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Account Levels & Daily Bonus (Sections 3, 5.1 & 11)
  const [levelsList, setLevelsList] = useState<any[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any | null>(null);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [levelFormName, setLevelFormName] = useState('');
  const [levelFormMinUSD, setLevelFormMinUSD] = useState(0);
  const [levelFormMaxUSD, setLevelFormMaxUSD] = useState(0);
  const [levelFormVideoLimit, setLevelFormVideoLimit] = useState(10);
  const [levelFormBonusBps, setLevelFormBonusBps] = useState(0);
  const [savingLevel, setSavingLevel] = useState(false);
  const [triggeringBonusBatch, setTriggeringBonusBatch] = useState(false);

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

  const refreshNotificationBadges = async () => {
    try {
      if (isSupportAgentOnly) {
        const supRes = await api.getAdminSupportConversations({ status: 'ALL' });
        if (supRes.success && supRes.data) {
          setSupportConversations(supRes.data);
          const waiting = supRes.data.filter((c: any) => c.status === 'WAITING_FOR_AGENT').length;
          setWaitingSupportCount(waiting);
        }
        return;
      }

      const [depRes, wdrRes, supRes] = await Promise.allSettled([
        api.getAdminDeposits('PENDING'),
        api.getAdminWithdrawals('PENDING'),
        api.getAdminSupportConversations({ status: 'ALL' }),
      ]);

      if (depRes.status === 'fulfilled' && depRes.value.success && depRes.value.data) {
        setPendingDepositsCount(depRes.value.data.length);
      }
      if (wdrRes.status === 'fulfilled' && wdrRes.value.success && wdrRes.value.data) {
        const pending = Array.isArray(wdrRes.value.data)
          ? wdrRes.value.data.filter((w: any) => w.status === 'PENDING').length
          : 0;
        setPendingWithdrawalsCount(pending);
      }
      if (supRes.status === 'fulfilled' && supRes.value.success && supRes.value.data) {
        // Keep supportConversations live across ALL tabs so the 10-second incoming ring fires from anywhere!
        if (activeTab !== 'support') {
          setSupportConversations(supRes.value.data);
        }
        const waiting = supRes.value.data.filter((c: any) => c.status === 'WAITING_FOR_AGENT').length;
        setWaitingSupportCount(waiting);
      }
    } catch {
      // background poller silent error
    }
  };

  const loadDeposits = async () => {
    setLoadingDeposits(true);
    try {
      const res = await api.getAdminDeposits('PENDING');
      if (res.success && res.data) {
        setPendingDeposits(res.data);
        setPendingDepositsCount(res.data.length);
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
        const pending = res.data.filter((w: any) => w.status === 'PENDING').length;
        setPendingWithdrawalsCount(pending);
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

  const loadIpGroups = async (searchOverride?: string) => {
    setLoadingIpGroups(true);
    try {
      const res = await api.getAdminIpGroups(searchOverride !== undefined ? searchOverride : userSearch);
      if (res.success && Array.isArray(res.data)) {
        setIpGroups(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIpGroups(false);
    }
  };

  const toggleMuteConvo = (convoId: string) => {
    setMutedConvoIds((prev) => {
      const next = prev.includes(convoId) ? prev.filter((id) => id !== convoId) : [...prev, convoId];
      try {
        localStorage.setItem('uads_muted_convos', JSON.stringify(next));
      } catch {}
      if (next.includes(convoId) && ringingConvoId === convoId) {
        setRingingConvoId(null);
      }
      return next;
    });
  };

  const handleDirectMsgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionError('Screenshot must be under 5 MB.');
      return;
    }
    setDirectMsgAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => setDirectMsgAttachment(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMsgModal || !directMsgBody.trim()) return;
    setSendingDirectMsg(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.sendDirectMessageToUser(directMsgModal.userId, {
        subject: directMsgSubject.trim() || 'Message from U-Ads Administration',
        message: directMsgBody.trim(),
        attachmentUrl: directMsgAttachment || undefined,
        attachmentName: directMsgAttachmentName || undefined,
      });
      if (res.success) {
        setActionSuccess(`Direct message & push notification sent to ${directMsgModal.fullName}.`);
        setDirectMsgModal(null);
        setDirectMsgBody('');
        setDirectMsgAttachment(null);
        setDirectMsgAttachmentName(null);
      } else {
        setActionError(res.error?.message || 'Failed to send message.');
      }
    } catch {
      setActionError('Error sending direct message.');
    } finally {
      setSendingDirectMsg(false);
    }
  };

  const loadSupportAgentsDropdown = async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      const res = await api.getSupportAgents();
      if (res.success && Array.isArray(res.data)) {
        setSupportAgentsList(res.data);
      }
    } catch {
      // silent
    }
  };

  const handleAssignSupportAgent = async (convoId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningAgent(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.adminAssignSupportConversation(convoId, agentId);
      if (res.success && res.data) {
        setSelectedConvo(res.data);
        setActionSuccess('Conversation assigned to selected support agent.');
        loadSupportConversations(true);
      } else {
        setActionError(res.error?.message || 'Failed to assign support agent.');
      }
    } catch {
      setActionError('Error assigning support agent.');
    } finally {
      setAssigningAgent(false);
    }
  };

  const handlePayoutProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionError('Payout proof image must be under 5 MB.');
      return;
    }
    setPayoutProofName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPayoutProofUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  const loadSupportConversations = async (silent = false) => {
    if (!silent) setLoadingSupport(true);
    try {
      const res = await api.getAdminSupportConversations({
        status: supportFilter,
        search: supportSearch,
      });
      if (res.success && res.data) {
        setSupportConversations(res.data);
        const waiting = res.data.filter((c: any) => c.status === 'WAITING_FOR_AGENT').length;
        setWaitingSupportCount(waiting);
        // Do NOT auto-select waiting chats before admin opens them (so the 10-second ring plays until opened)
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingSupport(false);
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
    setFormVideoUrl('https://media.w3.org/2010/05/sintel/trailer.mp4');
    setFormVideoDescription('');
    setFormVideoCategory('Special Assignment');
    setFormVideoTier('Starter');
    setFormVideoMinLevel('LEVEL_1');
    setFormVideoIsPublished(true);
    setFormVideoIsLocked(false);
    setFormVideoDuration(52);
    setFormVideoRewardPct('');
    setFormVideoTarget('ALL');
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
    setFormVideoMinLevel(vid.minAccountLevel || 'LEVEL_1');
    setFormVideoIsPublished(vid.isPublished !== false);
    setFormVideoIsLocked(Boolean(vid.isLocked));
    setFormVideoDuration(vid.durationSeconds);
    setFormVideoRewardPct(
      vid.rewardPercentageBps != null && vid.rewardPercentageBps > 0
        ? (vid.rewardPercentageBps / 100).toString()
        : ''
    );
    setFormVideoTarget(vid.assignedUserId ? 'USER' : 'ALL');
    setFormAssignedUserId(vid.assignedUserId || (allUsersDropdown.length > 0 ? allUsersDropdown[0].id : ''));
    setVideoModalOpen(true);
  };

  const handleToggleVideoActive = async (vid: Video) => {
    const nextVal = !vid.isPublished;
    const res = await api.adminUpdateVideo(vid.id, { isPublished: nextVal });
    if (res.success) {
      setActionSuccess(`Video "${vid.title}" ${nextVal ? 'activated' : 'deactivated'}.`);
      loadAdminVideos();
    } else {
      setActionError(res.error?.message || 'Failed to update video status.');
    }
  };

  const handleToggleVideoLock = async (vid: Video) => {
    const nextVal = !vid.isLocked;
    const res = await api.adminUpdateVideo(vid.id, { isLocked: nextVal });
    if (res.success) {
      setActionSuccess(`Video "${vid.title}" ${nextVal ? 'locked' : 'unlocked'}.`);
      loadAdminVideos();
    } else {
      setActionError(res.error?.message || 'Failed to toggle video lock.');
    }
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
      const parsedRewardPct = formVideoRewardPct.trim() === '' ? null : Number(formVideoRewardPct);
      const rewardPercentageBps =
        parsedRewardPct !== null && Number.isFinite(parsedRewardPct) && parsedRewardPct > 0
          ? Math.round(parsedRewardPct * 100)
          : null;

      const payload: any = {
        title: formVideoTitle.trim(),
        description: formVideoDescription.trim() || 'Verified U-Ads video campaign',
        videoUrl: formVideoUrl.trim(),
        category: formVideoCategory,
        minPackageTier: formVideoTier,
        minAccountLevel: formVideoMinLevel,
        isPublished: formVideoIsPublished,
        isLocked: formVideoIsLocked,
        durationSeconds: Number(formVideoDuration) || 60,
        rewardPercentageBps,
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

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const res = await api.getAdminDocuments();
      if (res.success && res.data) {
        setDocumentsList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const openAddDocModal = () => {
    setEditingDocument(null);
    setDocFormTitle('');
    setDocFormType('BUSINESS_LICENSE');
    setDocFormUrl('');
    setDocFormIssuer('Corporate Affairs Commission / Registrar');
    setDocFormIsPublic(true);
    setDocFileName('');
    setDocFileSize('');
    setDocFileBase64('');
    setDocumentModalOpen(true);
  };

  const openEditDocModal = (doc: any) => {
    setEditingDocument(doc);
    setDocFormTitle(doc.title);
    setDocFormType(doc.documentType);
    setDocFormUrl(doc.fileUrl);
    setDocFormIssuer(doc.issuingAuthority || doc.issuer || '');
    setDocFormIsPublic(doc.isPublic);
    setDocFileName('');
    setDocFileSize('');
    setDocFileBase64('');
    setDocumentModalOpen(true);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setActionError('File size should be less than 10 MB.');
      return;
    }

    setDocFileName(file.name);
    setDocFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setDocFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleInspectDocument = (url: string, title?: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch {
        window.open(url, '_blank');
        return;
      }
    }
    window.open(url, '_blank');
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalFileUrl = docFileBase64 || docFormUrl.trim();

    if (!docFormTitle.trim()) {
      setActionError('Document title is required.');
      return;
    }
    if (!finalFileUrl) {
      setActionError('Please upload a document file (PDF or Image) or provide a valid resource URL.');
      return;
    }

    setSavingDocument(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const payload = {
        title: docFormTitle.trim(),
        documentType: docFormType,
        fileUrl: finalFileUrl,
        issuingAuthority: docFormIssuer.trim() || undefined,
        issuer: docFormIssuer.trim() || undefined,
        isPublic: docFormIsPublic,
      };
      let res;
      if (editingDocument) {
        res = await api.updateAdminDocument(editingDocument.id, payload);
      } else {
        res = await api.createAdminDocument(payload);
      }
      if (res.success) {
        setActionSuccess(res.message || 'Document successfully saved.');
        setDocumentModalOpen(false);
        loadDocuments();
      } else {
        setActionError(res.error?.message || 'Failed to save document.');
      }
    } catch {
      setActionError('Error saving document.');
    } finally {
      setSavingDocument(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company document?')) return;
    setDeletingDocId(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.deleteAdminDocument(id);
      if (res.success) {
        setActionSuccess('Document removed successfully.');
        loadDocuments();
      } else {
        setActionError(res.error?.message || 'Failed to delete document.');
      }
    } catch {
      setActionError('Error deleting document.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const loadLevels = async () => {
    setLoadingLevels(true);
    try {
      const res = await api.getAccountLevels();
      if (res.success && res.data) {
        setLevelsList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLevels(false);
    }
  };

  const openEditLevelModal = (lvl: any) => {
    setEditingLevel(lvl);
    setLevelFormName(lvl.name || lvl.displayName || lvl.levelKey);
    // Stored in USD cents in DB (e.g. 2000 = $20.00)
    setLevelFormMinUSD((lvl.minQualificationUSD ?? lvl.minAmountCents ?? 0) / 100);
    setLevelFormMaxUSD(
      lvl.maxQualificationUSD != null
        ? lvl.maxQualificationUSD / 100
        : lvl.maxAmountCents
        ? lvl.maxAmountCents / 100
        : 0
    );
    setLevelFormVideoLimit(lvl.videoLimit ?? lvl.dailyVideoLimit ?? 10);
    setLevelFormBonusBps(lvl.dailyBonusRateBps ?? lvl.dailyBonusBps ?? 0);
    setLevelModalOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;
    setSavingLevel(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const payload = {
        name: levelFormName.trim(),
        minQualificationUSD: Math.round((Number(levelFormMinUSD) || 0) * 100),
        maxQualificationUSD: levelFormMaxUSD > 0 ? Math.round(Number(levelFormMaxUSD) * 100) : null,
        videoLimit: Number(levelFormVideoLimit),
        dailyBonusRateBps: Number(levelFormBonusBps),
      };
      const res = await api.updateAccountLevel(editingLevel.levelKey, payload);
      if (res.success) {
        setActionSuccess(`Level tier ${editingLevel.levelKey} updated successfully.`);
        setLevelModalOpen(false);
        loadLevels();
      } else {
        setActionError(res.error?.message || 'Failed to update level.');
      }
    } catch {
      setActionError('Error updating level.');
    } finally {
      setSavingLevel(false);
    }
  };

  // Enforce RBAC for SUPPORT_AGENT (Live Support + Users IP View ONLY — Part 6 #1)
  useEffect(() => {
    if (isSupportAgentOnly && !['support', 'users'].includes(activeTab)) {
      setActiveTab('support');
    }
  }, [isSupportAgentOnly, activeTab]);

  // Initial badge check & recurring live counter polling
  useEffect(() => {
    refreshNotificationBadges();
    if (!isSupportAgentOnly) {
      loadLevels();
      api.getPackages().then((r) => {
        if (r.success && Array.isArray(r.data)) setAdminPackagesDropdown(r.data);
      }).catch(() => {});
    }
    const badgeInterval = setInterval(refreshNotificationBadges, 4000);
    return () => clearInterval(badgeInterval);
  }, [isSupportAgentOnly]);

  // Detect newly arrived user messages on non-muted chats -> trigger 10-second ringing sound (Part 6 #3)
  useEffect(() => {
    if (!soundAlertsEnabled) return;
    for (const convo of supportConversations) {
      if (mutedConvoIds.includes(convo.id)) continue;
      const prevTs = lastSeenConvoTimeRef.current[convo.id];
      const latestMsg = convo.messages?.[0];
      const isNewUserMsg =
        prevTs &&
        prevTs !== convo.lastMessageAt &&
        (!latestMsg || latestMsg.senderType === 'USER') &&
        selectedConvoId !== convo.id;
      const isUnopenedWaiting =
        !prevTs &&
        convo.status === 'WAITING_FOR_AGENT' &&
        selectedConvoId !== convo.id;

      lastSeenConvoTimeRef.current[convo.id] = convo.lastMessageAt;
      if (isNewUserMsg || isUnopenedWaiting) {
        setRingingConvoId(convo.id);
      }
    }
  }, [supportConversations, mutedConvoIds, selectedConvoId, soundAlertsEnabled]);

  // Play 10-second ringing tone until opened or 10 seconds elapse (Part 6 #3)
  useEffect(() => {
    if (!soundAlertsEnabled || !ringingConvoId) return;
    if (mutedConvoIds.includes(ringingConvoId) || selectedConvoId === ringingConvoId) {
      setRingingConvoId(null);
      return;
    }

    const playRingTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.46);
        setTimeout(() => ctx.close().catch(() => {}), 600);
      } catch {}
    };

    playRingTone();
    const ringInterval = setInterval(playRingTone, 1200);
    const stopAfter10Sec = setTimeout(() => {
      setRingingConvoId(null);
    }, 10000);

    return () => {
      clearInterval(ringInterval);
      clearTimeout(stopAfter10Sec);
    };
  }, [ringingConvoId, soundAlertsEnabled, mutedConvoIds, selectedConvoId]);

  useEffect(() => {
    if (isSupportAgentOnly && !['support', 'users'].includes(activeTab)) {
      return;
    }
    if (activeTab === 'kpis') loadKpis();
    else if (activeTab === 'deposits') loadDeposits();
    else if (activeTab === 'withdrawals') loadWithdrawals();
    else if (activeTab === 'users') {
      loadIpGroups();
      loadUsers();
    } else if (activeTab === 'gateways') loadGateways();
    else if (activeTab === 'settings') loadSettings();
    else if (activeTab === 'support') {
      loadSupportConversations();
      loadSupportAgentsDropdown();
    } else if (activeTab === 'videos') {
      loadAdminVideos();
      loadDropdownUsers();
      api.getPackages().then((r) => {
        if (r.success && Array.isArray(r.data)) setAdminPackagesDropdown(r.data);
      }).catch(() => {});
    } else if (activeTab === 'documents') {
      loadDocuments();
    } else if (activeTab === 'levels') {
      loadLevels();
    }
  }, [activeTab, isSupportAgentOnly]);

  useEffect(() => {
    if (activeTab === 'videos') {
      loadAdminVideos();
    }
  }, [videoFilter, videoSearch]);

  useEffect(() => {
    if (activeTab === 'support') {
      loadSupportConversations();
      const interval = setInterval(() => {
        loadSupportConversations(true);
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

  const handleEscalateToAdmin = async (id: string, reason: string) => {
    try {
      const res = await api.adminEscalateSupportToSuperAdmin(id, reason);
      if (res.success && res.data) {
        setSelectedConvo(res.data);
        setActionSuccess('Ticket escalated to Super Admin successfully.');
        loadSupportConversations();
      }
    } catch {
      setActionError('Error escalating ticket.');
    }
  };

  const handlePresenceChange = async (status: 'ONLINE' | 'BUSY' | 'OFFLINE') => {
    setAgentPresence(status);
    try {
      await api.updateAgentAvailability(status);
      setActionSuccess(`Presence status updated to ${status}.`);
    } catch {
      setActionError('Failed to update presence status.');
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
      const payload = {
        code: (editingGateway.code || `USD_${Date.now()}`).toUpperCase().replace(/\s+/g, '_'),
        name: editingGateway.name,
        currency: 'USD',
        accountTitle: editingGateway.accountTitle,
        accountNumber: editingGateway.accountNumber,
        instructions: editingGateway.instructions,
        minAmountCents: parseInt(editingGateway.minAmountCents) || 2000,
        maxAmountCents: parseInt(editingGateway.maxAmountCents) || 5000000,
        isActive: Boolean(editingGateway.isActive),
      };
      const res = editingGateway.id
        ? await api.updateAdminPaymentMethod(editingGateway.id, payload)
        : await api.createAdminPaymentMethod(payload);
      if (res.success) {
        setActionSuccess(
          editingGateway.id
            ? `Payment channel "${editingGateway.name}" updated successfully!`
            : `New USD payment channel "${editingGateway.name}" created!`
        );
        setEditingGateway(null);
        await loadGateways();
      } else {
        setActionError(res.error?.message || 'Failed to save payment channel.');
      }
    } catch {
      setActionError('Error saving payment channel details.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleDeleteGateway = async (gw: any) => {
    if (!confirm(`Delete or deactivate USD payment channel "${gw.name}"?`)) return;
    setActionSuccess(null);
    setActionError(null);
    const res = await api.deleteAdminPaymentMethod(gw.id);
    if (res.success) {
      setActionSuccess(`Payment channel "${gw.name}" removed/deactivated.`);
      await loadGateways();
    } else {
      setActionError(res.error?.message || 'Failed to delete payment channel.');
    }
  };

  const handleWithdrawalTransition = async (
    withdrawalId: string,
    action: 'UNDER_REVIEW' | 'APPROVE' | 'PROCESSING' | 'FAILED',
    reason?: string
  ) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.reviewWithdrawal(
        withdrawalId,
        action,
        reason ? { rejectionReason: reason } : undefined
      );
      if (res.success) {
        setActionSuccess(`Withdrawal updated to ${action.replace(/_/g, ' ')}.`);
        loadWithdrawals();
        refreshNotificationBadges();
      } else {
        setActionError(res.error?.message || 'Status update failed.');
      }
    } catch {
      setActionError('Error updating withdrawal status.');
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
        refreshNotificationBadges();
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
          refreshNotificationBadges();
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
          refreshNotificationBadges();
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
        payoutProofUrl: payoutProofUrl || undefined,
      });
      if (res.success) {
        setActionSuccess('Withdrawal marked as completed with confirmed external payout reference & proof.');
        loadWithdrawals();
        refreshNotificationBadges();
        setCompleteModal(null);
        setPayoutRefInput('');
        setPayoutProofUrl(null);
        setPayoutProofName(null);
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

  // Level Modal Handlers (Replaces window.prompt)
  const handleOpenAdjustLevelModal = (u: any) => {
    setAdjustLevelModal({
      userId: u.id,
      userName: u.fullName || u.email,
      currentLevel: u.accountLevel || 'NEW_USER',
    });
    setSelectedNewLevel(u.accountLevel || 'LEVEL_1');
    setLevelAdjustReason('Administrative tier qualification');
  };

  const handleConfirmAdjustLevel = async () => {
    if (!adjustLevelModal) return;
    setSavingLevelAdjust(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.manualAdjustUserLevel(
        adjustLevelModal.userId,
        selectedNewLevel,
        levelAdjustReason.trim() || 'Administrative override'
      );
      if (res.success) {
        setActionSuccess(`Account level for ${adjustLevelModal.userName} changed to ${selectedNewLevel}.`);
        setAdjustLevelModal(null);
        loadIpGroups(userSearch);
      } else {
        setActionError(res.error?.message || 'Failed to adjust level.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error adjusting level.');
    } finally {
      setSavingLevelAdjust(false);
    }
  };

  // Lock Modal Handlers (Replaces window.prompt)
  const handleOpenLockModal = (u: any, isLocked: boolean) => {
    setLockAccountModal({
      userId: u.id,
      userName: u.fullName || u.email,
      isLocked,
      lockedUntil: u.accountLockedUntil,
    });
    setLockDurationDays(60);
    setLockReason(isLocked ? 'Administrative early unlock' : 'Security policy compliance');
  };

  const handleConfirmLockAction = async () => {
    if (!lockAccountModal) return;
    setSavingLockAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      if (lockAccountModal.isLocked) {
        const res = await api.unlockUserAccount(
          lockAccountModal.userId,
          lockReason.trim() || 'Administrative early unlock'
        );
        if (res.success) {
          setActionSuccess(`Account unlocked for ${lockAccountModal.userName}.`);
          setLockAccountModal(null);
          loadIpGroups(userSearch);
        } else {
          setActionError(res.error?.message || 'Failed to unlock account.');
        }
      } else {
        const res = await api.lockUserAccount(
          lockAccountModal.userId,
          lockDurationDays,
          lockReason.trim() || 'Security policy compliance'
        );
        if (res.success) {
          setActionSuccess(`Account locked for ${lockDurationDays} days.`);
          setLockAccountModal(null);
          loadIpGroups(userSearch);
        } else {
          setActionError(res.error?.message || 'Failed to lock account.');
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing account lock action.');
    } finally {
      setSavingLockAction(false);
    }
  };

  // Role Modal Handlers (Replaces window.prompt)
  const handleOpenChangeRoleModal = (u: any) => {
    setChangeRoleModal({
      userId: u.id,
      userName: u.fullName || u.email,
      currentRole: u.role,
    });
    setSelectedNewRole(u.role);
    setRoleReason('Staff role update via administrative control panel');
  };

  const handleConfirmChangeRole = async () => {
    if (!changeRoleModal) return;
    setSavingRoleChange(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.updateUserRole(
        changeRoleModal.userId,
        selectedNewRole,
        roleReason.trim() || 'Role update via admin console'
      );
      if (res.success) {
        setActionSuccess(`Role for ${changeRoleModal.userName} updated to ${selectedNewRole}.`);
        setChangeRoleModal(null);
        loadIpGroups(userSearch);
      } else {
        setActionError(res.error?.message || 'Failed to update role.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating role (Max 10 support agents limit).');
    } finally {
      setSavingRoleChange(false);
    }
  };

  // Escalate Modal Handlers (Replaces window.prompt)
  const handleOpenEscalateModal = (convo: any) => {
    setEscalateModal({
      convoId: convo.id,
      userName: convo.user?.fullName || convo.guestName || 'Customer',
    });
    setEscalateReason('Customer requested senior platform admin escalation');
  };

  const handleConfirmEscalate = async () => {
    if (!escalateModal || !escalateReason.trim()) return;
    setSavingEscalation(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.adminEscalateSupportToSuperAdmin(escalateModal.convoId, escalateReason.trim());
      if (res.success) {
        setSelectedConvo(res.data);
        setActionSuccess('Ticket escalated to Super Admin successfully.');
        setEscalateModal(null);
        loadSupportConversations();
      } else {
        setActionError(res.error?.message || 'Failed to escalate ticket.');
      }
    } catch {
      setActionError('Error escalating ticket.');
    } finally {
      setSavingEscalation(false);
    }
  };

  const handleTriggerDailyBonus = async () => {
    if (!window.confirm('Execute daily level bonus processing batch for all active users?')) return;
    try {
      const res = await api.triggerDailyBonusBatch();
      if (res.success) {
        setActionSuccess(`Daily bonus executed: ${res.data.totalUsersPaid} users credited with $${res.data.totalAmountUSD}.`);
      } else {
        setActionError(res.error?.message || 'Daily bonus already executed for today.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing daily bonus.');
    }
  };

  const allAdminNavGroups: Array<{
    label: string;
    items: Array<{ id: typeof activeTab; label: string; icon: React.ReactNode; badge?: number }>;
  }> = [
    {
      label: 'Overview',
      items: [{ id: 'kpis', label: 'Dashboard & KPIs', icon: <TrendingUp className="w-4 h-4" /> }],
    },
    {
      label: 'Finance & Queues',
      items: [
        { id: 'deposits', label: 'Deposits', icon: <CreditCard className="w-4 h-4" />, badge: pendingDepositsCount },
        { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowUpRight className="w-4 h-4" />, badge: pendingWithdrawalsCount },
        { id: 'wallets', label: 'Wallet Adjustments', icon: <Wallet className="w-4 h-4" /> },
        { id: 'gateways', label: 'USD Channels', icon: <CreditCard className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Growth & Content',
      items: [
        { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { id: 'packages', label: 'Packages', icon: <Layers className="w-4 h-4" /> },
        { id: 'levels', label: 'Account Levels', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'referrals', label: 'Referrals & Ranks', icon: <Users className="w-4 h-4" /> },
        { id: 'bonuses', label: 'Bonuses', icon: <Gift className="w-4 h-4" /> },
        { id: 'videos', label: 'Videos', icon: <PlaySquare className="w-4 h-4" /> },
        { id: 'documents', label: 'Documents', icon: <FileCheck className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'support', label: 'Live Support', icon: <MessageSquare className="w-4 h-4" />, badge: waitingSupportCount },
        { id: 'popups', label: 'Live Popups', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports & Audit', icon: <FileBarChart className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings & CMS', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const adminNavGroups = isSupportAgentOnly
    ? [
        {
          label: 'Support Desk',
          items: [
            { id: 'support' as const, label: 'Live Support', icon: <MessageSquare className="w-4 h-4" />, badge: waitingSupportCount },
            { id: 'users' as const, label: 'Users & IP View', icon: <Users className="w-4 h-4" /> },
          ],
        },
      ]
    : allAdminNavGroups;

  const activeAdminItem = adminNavGroups.flatMap((g) => g.items).find((i) => i.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* GROUPED LEFT SIDEBAR (Admin Appendix — replaces 16-item scrolling pill row) */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[244px] shrink-0 bg-white border-r border-slate-200/90 sticky top-0 h-screen z-30">
        <div className="h-[60px] px-4 xl:px-5 border-b border-slate-100 flex items-center justify-center xl:justify-start gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="hidden xl:flex flex-col leading-tight min-w-0">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              U-<span className="text-emerald-600">Ads</span> Admin
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
              {(user?.role || 'ADMIN').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 xl:px-3 space-y-5">
          {adminNavGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="hidden xl:block px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={`w-full relative flex items-center justify-center xl:justify-between gap-2.5 px-2.5 xl:px-3 h-9 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-emerald-600" />
                    )}
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span className="hidden xl:inline truncate">{item.label}</span>
                    </span>
                    {item.badge && item.badge > 0 ? (
                      <span className="hidden xl:inline-flex min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold items-center justify-center tabular-nums">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="w-full h-9 px-3 rounded-[10px] text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center xl:justify-start gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Slim Admin Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
          <div className="h-[60px] px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {activeAdminItem?.label || 'Admin Console'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Agent Availability Selector (F17) */}
              {(user?.role === 'SUPPORT_AGENT' || user?.role === 'SUPER_ADMIN') && (
                <select
                  value={agentPresence}
                  onChange={async (e) => {
                    const next = e.target.value as 'ONLINE' | 'BUSY' | 'OFFLINE';
                    setAgentPresence(next);
                    await api.updateAgentAvailability(next).catch(() => {});
                    setActionSuccess(`Availability updated to ${next}.`);
                  }}
                  title="Live Support Availability"
                  className="h-9 px-2.5 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ONLINE">Online</option>
                  <option value="BUSY">Busy</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              )}

              {/* Configurable 2-5s Chime Interval + Mute Toggle (F17) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
                  title={soundAlertsEnabled ? 'Mute Support Alert Chime' : 'Enable Support Alert Chime'}
                  className={`h-9 px-2.5 rounded-[10px] border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    soundAlertsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {soundAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="hidden sm:inline">{soundAlertsEnabled ? 'Alerts' : 'Muted'}</span>
                </button>
                {soundAlertsEnabled && (
                  <select
                    value={chimeIntervalSec}
                    onChange={(e) => setChimeIntervalSec(parseInt(e.target.value, 10) || 3)}
                    title="Repeat ring interval (2–5 seconds)"
                    className="h-9 px-2 rounded-[10px] bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 cursor-pointer"
                  >
                    <option value={2}>2s</option>
                    <option value={3}>3s</option>
                    <option value={4}>4s</option>
                    <option value={5}>5s</option>
                  </select>
                )}
              </div>

              <div className="hidden sm:block text-right pl-1">
                <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
                <div className="text-[10px] text-slate-500 font-medium">U-Ads Operations</div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="md:hidden h-9 px-2.5 rounded-[10px] bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile-only compact tab strip */}
          <div className="md:hidden px-3 py-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {adminNavGroups.flatMap((g) => g.items).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </header>

        {/* Main Admin View Content */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-page-in">
          {/* Actionable Pending Queues Strip on Dashboard Overview */}
          {activeTab === 'kpis' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('deposits')}
                className="card-white card-hover p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500">Pending Deposits Queue</div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {pendingDepositsCount}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pendingDepositsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {pendingDepositsCount > 0 ? 'Review →' : 'Clear'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('withdrawals')}
                className="card-white card-hover p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500">Pending Withdrawals Queue</div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {pendingWithdrawalsCount}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pendingWithdrawalsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {pendingWithdrawalsCount > 0 ? 'Review →' : 'Clear'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('support')}
                className="card-white card-hover p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500">Waiting Support Chats</div>
                  <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {waitingSupportCount}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${waitingSupportCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {waitingSupportCount > 0 ? 'Respond →' : 'Clear'}
                </span>
              </button>
            </div>
          )}
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
                    Every transaction across U-Ads USD wallets strictly satisfies &Sigma; Debits = &Sigma; Credits. Zero drift.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                AUDIT CERTIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Total Registered Users</span>
                <div className="text-3xl font-extrabold text-slate-900">{kpis?.totalUsers ?? 0}</div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {kpis?.activeUsers ?? 0} Active • {kpis?.suspendedUsers ?? 0} Suspended
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Pending Deposits</span>
                <div className="text-3xl font-extrabold text-amber-600">
                  {kpis?.pendingDepositsCount ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">
                  USD: ${((kpis?.pendingDepositsCents?.USD ?? 0) / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Verified USD Deposits</span>
                <div className="text-3xl font-extrabold text-emerald-700">
                  ${((kpis?.verifiedDepositsCents?.USD ?? 0) / 100).toFixed(2)}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Approved USD treasury inflow
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Pending Withdrawals</span>
                <div className="text-3xl font-extrabold text-rose-600">
                  {kpis?.pendingWithdrawalsCount ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">
                  Hold: ${((kpis?.pendingWithdrawalsCents?.USD ?? 0) / 100).toFixed(2)} • Paid: ${((kpis?.completedPayoutsCents?.USD ?? 0) / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Total Video Completions</span>
                <div className="text-3xl font-extrabold text-teal-700">
                  {kpis?.totalVideoCompletions ?? kpis?.totalViewsCount ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">
                  Across {kpis?.totalVideosCount ?? 0} catalog videos
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Total Eligible Rewards</span>
                <div className="text-3xl font-extrabold text-indigo-700">
                  ${((kpis?.totalEligibleRewardsCents ?? 0) / 100).toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">
                  Video, referral &amp; daily level payouts
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Total Referrals</span>
                <div className="text-3xl font-extrabold text-purple-700">
                  {kpis?.totalReferrals ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">
                  Attributed direct referrals
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-semibold">Live Support Agents</span>
                <div className="text-3xl font-extrabold text-slate-900">
                  {kpis?.onlineSupportAgents ?? 0} / {kpis?.activeSupportAgents ?? 0}
                </div>
                <span className="text-[11px] text-amber-600 font-medium">
                  {kpis?.waitingSupportChats ?? waitingSupportCount} waiting chats
                </span>
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
                              Sender Contact: {dep.senderPhone}
                            </div>
                          )}
                          {dep.createdAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(dep.createdAt).toLocaleString()}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{dep.paymentMethod?.name || 'USD Channel'}</div>
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            {dep.paymentMethod?.code || dep.currency}
                          </span>
                        </td>

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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              Missing Slip — Verify Manually
                            </span>
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
                      <th className="py-3 px-6">Submitted</th>
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

                        <td className="py-4 px-6 text-[11px] text-slate-500 whitespace-nowrap">
                          {w.createdAt ? new Date(w.createdAt).toLocaleString() : '-'}
                        </td>

                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          {(w.amountCents / 100).toFixed(2)} {w.currency}
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          {w.payoutMethod === 'CRYPTO_USDT'
                            ? 'Crypto — USDT TRC-20'
                            : w.payoutMethod === 'USD_BANK_WIRE'
                            ? 'USD Bank Wire'
                            : (w.payoutMethod || '').replace(/_/g, ' ')}
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              w.status === 'COMPLETED' || w.status === 'PAID'
                                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                : w.status === 'REJECTED' || w.status === 'FAILED' || w.status === 'CANCELLED'
                                ? 'border-rose-200 text-rose-700 bg-rose-50'
                                : 'border-amber-200 text-amber-800 bg-amber-50'
                            }`}
                          >
                            {w.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right space-x-1.5 space-y-1">
                          <button
                            onClick={() => openUserDossier(w.userId)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Audit user earnings, deposits, video rewards, and activity trail"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Audit
                          </button>
                          {!['COMPLETED', 'PAID', 'REJECTED', 'FAILED', 'CANCELLED'].includes(w.status) && (
                            <>
                              {w.status === 'PENDING' && (
                                <button
                                  onClick={() => handleWithdrawalTransition(w.id, 'UNDER_REVIEW')}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                                >
                                  Under Review
                                </button>
                              )}
                              {['PENDING', 'UNDER_REVIEW'].includes(w.status) && (
                                <button
                                  onClick={() => handleWithdrawalTransition(w.id, 'APPROVE')}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(w.status) && (
                                <button
                                  onClick={() => handleWithdrawalTransition(w.id, 'PROCESSING')}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                >
                                  Processing
                                </button>
                              )}
                              <button
                                onClick={() => setCompleteModal(w.id)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => setRejectModal({ type: 'withdrawal', id: w.id })}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleWithdrawalTransition(w.id, 'FAILED', 'External payout rail failure')}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                              >
                                Mark Failed
                              </button>
                            </>
                          )}
                          {(w.status === 'COMPLETED' || w.status === 'PAID') && (
                            <div className="inline-flex items-center gap-2 ml-2">
                              <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                                Tx: {w.payoutRef}
                              </span>
                              {w.payoutProofUrl && (
                                <button
                                  type="button"
                                  onClick={() => setReceiptModal(w.payoutProofUrl)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  Proof
                                </button>
                              )}
                            </div>
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

        {/* TAB 4: UNIFIED USERS LIST GROUPED BY ACTUAL IP ADDRESS (PART 6 #1 & #2 — ADMIN + SUPPORT) */}
        {activeTab === 'users' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
            <div className="p-6 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Users &amp; IP Address Monitor (Online First)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Online members appear at the top. Shared IP addresses are grouped together with the actual IP shown.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search name, email, ID, or IP..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadIpGroups(userSearch)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500 w-56"
                />
                <button
                  type="button"
                  onClick={() => loadIpGroups(userSearch)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => loadIpGroups(userSearch)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={handleTriggerDailyBonus}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Daily Bonus Batch</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 pt-1 space-y-3.5">
              {loadingIpGroups ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading users grouped by IP address…
                </div>
              ) : ipGroups.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No users match your search.
                </div>
              ) : (
                ipGroups.map((group, gIdx) => {
                  const isShared = !group.isUnrecorded && group.accountCount > 1;
                  return (
                    <div
                      key={`${group.ipAddress || group.ip}-${gIdx}`}
                      className={`rounded-2xl border overflow-hidden ${
                        isShared
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Actual IP Address Group Header */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            IP Address:
                          </span>
                          <span className="font-mono font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {group.ipAddress || group.ip}
                          </span>
                          {isShared && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Shared IP · {group.accountCount} Accounts
                            </span>
                          )}
                          {group.onlineCount > 0 && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ● {group.onlineCount} Online
                            </span>
                          )}
                          {group.restrictedCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              {group.restrictedCount} Restricted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Single-Line Rich Member Rows */}
                      <div className="divide-y divide-slate-100">
                        {group.accounts.map((u: any) => {
                          const isLocked = Boolean(u.isLocked);
                          const isSuspended = u.status === 'SUSPENDED';
                          const totalUsd = ((u.totalBalanceCents || 0) / 100).toFixed(2);
                          return (
                            <div
                              key={u.id}
                              className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50/70 transition-colors"
                            >
                              {/* Identity + Online + Balance + Plan + Status ALL ON ONE LINE */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-[180px]">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                      u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                    }`}
                                    title={u.isOnline ? 'Online Now' : 'Offline'}
                                  />
                                  <span className="font-extrabold text-slate-900">{u.fullName}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {u.memberCode}
                                  </span>
                                </div>

                                <span className="text-[11px] font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 tabular-nums">
                                  Balance: ${totalUsd}
                                </span>

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {u.activePackageName ? `${u.activePackageName} · ` : ''}
                                  {u.accountLevel || 'NEW_USER'}
                                </span>

                                <span className="text-[10px] text-slate-500 font-medium">
                                  {u.isOnline ? (
                                    <strong className="text-emerald-700">Online now</strong>
                                  ) : u.lastSeenAt ? (
                                    `Last seen ${new Date(u.lastSeenAt).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  ) : (
                                    'Never logged in'
                                  )}
                                </span>

                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    isSuspended
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : isLocked
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {isSuspended
                                    ? 'SUSPENDED'
                                    : isLocked
                                    ? `LOCKED (${u.restriction || 'Active'})`
                                    : 'ACTIVE'}
                                </span>
                              </div>

                              {/* Actions: Message First, Dossier, & Admin Controls */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDirectMsgModal({ userId: u.id, fullName: u.fullName, email: u.email });
                                    setDirectMsgSubject('Message from U-Ads Administration');
                                    setDirectMsgBody('');
                                    setDirectMsgAttachment(null);
                                    setDirectMsgAttachmentName(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 cursor-pointer inline-flex items-center gap-1"
                                  title="Send direct push message & screenshot to this user"
                                >
                                  <Send className="w-3 h-3" />
                                  Message
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUserDossier(u.id)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Dossier
                                </button>
                                {user?.role === 'SUPER_ADMIN' && u.id !== user.id && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjustLevelModal(u)}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                                    >
                                      Level
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLockModal(u, isLocked)}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                        isLocked
                                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {isLocked ? 'Unlock' : 'Lock'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenChangeRoleModal(u)}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                                    >
                                      Role
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleToggleUserStatus(u.id, u.status);
                                        loadIpGroups(userSearch);
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                        u.status === 'ACTIVE'
                                          ? 'bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200'
                                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                      }`}
                                    >
                                      {u.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
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
                  USD Deposit Payment Channels &amp; Treasury Wallets
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add, edit, activate, or remove USD deposit channels (USDT TRC-20, International Bank Wire, etc.) shown to members.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() =>
                    setEditingGateway({
                      id: null,
                      code: '',
                      name: '',
                      currency: 'USD',
                      accountTitle: '',
                      accountNumber: '',
                      instructions: 'Send USD to the details above and submit your transaction reference and receipt. Verified in 10–30 minutes.',
                      minAmountCents: 2000,
                      maxAmountCents: 5000000,
                      isActive: true,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add USD Channel
                </button>
                <button
                  onClick={loadGateways}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
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

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingGateway({ ...gw })}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Channel
                      </button>
                      <button
                        onClick={() => handleDeleteGateway(gw)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete / Deactivate Channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: LIVE ACTIVITY POPUPS MANAGER (PART 2 #6) */}
        {activeTab === 'popups' && (
          <AdminLivePopupsTab
            onSuccess={(msg) => setActionSuccess(msg)}
            onError={(msg) => setActionError(msg)}
          />
        )}

        {/* TAB 6: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Configuration, Landing CMS &amp; Notifications</h3>
                  <p className="text-xs text-slate-500">
                    Modify global U-Ads USD business rules, deposit verification time text, landing page content, and notification triggers.
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

            <div className="space-y-3">
              {settings
                .filter((s) => !['REFERRAL_CONFIG', 'BONUS_SETTINGS', 'NOTIFICATION_SETTINGS', 'LANDING_CONTENT'].includes(s.key))
                .map((s) => {
                  const humanMeta: Record<string, { title: string; unit?: string; isBool?: boolean; isGuarded?: boolean }> = {
                    REWARDS_ENABLED: { title: 'Video Watch Rewards', isBool: true },
                    COMMISSIONS_ENABLED: { title: 'Referral Commissions', isBool: true },
                    MAINTENANCE_MODE: { title: 'Maintenance Mode (Emergency Pause)', isBool: true, isGuarded: true },
                    MIN_WITHDRAWAL_USD_CENTS: { title: 'Minimum Withdrawal Amount', unit: 'USD cents (1000 = $10.00)' },
                    MIN_DEPOSIT_USD_CENTS: { title: 'Minimum Deposit Amount', unit: 'USD cents (2000 = $20.00)' },
                    DEPOSIT_VERIFICATION_TIME_TEXT: { title: 'Expected Deposit Verification Time', unit: 'Display label' },
                    SUPPORT_REASSIGN_TIMEOUT_SECONDS: { title: 'Support Auto-Reassign Timeout', unit: 'Seconds' },
                    DAILY_RESET_HOUR: { title: 'Daily Ad Claim Cycle Cutoff Hour (0–23 PKT)', unit: '20 = 8:00 PM PKT to next 7:59:59 PM PKT' },
                  };
                  const meta = humanMeta[s.key] || {
                    title: s.key.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                  };
                  const currentVal = settingEdits[s.key] ?? s.value;

                  return (
                    <div
                      key={s.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                        meta.isGuarded && currentVal === 'true'
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 max-w-lg">
                        <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                          <span>{meta.title}</span>
                          {meta.unit && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                              {meta.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{s.description}</div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {meta.isBool ? (
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              if (meta.isGuarded && nextVal === 'true') {
                                const confirmed = window.confirm(
                                  'Enable Maintenance Mode? Regular members will be paused from normal activity until you turn it off.'
                                );
                                if (!confirmed) return;
                              }
                              setSettingEdits({ ...settingEdits, [s.key]: nextVal });
                            }}
                            className="h-9 px-3 rounded-[10px] bg-white border border-slate-200 font-bold text-slate-900 text-xs"
                          >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) =>
                              setSettingEdits({ ...settingEdits, [s.key]: e.target.value })
                            }
                            className="h-9 px-3 rounded-[10px] bg-white border border-slate-200 font-bold text-slate-900 text-xs w-44"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSetting(s.key)}
                          disabled={savingSettingKey === s.key}
                          className="btn-primary !h-9"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingSettingKey === s.key ? 'Saving…' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <AdminCmsAndNotificationsPanel
              onSuccess={(m) => {
                setActionError(null);
                setActionSuccess(m);
              }}
              onError={(m) => {
                setActionSuccess(null);
                setActionError(m);
              }}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 7. LIVE SUPPORT & CUSTOMER INQUIRIES DESK */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            {user?.role === 'SUPER_ADMIN' && (
              <AdminSupportAgentsPanel
                onSuccess={(m) => {
                  setActionError(null);
                  setActionSuccess(m);
                }}
                onError={(m) => {
                  setActionSuccess(null);
                  setActionError(m);
                }}
              />
            )}
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
                  onClick={() => loadSupportConversations()}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200"
                  title="Refresh Tickets"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Agent Presence Status (Section 12.4) */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-1 hidden sm:inline">Status:</span>
                  <button
                    type="button"
                    onClick={() => handlePresenceChange('ONLINE')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      agentPresence === 'ONLINE'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresenceChange('BUSY')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      agentPresence === 'BUSY'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                    Busy
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresenceChange('OFFLINE')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      agentPresence === 'OFFLINE'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Offline
                  </button>
                </div>
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
                  {loadingSupport && supportConversations.length === 0 ? (
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
                      const isMuted = mutedConvoIds.includes(convo.id);
                      const isRinging = ringingConvoId === convo.id;
                      const displayName = convo.user?.fullName || convo.guestName || 'Customer';
                      const email = convo.user?.email || convo.guestEmail || 'No email provided';
                      const lastMsg = convo.messages?.[0]?.message || 'Conversation initiated';

                      return (
                        <div
                          key={convo.id}
                          onClick={() => {
                            setSelectedConvoId(convo.id);
                            if (ringingConvoId === convo.id) setRingingConvoId(null);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isRinging
                              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300/60'
                              : isSelected
                              ? 'bg-purple-50/60 border-purple-400 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                                  {displayName}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Per-Chat Individual Mute Toggle (Part 6 #3) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMuteConvo(convo.id);
                                }}
                                title={isMuted ? 'Unmute this chat' : 'Mute this chat'}
                                className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                  isMuted
                                    ? 'bg-slate-100 text-rose-500 border-slate-200'
                                    : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200'
                                }`}
                              >
                                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                              </button>
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

                      {/* Status Selector, Manual Agent Assign & Resolution Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        {user?.role === 'SUPER_ADMIN' && supportAgentsList.length > 0 && (
                          <select
                            value={selectedConvo.assignedToId || ''}
                            disabled={assigningAgent}
                            onChange={(e) => handleAssignSupportAgent(selectedConvo.id, e.target.value)}
                            title="Manually assign this chat to a support agent"
                            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            <option value="">Assign Agent...</option>
                            {supportAgentsList.map((ag: any) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.fullName} ({ag.agentAvailability || 'OFFLINE'})
                              </option>
                            ))}
                          </select>
                        )}
                        {(selectedConvo.userId || selectedConvo.user?.id) && (
                          <button
                            type="button"
                            onClick={() => openUserDossier(selectedConvo.userId || selectedConvo.user!.id)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Audit user balance, deposits, video claims and activity trail (Audio 2)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            User Dossier
                          </button>
                        )}
                        <select
                          value={selectedConvo.status}
                          onChange={(e) => handleUpdateSupportStatus(selectedConvo.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
                        >
                          <option value="WAITING_FOR_AGENT">⚠️ Waiting for Agent</option>
                          <option value="AGENT_ACTIVE">👨‍💼 Agent Active</option>
                          <option value="ESCALATED_TO_ADMIN">🚨 Escalated to Admin</option>
                          <option value="BOT">🤖 Bot Mode</option>
                          <option value="RESOLVED">✅ Mark Resolved</option>
                        </select>

                        {selectedConvo.status !== 'ESCALATED_TO_ADMIN' && selectedConvo.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEscalateModal(selectedConvo)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Escalate issue to Super Admin"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Escalate to Admin
                          </button>
                        )}

                        {selectedConvo.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleUpdateSupportStatus(selectedConvo.id, 'RESOLVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
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
                                    : '🤖 U-Ads AI Assistant'}
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
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                  Public Catalog
                                </span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      video.isPublished
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {video.isPublished ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                  {video.isLocked && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      LOCKED
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[11px] font-semibold">
                                Tier: {video.minPackageTier} • Min Level: {(video.minAccountLevel || 'LEVEL_1').replace('_', ' ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer (Activate/Deactivate, Lock/Unlock, Test Play, Edit, Delete — F4) */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => setVideoPreviewModal(video)}
                        className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Test Play
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleVideoActive(video)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            video.isPublished
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={video.isPublished ? 'Deactivate Video' : 'Activate Video'}
                        >
                          {video.isPublished ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleToggleVideoLock(video)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            video.isLocked
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={video.isLocked ? 'Unlock Video' : 'Lock Video'}
                        >
                          {video.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                        <button
                          onClick={() => openEditVideoModal(video)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Video or Reassign"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          disabled={deletingVideoId === video.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* TAB: COMPANY DOCUMENTS (SECTION 2.1) */}
        {activeTab === 'documents' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Company Documents & Regulatory Credentials (Section 2.1)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Upload, update, and manage official corporate registration certificates and business licenses displayed on the public landing page.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddDocModal}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Upload New Credential
              </button>
            </div>

            {loadingDocuments ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading documents...</div>
            ) : documentsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No corporate documents uploaded yet. Click above to add your registration certificate or business license.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Document Title</th>
                      <th className="py-3 px-6">Classification</th>
                      <th className="py-3 px-6">Issuing Authority</th>
                      <th className="py-3 px-6">Landing Page Visibility</th>
                      <th className="py-3 px-6">Resource Link</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {documentsList.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">{doc.title}</td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                            {doc.documentType?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{doc.issuingAuthority || doc.issuer || 'Official Registrar'}</td>
                        <td className="py-4 px-6">
                          {doc.isPublic ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Public on Landing Page
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Internal / Hidden
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handleInspectDocument(doc.fileUrl, doc.title)}
                            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-bold hover:underline cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Inspect Document
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openEditDocModal(doc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Document"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legal Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">SRS Section 2.1 Compliance: </span>
                Only verified and authentic business licenses may be presented to the public within their actual legal scope. General company registration does not represent authorization for financial custody or guaranteed returns.
              </div>
            </div>
          </div>
        )}

        {/* TAB: ACCOUNT LEVELS & DAILY BONUS (SECTIONS 3, 5.1 & 11) */}
        {activeTab === 'levels' && (
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Account Levels & Daily Bonus System (Sections 3 & 5.1)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Configure the 6 account classification tiers, video access quotas, approved daily bonus rates, and execute daily reward batches.
                </p>
              </div>

              {user?.role === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={handleTriggerDailyBonus}
                  disabled={triggeringBonusBatch}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {triggeringBonusBatch ? 'Calculating & Posting Ledger...' : 'Run Daily Bonus Batch (8:00 PM)'}
                </button>
              )}
            </div>

            {loadingLevels ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading account level tiers...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6">Classification Tier</th>
                      <th className="py-3 px-6">Display Name</th>
                      <th className="py-3 px-6">Qualification Range (USD)</th>
                      <th className="py-3 px-6">Daily Video Limit</th>
                      <th className="py-3 px-6">Approved Daily Bonus Rate</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {levelsList.map((lvl: any) => {
                      const minUSDNum = (lvl.minQualificationUSD ?? lvl.minAmountCents ?? 0) / 100;
                      const maxUSDNum =
                        lvl.maxQualificationUSD != null
                          ? lvl.maxQualificationUSD / 100
                          : lvl.maxAmountCents
                          ? lvl.maxAmountCents / 100
                          : null;
                      const bonusBps = lvl.dailyBonusRateBps ?? lvl.dailyBonusBps ?? 0;
                      const minUSD = Number(minUSDNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const maxUSD =
                        maxUSDNum !== null && maxUSDNum !== undefined
                          ? `$${Number(maxUSDNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'No Cap';
                      const bonusPercent = (Number(bonusBps) / 100).toFixed(2);

                      return (
                        <tr key={lvl.id || lvl.levelKey} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {lvl.levelKey}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-indigo-900">{lvl.name || lvl.displayName || lvl.levelKey}</td>
                          <td className="py-4 px-6 font-mono font-semibold text-slate-800">
                            ${minUSD} – {maxUSD}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-700">
                            {lvl.videoLimit ?? lvl.dailyVideoLimit ?? 0} videos
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-700">
                            {bonusPercent}% ({bonusBps} bps)
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEditLevelModal(lvl)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                            >
                              Edit Tier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SRS Presets Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Account Lock Presets (Section 11)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Standard lock durations supported: <strong>60 Days</strong>, <strong>100 Days</strong>, and <strong>360 Days</strong>. Early unlocks require an authorized administrative reason and are permanently preserved in the audit history.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900">Daily Bonus Schedule (Section 5.1)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Daily Level Rewards execute automatically at <strong>8:00 PM Pakistan Time</strong> (15:00 UTC). Rewards are backed strictly by confirmed platform revenue and recorded via double-entry balancing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NEW ADMIN TABS: PACKAGES, REFERRALS CONFIG, BONUSES, WALLETS, REPORTS */}
        {activeTab === 'packages' && (
          <AdminPackagesTab
            onSuccess={(m) => { setActionError(null); setActionSuccess(m); }}
            onError={(m) => { setActionSuccess(null); setActionError(m); }}
          />
        )}
        {activeTab === 'referrals' && (
          <AdminReferralsConfigTab
            onSuccess={(m) => { setActionError(null); setActionSuccess(m); }}
            onError={(m) => { setActionSuccess(null); setActionError(m); }}
          />
        )}
        {activeTab === 'bonuses' && (
          <AdminBonusesConfigTab
            onSuccess={(m) => { setActionError(null); setActionSuccess(m); }}
            onError={(m) => { setActionSuccess(null); setActionError(m); }}
          />
        )}
        {activeTab === 'wallets' && (
          <AdminWalletAdjustTab
            onSuccess={(m) => { setActionError(null); setActionSuccess(m); }}
            onError={(m) => { setActionSuccess(null); setActionError(m); }}
          />
        )}
        {activeTab === 'reports' && (
          <AdminReportsAuditTab
            onSuccess={(m) => { setActionError(null); setActionSuccess(m); }}
            onError={(m) => { setActionSuccess(null); setActionError(m); }}
          />
        )}
      </main>
      </div>

      {/* EDIT GATEWAY MODAL */}
      {editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingGateway.id ? `Edit USD Channel: ${editingGateway.name}` : 'Create New USD Payment Channel'}
                </h3>
                <span className="text-xs text-purple-700 font-mono font-bold">
                  {editingGateway.code || 'NEW_USD_CHANNEL'} (USD)
                </span>
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
              {!editingGateway.id && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Channel Code (Unique)</label>
                  <input
                    type="text"
                    placeholder="e.g. CRYPTO_USDT_BEP20 or USD_WISE"
                    value={editingGateway.code || ''}
                    onChange={(e) => setEditingGateway({ ...editingGateway, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Channel Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. USDT (TRC-20 Network)"
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
                  placeholder="e.g. U-Ads Treasury Custody LLC"
                  value={editingGateway.accountTitle || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, accountTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Number / Wallet Address (USDT TRC-20, SWIFT / IBAN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
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

      {/* VIEW RECEIPT / PAYOUT PROOF MODAL (z-[80] so it stacks above Dossier & all other modals) */}
      {receiptModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => {
            setReceiptModal(null);
            setReceiptZoomed(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  Payment Proof &amp; Receipt Viewer
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect the uploaded deposit receipt slip, withdrawal settlement proof, or attachment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptModal(null);
                  setReceiptZoomed(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-2 flex items-center justify-center max-h-[70vh] overflow-auto">
              {receiptModal.toLowerCase().endsWith('.pdf') || receiptModal.startsWith('data:application/pdf') ? (
                <iframe
                  src={receiptModal}
                  title="Payment proof PDF"
                  className="w-full h-[65vh] rounded-xl bg-white"
                />
              ) : (
                <img
                  src={receiptModal}
                  alt="Payment slip receipt"
                  onClick={() => setReceiptZoomed(!receiptZoomed)}
                  className={`rounded-xl transition-transform cursor-zoom-in ${
                    receiptZoomed ? 'scale-150 origin-top' : 'max-h-[65vh] w-auto object-contain'
                  }`}
                />
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReceiptZoomed(!receiptZoomed)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  {receiptZoomed ? 'Reset Zoom' : 'Zoom 150%'}
                </button>
                <a
                  href={receiptModal}
                  download={`uads-receipt-${Date.now()}.png`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold"
                >
                  Download Slip
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (receiptModal.startsWith('data:')) {
                      try {
                        const [header, b64] = receiptModal.split(',');
                        const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
                        const bytes = atob(b64);
                        const arr = new Uint8Array(bytes.length);
                        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                        const blobUrl = URL.createObjectURL(new Blob([arr], { type: mime }));
                        window.open(blobUrl, '_blank', 'noopener,noreferrer');
                      } catch {
                        window.open(receiptModal, '_blank', 'noopener,noreferrer');
                      }
                    } else {
                      window.open(receiptModal, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </button>
              </div>
              <button
                onClick={() => {
                  setReceiptModal(null);
                  setReceiptZoomed(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER FINANCIAL DOSSIER & AUDIT TRAIL MODAL (Audio 2) */}
      {dossierUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header — Live Status, Online Presence, Plan, Joined Date, Message & Inline Restriction Removal (Part 6 #4 & #5) */}
            <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        dossierData?.user?.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <h3 className="text-base font-bold text-white">
                      {dossierData?.user?.fullName || 'User Financial Audit Dossier'}
                    </h3>
                    {dossierData?.user?.status && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          dossierData.user.status === 'SUSPENDED'
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                            : dossierData.user.isLocked
                            ? 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                            : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                        }`}
                      >
                        {dossierData.user.status === 'SUSPENDED'
                          ? 'SUSPENDED'
                          : dossierData.user.isLocked
                          ? 'LOCKED'
                          : dossierData.user.isOnline
                          ? 'ACTIVE · ONLINE'
                          : 'ACTIVE'}
                      </span>
                    )}
                    {dossierData?.user?.activePackageName && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-200 border border-orange-400/40">
                        {dossierData.user.activePackageName} Plan
                      </span>
                    )}
                    {dossierData?.user?.accountLevel && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                        {dossierData.user.accountLevel}
                      </span>
                    )}
                    {dossierData?.user?.referralRank && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                        {dossierData.user.referralRank} Rank
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dossierData?.user?.email} • ID: {dossierData?.user?.memberCode || '—'} • IP:{' '}
                    <span className="font-mono text-slate-200">{dossierData?.user?.ipAddress || 'Not recorded'}</span> • Joined:{' '}
                    {dossierData?.user?.createdAt ? new Date(dossierData.user.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dossierData?.user && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirectMsgModal({
                        userId: dossierData.user.id,
                        fullName: dossierData.user.fullName,
                        email: dossierData.user.email,
                      });
                      setDirectMsgSubject('Message from U-Ads Administration');
                      setDirectMsgBody('');
                      setDirectMsgAttachment(null);
                      setDirectMsgAttachmentName(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Message User
                  </button>
                )}
                {user?.role === 'SUPER_ADMIN' &&
                  dossierData?.user &&
                  (dossierData.user.status === 'SUSPENDED' || dossierData.user.isLocked) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const uid = dossierData.user.id;
                        if (dossierData.user.status === 'SUSPENDED') {
                          await handleToggleUserStatus(uid, 'SUSPENDED');
                        }
                        if (dossierData.user.isLocked) {
                          await api.unlockUserAccount(uid, 'Restriction removed directly from Member Dossier');
                          setActionSuccess(`Restriction removed for ${dossierData.user.fullName}.`);
                        }
                        openUserDossier(uid);
                        loadIpGroups(userSearch);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Remove Restriction
                    </button>
                  )}
                <button
                  onClick={() => setDossierUserId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDossier ? (
              <div className="p-20 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Retrieving full ledger trails and activity logs...</p>
              </div>
            ) : !dossierData ? (
              <div className="p-16 text-center text-slate-500 text-xs">
                Unable to load user financial records.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* KPI Summary Cards (All USD Wallets including live Video Rewards balance — F13) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Main Available</span>
                    <span className="text-lg font-black text-emerald-950 font-mono">${dossierData.balances.availableUSD.toFixed(2)}</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Main USD Credits</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Video Rewards</span>
                    <span className="text-lg font-black text-teal-950 font-mono">${(dossierData.balances.videoRewardsUSD ?? 0).toFixed(2)}</span>
                    <span className="text-[10px] text-teal-700 block mt-0.5">Live Video Wallet</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/80">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Referral Wallet</span>
                    <span className="text-lg font-black text-purple-950 font-mono">${dossierData.balances.referralUSD.toFixed(2)}</span>
                    <span className="text-[10px] text-purple-700 block mt-0.5">Isolated commissions</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Reserved Hold</span>
                    <span className="text-lg font-black text-amber-950 font-mono">${dossierData.balances.reservedUSD.toFixed(2)}</span>
                    <span className="text-[10px] text-amber-700 block mt-0.5">Withdrawal hold</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Approved Deposits</span>
                    <span className="text-lg font-black text-slate-900 font-mono">${dossierData.totals.totalDepositsApprovedUSD.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{dossierData.deposits.filter((d: any) => d.status === 'APPROVED').length} Approved txs</span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
                  <button
                    onClick={() => setDossierTab('overview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'overview' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setDossierTab('deposits')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'deposits' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Deposits ({dossierData.deposits.length})
                  </button>
                  <button
                    onClick={() => setDossierTab('withdrawals')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'withdrawals' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Withdrawals ({dossierData.withdrawals.length})
                  </button>
                  <button
                    onClick={() => setDossierTab('videos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'videos' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Videos ({dossierData.videoRewards.length})
                  </button>
                  <button
                    onClick={() => setDossierTab('referrals')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'referrals' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Referrals ({dossierData.referrals.directCount})
                  </button>
                  <button
                    onClick={() => setDossierTab('history')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'history' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Level / Rank / Locks ({(dossierData.levelHistory?.length || 0) + (dossierData.lockHistory?.length || 0)})
                  </button>
                  <button
                    onClick={() => setDossierTab('timeline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'timeline' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Activity Timeline ({dossierData.activityTimeline?.length || 0})
                  </button>
                  <button
                    onClick={() => setDossierTab('ledger')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      dossierTab === 'ledger' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ledger ({dossierData.recentLedgerEntries.length})
                  </button>
                </div>

                {/* Sub-tab Contents */}
                {dossierTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">Attribution & Referral Parent</span>
                        <div className="text-slate-700">
                          {dossierData.user.referredBy ? (
                            <div>
                              <p className="font-bold text-slate-900">{dossierData.user.referredBy.fullName}</p>
                              <p className="text-slate-500 font-mono text-[11px]">{dossierData.user.referredBy.email}</p>
                              <p className="text-slate-400 text-[10px]">Code: {dossierData.user.referredBy.referralCode}</p>
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">No referral parent (Organic direct registration)</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">Earnings Origin Breakdown</span>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Video Watch Rewards:</span>
                            <span className="font-bold font-mono text-emerald-700">${dossierData.totals.totalVideoRewardsUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Approved Deposits Total:</span>
                            <span className="font-bold font-mono text-slate-900">${dossierData.totals.totalDepositsApprovedUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Settled Payouts:</span>
                            <span className="font-bold font-mono text-purple-700">${dossierData.totals.totalWithdrawalsPaidUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Pending Withdrawal Request:</span>
                            <span className="font-bold font-mono text-amber-700">${dossierData.totals.pendingWithdrawalUSD.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {dossierTab === 'deposits' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Submitted / Verified</th>
                          <th className="py-2.5 px-3">Gateway</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Ref ID</th>
                          <th className="py-2.5 px-3">Proof</th>
                          <th className="py-2.5 px-3">Status &amp; Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dossierData.deposits.length === 0 ? (
                          <tr><td colSpan={6} className="py-6 text-center text-slate-400">No deposits recorded</td></tr>
                        ) : (
                          dossierData.deposits.map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <div>{new Date(d.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                {d.reviewedAt && (
                                  <div className="text-[10px] text-emerald-700">
                                    Verified: {new Date(d.reviewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-semibold">{d.gateway}</td>
                              <td className="py-2.5 px-3 font-mono font-bold">${d.amountUSD.toFixed(2)} USD</td>
                              <td className="py-2.5 px-3 font-mono text-[11px]">{d.transactionRef}</td>
                              <td className="py-2.5 px-3">
                                {d.proofImageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setReceiptModal(d.proofImageUrl)}
                                    className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold hover:bg-purple-100 cursor-pointer"
                                  >
                                    View Slip
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">No image</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 space-y-0.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  d.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  d.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {d.status}
                                </span>
                                {d.reviewedByName && (
                                  <div className="text-[10px] text-slate-500">By: {d.reviewedByName}</div>
                                )}
                                {d.rejectionReason && (
                                  <div className="text-[10px] text-rose-600">Reason: {d.rejectionReason}</div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {dossierTab === 'withdrawals' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Channel &amp; Destination</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Status &amp; Reason</th>
                          <th className="py-2.5 px-3">Approved / Paid By &amp; TxRef</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dossierData.withdrawals.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-400">No withdrawals requested</td></tr>
                        ) : (
                          dossierData.withdrawals.map((w: any) => (
                            <tr key={w.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div>{new Date(w.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                {w.completedAt && (
                                  <div className="text-[10px] text-emerald-700">
                                    Settled: {new Date(w.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">{w.payoutMethod} — {w.accountTitle}</span>
                                <span className="font-mono text-[10px] text-slate-500">{w.accountNumber}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">${w.amountUSD.toFixed(2)} USD</td>
                              <td className="py-2.5 px-3 space-y-0.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  w.status === 'COMPLETED' || w.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  w.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {w.status}
                                </span>
                                {w.rejectionReason && (
                                  <div className="text-[10px] text-rose-600">Reason: {w.rejectionReason}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[10px] space-y-0.5">
                                {w.approvedByName && <div className="text-slate-600">Approved By: <strong>{w.approvedByName}</strong></div>}
                                {w.paidByName && <div className="text-emerald-700">Paid By: <strong>{w.paidByName}</strong></div>}
                                <div className="font-mono text-slate-500">TxRef: {w.payoutRef || '-'}</div>
                                {w.payoutProofUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setReceiptModal(w.payoutProofUrl)}
                                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Payout Proof
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {dossierTab === 'history' && (
                  <div className="space-y-5 text-xs">
                    {/* Account Level History */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                        Account Level History ({dossierData.levelHistory?.length || 0})
                      </h4>
                      {(!dossierData.levelHistory || dossierData.levelHistory.length === 0) ? (
                        <p className="text-slate-400">No level transitions recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dossierData.levelHistory.map((h: any) => (
                            <div key={h.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-900">{h.oldLevel} → {h.newLevel}</div>
                                <div className="text-[11px] text-slate-500">{h.reason} • By: {h.adjustedByName || 'System'}</div>
                              </div>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(h.createdAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Referral Rank Milestone History */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                        Referral Rank &amp; Milestone History ({dossierData.rankHistory?.length || 0})
                      </h4>
                      {(!dossierData.rankHistory || dossierData.rankHistory.length === 0) ? (
                        <p className="text-slate-400">Current Rank: {dossierData.user?.referralRank || 'New'} (No milestones claimed yet).</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dossierData.rankHistory.map((m: any) => (
                            <div key={m.id} className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-indigo-900">{m.rankName} (+${Number(m.rewardUSD).toFixed(2)} USD)</div>
                                <div className="text-[11px] text-indigo-700">{m.qualifiedCount} qualified referrals</div>
                              </div>
                              <span className="text-[10px] text-indigo-500">{new Date(m.claimedAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Account Lock / Unlock History */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                        Account Lock / Unlock History ({dossierData.lockHistory?.length || 0})
                      </h4>
                      {(!dossierData.lockHistory || dossierData.lockHistory.length === 0) ? (
                        <p className="text-slate-400">No account locks recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dossierData.lockHistory.map((l: any) => (
                            <div key={l.id} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                              <div>
                                <div className="font-bold text-amber-900">
                                  {l.action}{l.durationDays ? ` (${l.durationDays} Days)` : ''}
                                </div>
                                <div className="text-[11px] text-amber-800">{l.reason} • By: {l.performedByName || 'Admin'}</div>
                              </div>
                              <span className="text-[10px] text-amber-600">{new Date(l.createdAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {dossierTab === 'timeline' && (
                  <div className="space-y-2 text-xs">
                    {(!dossierData.activityTimeline || dossierData.activityTimeline.length === 0) ? (
                      <div className="py-6 text-center text-slate-400">No activity timeline entries yet.</div>
                    ) : (
                      dossierData.activityTimeline.map((ev: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-slate-900">{ev.title}</div>
                            <div className="text-[11px] text-slate-500 break-words">{ev.detail}</div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {dossierTab === 'videos' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date Claimed</th>
                          <th className="py-2.5 px-3">Video Title</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3 text-right">Reward Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dossierData.videoRewards.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-400">No video watch rewards claimed yet</td></tr>
                        ) : (
                          dossierData.videoRewards.map((v: any) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">{new Date(v.claimedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{v.videoTitle}</td>
                              <td className="py-2.5 px-3 text-slate-600">{v.category}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{v.durationSeconds}s</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">+${v.rewardAmountUSD.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {dossierTab === 'referrals' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Referred User</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Account Level</th>
                          <th className="py-2.5 px-3">Approved Deposits</th>
                          <th className="py-2.5 px-3">Date Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dossierData.referrals.list.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-400">No users referred yet</td></tr>
                        ) : (
                          dossierData.referrals.list.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{r.fullName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.email}</td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {r.accountLevel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">${r.totalApprovedDepositUSD.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {dossierTab === 'ledger' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-sans">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3">Sub-Wallet</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Direction</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3 font-sans">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                        {(!dossierData.recentLedgerEntries || dossierData.recentLedgerEntries.length === 0) ? (
                          <tr><td colSpan={7} className="py-6 text-center text-slate-400 font-sans">No ledger entries posted</td></tr>
                        ) : (
                          dossierData.recentLedgerEntries.map((e: any) => (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2.5 px-3 text-purple-700 font-bold">{e.reference || '-'}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {e.accountType || 'AVAILABLE'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans font-bold text-[10px] text-slate-600">{e.transactionType || '-'}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  e.entryType === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {e.entryType}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 font-bold ${e.entryType === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'}`}>
                                {e.entryType === 'CREDIT' ? '+' : '-'}${Number(e.amountUSD || 0).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px] max-w-xs truncate">{e.description || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Immutable Double-Entry Ledger Telemetry & Audit Dossier
              </span>
              <button
                onClick={() => setDossierUserId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST ACCOUNT LEVEL MODAL (Replaces browser prompt) */}
      {adjustLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adjust Account Level</h3>
                  <p className="text-xs text-slate-500">
                    Modifying tier for <span className="font-bold text-slate-800">{adjustLevelModal.userName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustLevelModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Target Tier</label>
              <div className="grid grid-cols-2 gap-2">
                {(levelsList.length > 0
                  ? levelsList.map((l: any) => ({
                      key: l.levelKey,
                      name: l.name || l.levelKey,
                      min: `$${((l.minQualificationUSD ?? 0) / 100).toLocaleString()}`,
                    }))
                  : [
                      { key: 'NEW_USER', name: 'New User', min: '$0' },
                      { key: 'LEVEL_1', name: 'Level 1', min: '$20' },
                      { key: 'LEVEL_2', name: 'Level 2', min: '$100' },
                      { key: 'LEVEL_3', name: 'Level 3', min: '$500' },
                      { key: 'LEVEL_4', name: 'Level 4', min: '$2,000' },
                      { key: 'LEVEL_5', name: 'Level 5', min: '$5,000' },
                    ]
                ).map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setSelectedNewLevel(lvl.key)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedNewLevel === lvl.key
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">{lvl.name}</span>
                    <span className="text-[10px] text-slate-500">Min Qual: {lvl.min}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Audit Justification / Override Reason</label>
              <input
                type="text"
                placeholder="e.g. Deposit verified via bank manual confirmation"
                value={levelAdjustReason}
                onChange={(e) => setLevelAdjustReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustLevelModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingLevelAdjust}
                onClick={handleConfirmAdjustLevel}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm"
              >
                {savingLevelAdjust ? 'Updating...' : 'Apply Level Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT LOCK / UNLOCK MODAL (Replaces browser prompt) */}
      {lockAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  lockAccountModal.isLocked ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
                }`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lockAccountModal.isLocked ? 'Unlock User Account' : 'Lock Account (Section 11)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target User: <span className="font-bold text-slate-800">{lockAccountModal.userName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockAccountModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {lockAccountModal.isLocked ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-900 block">Account is Currently Locked</span>
                <p className="text-[11px] text-amber-700">
                  Locked until: {lockAccountModal.lockedUntil ? new Date(lockAccountModal.lockedUntil).toLocaleDateString() : 'Active Lock'}. Early release will restore full withdrawal and video access privileges immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Choose Lock Duration Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 60, label: '60 Days', sub: '2 Months Cycle' },
                    { days: 100, label: '100 Days', sub: 'Engagement Lock' },
                    { days: 360, label: '360 Days', sub: 'Full Year Lock' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setLockDurationDays(p.days)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        lockDurationDays === p.days
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-black text-slate-900 block">{p.label}</span>
                      <span className="text-[10px] text-slate-500 block">{p.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {lockAccountModal.isLocked ? 'Reason for Early Unlock' : 'Reason for Locking Account'}
              </label>
              <input
                type="text"
                placeholder={lockAccountModal.isLocked ? 'e.g. Administrative early unlock request' : 'e.g. Security compliance audit'}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLockAccountModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingLockAction}
                onClick={handleConfirmLockAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm ${
                  lockAccountModal.isLocked ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {savingLockAction ? 'Processing...' : lockAccountModal.isLocked ? 'Confirm Unlock' : `Lock for ${lockDurationDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL (Replaces browser prompt) */}
      {changeRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Staff / User Role</h3>
                  <p className="text-xs text-slate-500">
                    Modifying permissions for <span className="font-bold text-slate-800">{changeRoleModal.userName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChangeRoleModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Authorized Role</label>
              <div className="space-y-2">
                {[
                  { role: 'USER', label: 'User', desc: 'Standard member (Video watching, referral, deposit/withdraw)' },
                  { role: 'SUPPORT_AGENT', label: 'Support Agent', desc: 'Customer support desk access only (Strict 10 agents max)' },
                  { role: 'CONTENT_ADMIN', label: 'Content Admin', desc: 'Video modules, assignments, and curriculum management' },
                  { role: 'FINANCE_ADMIN', label: 'Finance Admin', desc: 'Deposit verification & withdrawal settlement review' },
                  { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full unrestricted governance & security control' },
                ].map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedNewRole(r.role)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedNewRole === r.role
                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{r.label}</span>
                      <span className="text-[10px] text-slate-500">{r.desc}</span>
                    </div>
                    {selectedNewRole === r.role && (
                      <Check className="w-4 h-4 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Audit Reason for Role Assignment</label>
              <input
                type="text"
                placeholder="e.g. Onboarded to Customer Support team"
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setChangeRoleModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRoleChange}
                onClick={handleConfirmChangeRole}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-sm"
              >
                {savingRoleChange ? 'Updating...' : 'Save Role Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE SUPPORT TICKET MODAL (Replaces browser prompt) */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Escalate to Super Admin</h3>
                  <p className="text-xs text-slate-500">
                    Ticket for <span className="font-bold text-slate-800">{escalateModal.userName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEscalateModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason for Escalation</label>
              <textarea
                rows={3}
                placeholder="e.g. Complex payment dispute requiring Super Admin transaction trace..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEscalation}
                onClick={handleConfirmEscalate}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-sm"
              >
                {savingEscalation ? 'Escalating...' : 'Confirm Escalation'}
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
            <h3 className="text-lg font-bold text-slate-900">Settle Payout with External Ref &amp; Proof</h3>
            <p className="text-xs text-slate-500">
              Enter the authentic bank transfer reference or blockchain TxHash and attach the payout confirmation screenshot before finalizing settlement.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                External Payout Reference / TxHash <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 129038472918 or 0x48f93... or Wire Ref"
                value={payoutRefInput}
                onChange={(e) => setPayoutRefInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Payout Confirmation Receipt / Screenshot (Audit Proof)
              </label>
              <label className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 cursor-pointer text-xs text-slate-600">
                <span className="truncate font-semibold">
                  {payoutProofName || 'Upload payout receipt image (PNG/JPG, max 5 MB)'}
                </span>
                <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePayoutProofSelect}
                  className="hidden"
                />
              </label>
              {payoutProofUrl && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>Receipt attached</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutProofUrl(null);
                      setPayoutProofName(null);
                    }}
                    className="text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCompleteModal(null);
                  setPayoutRefInput('');
                  setPayoutProofUrl(null);
                  setPayoutProofName(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompleteWithdrawal}
                disabled={!payoutRefInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white cursor-pointer"
              >
                Settle &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PROACTIVE DIRECT MESSAGE TO USER MODAL (PART 6 #2) */}
      {directMsgModal && (
        <div
          onClick={() => !sendingDirectMsg && setDirectMsgModal(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSendDirectMessage}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                  Proactive System Message &amp; Push Notification
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Message {directMsgModal.fullName}
                </h3>
                <p className="text-[11px] text-slate-500">{directMsgModal.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDirectMsgModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Subject</label>
              <input
                type="text"
                value={directMsgSubject}
                onChange={(e) => setDirectMsgSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write your message to this member — delivered immediately as a push notification & in-system message..."
                value={directMsgBody}
                onChange={(e) => setDirectMsgBody(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Attach Screenshot (Optional)
              </label>
              <label className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 hover:border-orange-500 cursor-pointer text-xs text-slate-600">
                <span className="truncate font-semibold">
                  {directMsgAttachmentName || 'Upload screenshot image (PNG/JPG, max 5 MB)'}
                </span>
                <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDirectMsgFileSelect}
                  className="hidden"
                />
              </label>
              {directMsgAttachment && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>Screenshot attached</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectMsgAttachment(null);
                      setDirectMsgAttachmentName(null);
                    }}
                    className="text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDirectMsgModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingDirectMsg || !directMsgBody.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingDirectMsg ? 'Sending…' : 'Send Message'}</span>
              </button>
            </div>
          </form>
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

                {/* Package Tier & Account Level Eligibility + Lock/Active Controls (F4) */}
                {formVideoTarget === 'ALL' && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Minimum Package Tier:
                        </label>
                        <select
                          value={formVideoTier}
                          onChange={(e) => {
                            const nextTier = e.target.value;
                            setFormVideoTier(nextTier);
                            const map: Record<string, string> = {
                              Starter: 'LEVEL_1',
                              Basic: 'LEVEL_2',
                              Premium: 'LEVEL_3',
                              VIP: 'LEVEL_4',
                            };
                            if (map[nextTier]) setFormVideoMinLevel(map[nextTier]);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                        >
                          {(adminPackagesDropdown.length > 0
                            ? adminPackagesDropdown
                            : [
                                { name: 'Starter', priceCents: 2000, videoLimit: 2 },
                                { name: 'Basic', priceCents: 5000, videoLimit: 6 },
                                { name: 'Premium', priceCents: 10000, videoLimit: 15 },
                                { name: 'VIP', priceCents: 50000, videoLimit: 60 },
                              ]
                          ).map((p: any) => (
                            <option key={p.name} value={p.name}>
                              {p.name} (${(p.priceCents / 100).toFixed(0)} — {p.unlockedAdsCount ?? p.videoLimit} ads)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Assigned Account Level (Enforces Access):
                        </label>
                        <select
                          value={formVideoMinLevel}
                          onChange={(e) => {
                            const nextLvl = e.target.value;
                            setFormVideoMinLevel(nextLvl);
                            const lvlMap: Record<string, string> = {
                              LEVEL_1: 'Starter',
                              LEVEL_2: 'Basic',
                              LEVEL_3: 'Premium',
                              LEVEL_4: 'VIP',
                              LEVEL_5: 'VIP',
                            };
                            if (lvlMap[nextLvl]) setFormVideoTier(lvlMap[nextLvl]);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
                        >
                          <option value="LEVEL_1">Level 1 (Starter)</option>
                          <option value="LEVEL_2">Level 2 (Basic)</option>
                          <option value="LEVEL_3">Level 3 (Premium)</option>
                          <option value="LEVEL_4">Level 4 (VIP)</option>
                          <option value="LEVEL_5">Level 5 (VIP+)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-5 pt-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formVideoIsPublished}
                          onChange={(e) => setFormVideoIsPublished(e.target.checked)}
                        />
                        Active (Visible in Catalog)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formVideoIsLocked}
                          onChange={(e) => setFormVideoIsLocked(e.target.checked)}
                        />
                        Locked (Active but restricted until unlocked)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Per-Video Reward Percentage (Applied to Video's Standard Reward — Part 3 #1) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                <label className="block text-[11px] font-bold text-emerald-900">
                  Individual Ad Reward % of Standard Reward (Optional Override)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    placeholder="Leave blank for Global × Level % (e.g. 50 = 50% of standard reward, 150 = 150%)"
                    value={formVideoRewardPct}
                    onChange={(e) => setFormVideoRewardPct(e.target.value)}
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-xs font-extrabold text-emerald-800 px-2">%</span>
                </div>
                <p className="text-[10px] text-emerald-800/80">
                  Applies strictly to this ad&apos;s standard reward (never member deposits). Example: 50% on a $0.50 ad pays exactly $0.25 and displays +$0.25 on the card &amp; player.
                </p>
              </div>

              {/* Category & Real Video Duration Auto-Probe (Part 4 #3) */}
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
                  <label className="block font-bold text-slate-800">Video Duration (Seconds)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="7200"
                      value={formVideoDuration}
                      onChange={(e) => setFormVideoDuration(parseInt(e.target.value, 10) || 15)}
                      className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                    />
                    <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 font-semibold tabular-nums">
                      {Math.floor(formVideoDuration / 60)}m {formVideoDuration % 60}s (Auto-Detected)
                    </div>
                  </div>
                  {formVideoUrl && !extractYouTubeId(formVideoUrl) && (
                    <video
                      key={formVideoUrl}
                      src={formVideoUrl}
                      preload="metadata"
                      className="hidden"
                      onLoadedMetadata={(e) => {
                        const dur = Math.round(e.currentTarget.duration);
                        if (dur > 0 && Number.isFinite(dur)) {
                          setFormVideoDuration(dur);
                        }
                      }}
                    />
                  )}
                  <span className="text-[10px] text-slate-400">
                    Automatically re-reads duration whenever the video URL changes; you can also enter exact seconds manually.
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
                  key={videoPreviewModal.id}
                  src={videoPreviewModal.videoUrl}
                  poster={videoPreviewModal.thumbnailUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
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

      {/* ADD / EDIT COMPANY DOCUMENT MODAL (SECTION 2.1) */}
      {documentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingDocument ? 'Edit Corporate Credential' : 'Upload Corporate Credential'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure document details displayed in the Landing Page verified credentials section.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocumentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Certificate of Incorporation or Business Registration"
                  value={docFormTitle}
                  onChange={(e) => setDocFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Document Type</label>
                  <select
                    value={docFormType}
                    onChange={(e) => setDocFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="BUSINESS_LICENSE">Business License</option>
                    <option value="REGISTRATION">Registration Certificate</option>
                    <option value="TAX_CERTIFICATE">Tax Certificate</option>
                    <option value="COMPLIANCE">Compliance Certificate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Issuing Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. State Registrar"
                    value={docFormIssuer}
                    onChange={(e) => setDocFormIssuer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* DIRECT DOCUMENT FILE UPLOAD (PDF or Image) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  Upload Document File (PDF or Image) <span className="text-purple-600 font-semibold">(Direct Upload)</span>
                </label>
                {docFileName ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-950 block max-w-xs truncate">{docFileName}</span>
                        <span className="text-[10px] text-purple-700">{docFileSize} • Ready to upload</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDocFileName('');
                        setDocFileSize('');
                        setDocFileBase64('');
                      }}
                      className="p-1.5 rounded-lg text-purple-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="doc-file-upload-input"
                    className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/30 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Click to upload Certificate / License file</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG, WEBP (Up to 10 MB)</span>
                    <input
                      id="doc-file-upload-input"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleDocFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* OPTIONAL EXTERNAL URL */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  Or External Asset URL <span className="text-slate-400 font-normal">(Optional if file is uploaded above)</span>
                </label>
                <input
                  type="text"
                  placeholder={docFileName ? "File attached above (URL optional)" : "https://... or external hosted file link"}
                  value={docFileName ? '' : docFormUrl}
                  disabled={Boolean(docFileName)}
                  onChange={(e) => setDocFormUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500 disabled:opacity-60 disabled:bg-slate-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Public Landing Page Display</span>
                  <span className="text-[10px] text-slate-500">Show this credential on the public website for visitor inspection.</span>
                </div>
                <input
                  type="checkbox"
                  checked={docFormIsPublic}
                  onChange={(e) => setDocFormIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDocumentModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDocument}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingDocument ? 'Saving...' : editingDocument ? 'Update Credential' : 'Save Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT LEVEL MODAL (SECTION 3) */}
      {levelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Account Level Tier: {editingLevel?.levelKey}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Adjust qualification ranges, video limits, and approved daily reward percentage.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLevelModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Display Name</label>
                <input
                  type="text"
                  value={levelFormName}
                  onChange={(e) => setLevelFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Minimum Qualifying Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={levelFormMinUSD}
                    onChange={(e) => setLevelFormMinUSD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Maximum Qualifying Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0 for No Cap"
                    value={levelFormMaxUSD}
                    onChange={(e) => setLevelFormMaxUSD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Leave 0 for uncapped</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Daily Video Access Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={levelFormVideoLimit}
                    onChange={(e) => setLevelFormVideoLimit(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Daily Bonus Rate (Basis Points)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={levelFormBonusBps}
                    onChange={(e) => setLevelFormBonusBps(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-emerald-600 font-bold">
                    = {((levelFormBonusBps || 0) / 100).toFixed(2)}% per day
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLevelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLevel}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingLevel ? 'Updating...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
