import { ApiResponse } from '../types/index.js';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('uads_token') || localStorage.getItem('vistarax_token');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('uads_token', token);
      localStorage.removeItem('vistarax_token'); // remove legacy key
    } else {
      localStorage.removeItem('uads_token');
      localStorage.removeItem('vistarax_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const text = await response.text();
      let data: any = {};
      if (text && text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: `HTTP_${response.status}`,
            message: data.message || `Request failed with status ${response.status}`,
          },
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Network request failed. Please check connection.',
        },
      };
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  async login(credentials: { email: string; password: string }) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: { email: string; password: string; fullName: string; phone?: string; referralCode?: string }) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async updateProfile(data: { fullName?: string; phone?: string }) {
    return this.request<{ user: any }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string) {
    return this.request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { email: string; token: string; newPassword: string }) {
    return this.request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Packages ────────────────────────────────────────────────────────────
  async getPackages() {
    return this.request<any[]>('/packages');
  }

  async purchasePackage(packageId: string, currency: string = 'USD') {
    return this.request<any>('/packages/purchase', {
      method: 'POST',
      body: JSON.stringify({ packageId, currency }),
    });
  }

  async getMyPurchases() {
    return this.request<any[]>('/packages/my-purchases');
  }

  async getMyActivePackage() {
    return this.request<any>('/packages/active');
  }

  // ─── Videos ──────────────────────────────────────────────────────────────
  async getVideos(params?: { category?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/videos${queryString}`);
  }

  async getVideo(id: string) {
    return this.request<any>(`/videos/${id}`);
  }

  async startVideoSession(videoId: string) {
    return this.request<{ sessionToken: string }>(`/videos/${videoId}/session`, {
      method: 'POST',
    });
  }

  async sendVideoHeartbeat(
    videoId: string,
    sessionToken: string,
    watchSeconds: number,
    actualDurationSeconds?: number
  ) {
    return this.request<any>(`/videos/${videoId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ sessionToken, watchSeconds, actualDurationSeconds }),
    });
  }

  async claimVideoReward(videoId: string, sessionToken: string) {
    return this.request<any>(`/videos/${videoId}/claim-reward`, {
      method: 'POST',
      body: JSON.stringify({ sessionToken }),
    });
  }

  async getDailyVideoStatus() {
    return this.request<any>('/videos/daily-status');
  }

  async claimDailyVideoReward() {
    return this.request<any>('/videos/daily-claim', {
      method: 'POST',
    });
  }

  // ─── Wallet & Ledger ─────────────────────────────────────────────────────
  async getWalletSummary() {
    return this.request<any>('/wallet/summary');
  }

  async getTransactions(page = 1, pageSize = 20) {
    return this.request<{ entries: any[]; total: number; page: number; pageSize: number }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    );
  }

  async transferVideoRewardsToMain(amountCents: number) {
    return this.request<any>('/wallet/transfer-video-rewards', {
      method: 'POST',
      body: JSON.stringify({ amountCents }),
    });
  }

  // ─── Payments / Deposits ─────────────────────────────────────────────────
  async getPaymentMethods() {
    return this.request<any[]>('/payments/methods');
  }

  async createDepositRequest(data: {
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    transactionRef: string;
    senderPhone?: string;
    senderName?: string;
    proofImageUrl?: string;
  }) {
    return this.request<any>('/payments/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyDeposits() {
    return this.request<any[]>('/payments/my-deposits');
  }

  // ─── Withdrawals ─────────────────────────────────────────────────────────
  async createWithdrawalRequest(data: {
    amountCents: number;
    currency: string;
    payoutMethod: string;
    accountTitle: string;
    accountNumber: string;
    sourceWallet?: string;
  }) {
    return this.request<any>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyWithdrawals() {
    return this.request<any[]>('/withdrawals/my-withdrawals');
  }

  // ─── Referrals ───────────────────────────────────────────────────────────
  async getReferralSummary() {
    return this.request<any>('/referrals/summary');
  }

  async getReferralRankProgress() {
    return this.request<any>('/referrals/rank-progress');
  }

  async transferReferralToMainBalance(amountCents: number) {
    return this.request<any>('/referrals/transfer-to-account', {
      method: 'POST',
      body: JSON.stringify({ amountCents }),
    });
  }

  // ─── Notifications ───────────────────────────────────────────────────────
  async getNotifications(page = 1, pageSize = 20) {
    return this.request<any>(`/notifications?page=${page}&pageSize=${pageSize}`);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'POST' });
  }

  // ─── Landing Content (public) ─────────────────────────────────────────────
  async getLandingContent() {
    return this.request<any>('/landing-content');
  }

  // ─── Admin – KPIs & Users ────────────────────────────────────────────────
  async getAdminKpis() {
    return this.request<any>('/admin/kpis');
  }

  async getAdminUsers(params?: { search?: string; role?: string; status?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ users: any[]; total: number }>(`/admin/users${qs}`);
  }

  async updateUserStatus(userId: string, status: string, reason: string) {
    return this.request<any>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async getUserFinancialDossier(userId: string) {
    return this.request<any>(`/admin/users/${userId}/financial-dossier`);
  }

  async getAdminIpGroups() {
    return this.request<any[]>('/admin/users/ip-groups');
  }

  async adminAssignSupportConversation(conversationId: string, agentId: string) {
    return this.request<any>(`/admin/support/conversations/${conversationId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ agentId }),
    });
  }

  async manualAdjustUserLevel(userId: string, newLevel: string, reason: string) {
    return this.request<any>(`/admin/users/${userId}/level`, {
      method: 'POST',
      body: JSON.stringify({ newLevel, reason }),
    });
  }

  async lockUserAccount(userId: string, durationDays: number, reason: string) {
    return this.request<any>(`/admin/users/${userId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ durationDays, reason }),
    });
  }

  async unlockUserAccount(userId: string, reason: string) {
    return this.request<any>(`/admin/users/${userId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateUserRole(userId: string, role: string, reason?: string) {
    return this.request<any>(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role, reason }),
    });
  }

  // ─── Admin – Deposits ────────────────────────────────────────────────────
  async getAdminDeposits(status = 'PENDING') {
    return this.request<any[]>(`/admin/deposits?status=${status}`);
  }

  async reviewDeposit(depositId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    return this.request<any>(`/admin/deposits/${depositId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    });
  }

  // ─── Admin – Withdrawals ─────────────────────────────────────────────────
  async getAdminWithdrawals(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<any[]>(`/admin/withdrawals${qs}`);
  }

  async reviewWithdrawal(
    withdrawalId: string,
    action: 'UNDER_REVIEW' | 'APPROVE' | 'PROCESSING' | 'PAID' | 'COMPLETE' | 'REJECT' | 'FAILED',
    payload?: { payoutRef?: string; payoutProofUrl?: string; rejectionReason?: string }
  ) {
    return this.request<any>(`/admin/withdrawals/${withdrawalId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    });
  }

  // ─── Admin – Wallet Adjust ───────────────────────────────────────────────
  async adminAdjustWallet(data: {
    userId: string;
    walletCategory: 'USER_AVAILABLE' | 'USER_REFERRAL' | 'USER_VIDEO_REWARDS' | 'USER_OTHER_REWARDS';
    direction: 'CREDIT' | 'DEBIT';
    amountCents: number;
    reason: string;
  }) {
    return this.request<any>('/admin/wallets/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Payment Channels ────────────────────────────────────────────
  async getAdminPaymentMethods() {
    return this.request<any[]>('/admin/payment-methods');
  }

  async createAdminPaymentMethod(data: any) {
    return this.request<any>('/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminPaymentMethod(id: string, data: any) {
    return this.request<any>(`/admin/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminPaymentMethod(id: string) {
    return this.request<any>(`/admin/payment-methods/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Admin – Packages ────────────────────────────────────────────────────
  async adminGetPackages() {
    return this.request<any[]>('/admin/packages');
  }

  async adminCreatePackage(data: any) {
    return this.request<any>('/admin/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdatePackage(id: string, data: any) {
    return this.request<any>(`/admin/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeletePackage(id: string) {
    return this.request<any>(`/admin/packages/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Admin – Account Levels ──────────────────────────────────────────────
  async getAccountLevels() {
    return this.request<any[]>('/admin/levels');
  }

  async updateAccountLevel(levelKey: string, data: any) {
    return this.request<any>(`/admin/levels/${levelKey}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Settings (System) ───────────────────────────────────────────
  async getSystemSettings() {
    return this.request<any[]>('/admin/settings');
  }

  async updateSystemSetting(key: string, value: string) {
    return this.request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }

  // ─── Admin – Referral Config ─────────────────────────────────────────────
  async getReferralConfig() {
    return this.request<any>('/admin/referral-config');
  }

  async updateReferralConfig(data: any) {
    return this.request<any>('/admin/referral-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Bonus Settings ──────────────────────────────────────────────
  async getBonusSettings() {
    return this.request<any>('/admin/bonus-settings');
  }

  async updateBonusSettings(data: any) {
    return this.request<any>('/admin/bonus-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Notification Settings ──────────────────────────────────────
  async getNotificationSettings() {
    return this.request<any>('/admin/notification-settings');
  }

  async updateNotificationSettings(data: any) {
    return this.request<any>('/admin/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Landing CMS ─────────────────────────────────────────────────
  async adminGetLandingContent() {
    return this.request<any>('/admin/landing-content');
  }

  async adminUpdateLandingContent(data: any) {
    return this.request<any>('/admin/landing-content', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Admin – Reports & Audit Logs ────────────────────────────────────────
  async getAdminReports(from?: string, to?: string) {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/admin/reports${qs}`);
  }

  async getAuditLogs(params?: { page?: number; pageSize?: number; action?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.action) query.append('action', params.action);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/admin/audit-logs${qs}`);
  }

  // ─── Admin – Support ─────────────────────────────────────────────────────
  async getAdminSupportConversations(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/admin/support/conversations${qs}`);
  }

  async getAdminSupportConversation(id: string) {
    return this.request<any>(`/admin/support/conversations/${id}`);
  }

  async adminReplySupport(
    conversationId: string,
    data: { message: string; attachmentUrl?: string; attachmentName?: string }
  ) {
    return this.request<any>(`/admin/support/conversations/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateSupportStatus(conversationId: string, status: string, assignedToId?: string) {
    return this.request<any>(`/admin/support/conversations/${conversationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assignedToId }),
    });
  }

  async adminEscalateSupportToSuperAdmin(conversationId: string, reason: string) {
    return this.request<any>(`/admin/support/conversations/${conversationId}/escalate-to-admin`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getSupportAgents() {
    return this.request<any[]>('/admin/support/agents');
  }

  async createSupportAgent(data: { email: string; fullName: string; password: string }) {
    return this.request<any>('/admin/support/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSupportAgent(id: string) {
    return this.request<any>(`/admin/support/agents/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleSupportAgentStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.request<any>(`/admin/support/agents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getDailyBonusBatches() {
    return this.request<any>('/admin/bonuses/batches');
  }

  async updateAgentAvailability(status: 'ONLINE' | 'BUSY' | 'OFFLINE') {
    return this.request<any>('/admin/support/agent-status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // ─── Admin – Videos ──────────────────────────────────────────────────────
  async adminGetVideos(params?: {
    search?: string;
    category?: string;
    filterType?: string;
    assignedUserId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category && params.category !== 'All') query.append('category', params.category);
    if (params?.filterType && params.filterType !== 'ALL') query.append('filterType', params.filterType);
    if (params?.assignedUserId) query.append('assignedUserId', params.assignedUserId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any[]>(`/admin/videos${qs}`);
  }

  async adminCreateVideo(data: {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    category?: string;
    minPackageTier?: string;
    minAccountLevel?: string;
    assignedUserId?: string | null;
    isPublished?: boolean;
    isLocked?: boolean;
    rewardEligible?: boolean;
    rewardAmountCents?: number;
  }) {
    return this.request<any>('/admin/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateVideo(id: string, data: any) {
    return this.request<any>(`/admin/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteVideo(id: string) {
    return this.request<any>(`/admin/videos/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Company Documents ───────────────────────────────────────────────────
  async getPublicDocuments() {
    return this.request<any[]>('/documents');
  }

  async getAdminDocuments() {
    return this.request<any[]>('/admin/documents');
  }

  async createAdminDocument(data: any) {
    return this.request<any>('/admin/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminDocument(id: string, data: any) {
    return this.request<any>(`/admin/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminDocument(id: string) {
    return this.request<any>(`/admin/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Support – User-facing ───────────────────────────────────────────────
  async getSupportFaqs() {
    return this.request<any[]>('/support/faqs');
  }

  async getOrCreateSupportConversation(data?: {
    conversationId?: string;
    guestName?: string;
    guestEmail?: string;
  }) {
    return this.request<any>('/support/conversations', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getSupportConversation(id: string) {
    return this.request<any>(`/support/conversations/${id}`);
  }

  async sendSupportMessage(
    conversationId: string,
    data: { message: string; attachmentUrl?: string; attachmentName?: string }
  ) {
    return this.request<any>(`/support/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async escalateSupportConversation(conversationId: string) {
    return this.request<any>(`/support/conversations/${conversationId}/escalate`, {
      method: 'POST',
    });
  }

  // ─── Misc ────────────────────────────────────────────────────────────────
  async triggerDailyBonusBatch() {
    return this.request<any>('/admin/bonuses/daily-batch', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
export default api;
