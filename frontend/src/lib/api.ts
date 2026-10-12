import {
  User,
  Profile,
  ConnectionRequest,
  Match,
  Conversation,
  MessageEnvelope,
  KeyBundle,
  EncryptedKeyBackup,
  AnalyticsOverview,
  AnalyticsFunnel,
  TimeseriesPoint,
  AnalyticsTraffic,
  DanceLevel,
  LookingFor,
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/$/, '') : '';
const API_BASE = `${RAW_API_URL}/api`;

export function getAssetUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/assets/')) {
    return path;
  }
  if (path.startsWith('/uploads/')) {
    return RAW_API_URL ? `${RAW_API_URL}${path}` : path;
  }
  return path;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('dandiya_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('dandiya_auth_token', token);
  } else {
    localStorage.removeItem('dandiya_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback
    }
    throw new ApiError(res.status, errorMsg);
  }

  return res.json();
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem('dandiya_visitor_id');
    if (!id) {
      id = 'v-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
      localStorage.setItem('dandiya_visitor_id', id);
    }
    return id;
  } catch {
    return 'v-anonymous';
  }
}

export const api = {
  // Auth
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    age: number;
    city: string;
    sex: string;
    danceLevel: DanceLevel;
    lookingFor: LookingFor;
    bio?: string;
    photoUrl?: string;
  }): Promise<{ token: string; user: User; profile: Profile }> {
    const res = await request<{ token: string; user: User; profile: Profile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<{ token: string; user: User; profile: Profile }> {
    const res = await request<{ token: string; user: User; profile: Profile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  async getMe(): Promise<{ user: User; profile: Profile }> {
    return request('/auth/me');
  },

  // Profiles
  async getMyProfile(): Promise<Profile> {
    return request('/profiles/me');
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    return request('/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return request('/profiles/photo', {
      method: 'POST',
      body: formData,
    });
  },

  async getProfileById(userId: string): Promise<Profile> {
    return request(`/profiles/${userId}`);
  },

  // Discovery
  async discover(params: {
    city?: string;
    lookingFor?: string;
    danceLevel?: string;
    minAge?: number;
    maxAge?: number;
  } = {}): Promise<{ profiles: Profile[]; city: string; count: number }> {
    const q = new URLSearchParams();
    if (params.city) q.set('city', params.city);
    if (params.lookingFor) q.set('lookingFor', params.lookingFor);
    if (params.danceLevel) q.set('danceLevel', params.danceLevel);
    if (params.minAge) q.set('minAge', params.minAge.toString());
    if (params.maxAge) q.set('maxAge', params.maxAge.toString());

    return request(`/discover?${q.toString()}`);
  },

  // Requests
  async sendRequest(toUserId: string): Promise<{ message: string; request: ConnectionRequest }> {
    return request('/requests', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    });
  },

  async getIncomingRequests(): Promise<{ requests: ConnectionRequest[] }> {
    return request('/requests/incoming');
  },

  async getOutgoingRequests(): Promise<{ requests: ConnectionRequest[] }> {
    return request('/requests/outgoing');
  },

  async acceptRequest(requestId: string): Promise<{
    message: string;
    matchId: string;
    conversationId: string;
    otherProfile: Profile;
  }> {
    return request(`/requests/${requestId}/accept`, {
      method: 'POST',
    });
  },

  async declineRequest(requestId: string): Promise<{ message: string }> {
    return request(`/requests/${requestId}/decline`, {
      method: 'POST',
    });
  },

  async cancelRequest(requestId: string): Promise<{ message: string }> {
    return request(`/requests/${requestId}`, {
      method: 'DELETE',
    });
  },

  // Matches
  async getMatches(): Promise<{ matches: Match[] }> {
    return request('/matches');
  },

  async getMatchById(matchId: string): Promise<Match> {
    return request(`/matches/${matchId}`);
  },

  async unmatch(matchId: string): Promise<{ message: string }> {
    return request(`/matches/${matchId}/unmatch`, {
      method: 'POST',
    });
  },

  // Conversations & Encrypted Messages
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return request('/conversations');
  },

  async getConversationById(id: string): Promise<{ conversation: Conversation; otherProfile: Profile }> {
    return request(`/conversations/${id}`);
  },

  async getMessages(convId: string, limit = 50, offset = 0): Promise<{ messages: MessageEnvelope[] }> {
    return request(`/conversations/${convId}/messages?limit=${limit}&offset=${offset}`);
  },

  async sendMessageEnvelope(convId: string, envelope: {
    id?: string;
    ciphertext: string;
    iv: string;
    ephemeralPubKey: string;
    sequenceNumber?: number;
  }): Promise<MessageEnvelope> {
    return request(`/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify(envelope),
    });
  },

  // E2EE Crypto Key Bundles & Zero-Knowledge Key Backups
  async publishKeyBundle(identityPublicKey: string): Promise<{ message: string }> {
    return request('/crypto/bundle', {
      method: 'POST',
      body: JSON.stringify({ identityPublicKey }),
    });
  },

  async getKeyBundle(userId: string): Promise<KeyBundle> {
    return request(`/crypto/bundle/${userId}`);
  },

  async saveKeyBackup(data: {
    encryptedKeyJWK: string;
    iv: string;
    salt: string;
    iterations?: number;
  }): Promise<{ message: string }> {
    return request('/crypto/backup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getKeyBackup(): Promise<EncryptedKeyBackup> {
    return request('/crypto/backup');
  },

  // Analytics
  async trackEvent(data: {
    visitorId?: string;
    type?: string;
    eventType?: string;
    path?: string;
    route?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<void> {
    try {
      const payload = {
        visitorId: data.visitorId || getVisitorId(),
        type: data.type || data.eventType || 'page_view',
        path: data.path || data.route || window.location.pathname,
        referrer: data.referrer || (typeof document !== 'undefined' ? document.referrer : undefined),
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
      };
      await request('/analytics/track', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Analytics tracking failures should not disrupt user experience
    }
  },

  // Admin Protected Analytics
  async getAdminAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
    return request(`/admin/analytics/overview?days=${days}`);
  },

  async getAdminAnalyticsFunnel(days = 30): Promise<AnalyticsFunnel> {
    return request(`/admin/analytics/funnel?days=${days}`);
  },

  async getAdminAnalyticsTimeseries(days = 14): Promise<{ points: TimeseriesPoint[] }> {
    return request(`/admin/analytics/timeseries?days=${days}`);
  },

  async getAdminAnalyticsTraffic(days = 30): Promise<AnalyticsTraffic> {
    return request(`/admin/analytics/traffic?days=${days}`);
  },

  // Aliases for convenience
  async getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
    return this.getAdminAnalyticsOverview(days);
  },

  async getAnalyticsFunnel(days = 30): Promise<AnalyticsFunnel> {
    return this.getAdminAnalyticsFunnel(days);
  },

  async getAnalyticsTimeseries(days = 14): Promise<{ points: TimeseriesPoint[] }> {
    return this.getAdminAnalyticsTimeseries(days);
  },

  async getAnalyticsTraffic(days = 30): Promise<AnalyticsTraffic> {
    return this.getAdminAnalyticsTraffic(days);
  },

  // Safety
  async blockUser(targetUserId: string): Promise<{ message: string }> {
    return request('/blocks', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async unblockUser(userId: string): Promise<{ message: string }> {
    return request(`/blocks/${userId}`, {
      method: 'DELETE',
    });
  },

  async getBlockedUsers(): Promise<{ blockedUsers: Profile[] }> {
    return request('/blocks');
  },

  async reportUser(data: { reportedUserId: string; reason: string; details?: string }): Promise<{ message: string }> {
    return request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
