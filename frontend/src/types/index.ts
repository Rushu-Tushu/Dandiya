export type DanceLevel = 'Beginner' | 'Intermediate' | 'Pro';
export type LookingFor = 'Partner' | 'Friends' | 'Group';
export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED';
export type MatchStatus = 'ACTIVE' | 'UNMATCHED' | 'BLOCKED';

export interface User {
  id: string;
  email: string;
  role?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string;
  age: number;
  city: string;
  sex: 'F' | 'M' | 'Other';
  danceLevel: DanceLevel;
  lookingFor: LookingFor;
  bio: string;
  photoUrl: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  fromProfile?: Profile;
  toProfile?: Profile;
}

export interface Match {
  id: string;
  participantIds: string[];
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
  otherProfile?: Profile;
  conversationId?: string;
}

export interface Conversation {
  id: string;
  matchId: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  otherProfile?: Profile;
}

export interface MessageEnvelope {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  iv: string;
  ephemeralPubKey: string;
  sequenceNumber?: number;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  // Local client decrypted plaintext for display
  decryptedText?: string;
  isOptimistic?: boolean;
}

export interface KeyBundle {
  id: string;
  userId: string;
  identityPublicKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedKeyBackup {
  id: string;
  userId: string;
  encryptedKeyJWK: string;
  iv: string;
  salt: string;
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// Analytics Types
export interface AnalyticsOverview {
  totalUniqueVisitors: number;
  totalPageViews: number;
  registeredUsers: number;
  completedProfiles: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  returningVisitors: number;
  realMatchesCreated: number;
  realConversations: number;
}

export interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
}

export interface AnalyticsFunnel {
  steps: FunnelStep[];
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
  pageViews: number;
  signups: number;
  activeUsers: number;
}

export interface TrafficItem {
  key: string;
  count: number;
}

export interface AnalyticsTraffic {
  topRoutes: TrafficItem[];
  utmSources: TrafficItem[];
  referrers: TrafficItem[];
}
