import { ApiResponse } from '../types/index.js';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('vistarax_token');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('vistarax_token', token);
    } else {
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

  // Auth
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

  // Packages
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

  // Videos
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

  async sendVideoHeartbeat(videoId: string, sessionToken: string, watchSeconds: number) {
    return this.request<any>(`/videos/${videoId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ sessionToken, watchSeconds }),
    });
  }

  async claimVideoReward(videoId: string, sessionToken: string) {
    return this.request<any>(`/videos/${videoId}/claim-reward`, {
      method: 'POST',
      body: JSON.stringify({ sessionToken }),
    });
  }

  // Wallet & Ledger
  async getWalletSummary() {
    return this.request<any>('/wallet/summary');
  }

  async getTransactions(page = 1, pageSize = 20) {
    return this.request<{ entries: any[]; total: number; page: number; pageSize: number }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    );
  }

  // Payments / Deposits
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

  // Withdrawals
  async createWithdrawalRequest(data: {
    amountCents: number;
    currency: string;
    payoutMethod: string;
    accountTitle: string;
    accountNumber: string;
  }) {
    return this.request<any>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyWithdrawals() {
    return this.request<any[]>('/withdrawals/my-withdrawals');
  }

  // Referrals
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

  // Admin APIs
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

  async getAdminDeposits(status = 'PENDING') {
    return this.request<any[]>(`/admin/deposits?status=${status}`);
  }

  async reviewDeposit(depositId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    return this.request<any>(`/admin/deposits/${depositId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    });
  }

  async getAdminWithdrawals(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<any[]>(`/admin/withdrawals${qs}`);
  }

  async getUserFinancialDossier(userId: string) {
    return this.request<any>(`/admin/users/${userId}/financial-dossier`);
  }

  async reviewWithdrawal(
    withdrawalId: string,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE',
    payload?: { payoutRef?: string; rejectionReason?: string }
  ) {
    return this.request<any>(`/admin/withdrawals/${withdrawalId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    });
  }

  async updateSystemSetting(key: string, value: string) {
    return this.request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }

  async getSystemSettings() {
    return this.request<any[]>('/admin/settings');
  }

  async getAdminPaymentMethods() {
    return this.request<any[]>('/admin/payment-methods');
  }

  async updateAdminPaymentMethod(id: string, data: any) {
    return this.request<any>(`/admin/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // -----------------------------------------------------------
  // LIVE CHAT & CUSTOMER SUPPORT
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // ADMIN VIDEO CATALOG & USER ASSIGNMENTS
  // -----------------------------------------------------------
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
    assignedUserId?: string | null;
    isPublished?: boolean;
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

  // -----------------------------------------------------------
  // COMPANY DOCUMENTS (SECTION 2.1)
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // ACCOUNT LEVELS & USER LOCKS (SECTION 3 & 11)
  // -----------------------------------------------------------
  async getAccountLevels() {
    return this.request<any[]>('/admin/levels');
  }

  async updateAccountLevel(levelKey: string, data: any) {
    return this.request<any>(`/admin/levels/${levelKey}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

  async updateAgentAvailability(status: 'ONLINE' | 'BUSY' | 'OFFLINE') {
    return this.request<any>('/admin/support/agent-status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async triggerDailyBonusBatch() {
    return this.request<any>('/admin/bonuses/daily-batch', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
export default api;

