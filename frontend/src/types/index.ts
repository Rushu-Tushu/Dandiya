export type DanceLevel = 'Beginner' | 'Intermediate' | 'Pro';
export type LookingFor = 'Partner' | 'Friends' | 'Group';
export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED';
export type MatchStatus = 'ACTIVE' | 'UNMATCHED' | 'BLOCKED';

export interface User {
  id: string;
  email: string;
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

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}
