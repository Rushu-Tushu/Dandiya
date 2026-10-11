import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api, getAssetUrl } from '../lib/api';
import { wsClient } from '../lib/socket';
import { E2EEService } from '../lib/crypto/e2ee';
import { Conversation, MessageEnvelope, Profile } from '../types';
import { BlockModal } from '../components/common/BlockModal';
import { ReportModal } from '../components/common/ReportModal';
import {
  Lock,
  Send,
  MoreVertical,
  Flame,
  MapPin,
  ShieldCheck,
  Check,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { id: routeConvId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, profile: currentProfile } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [partnerPubKey, setPartnerPubKey] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageEnvelope[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);

  // Modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations list
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await api.getConversations();
        setConversations(res.conversations);
        if (!routeConvId && res.conversations.length > 0) {
          navigate(`/chat/${res.conversations[0].id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };
    loadConversations();
  }, [routeConvId, navigate]);

  // 2. Connect WebSocket
  useEffect(() => {
    const token = localStorage.getItem('dandiya_auth_token');
    if (token) {
      wsClient.connect(token);
    }
  }, []);

  // 3. Load active conversation details & messages
  const loadConversationData = useCallback(async (convId: string) => {
    if (!user) return;
    setLoadingConv(true);
    try {
      const convData = await api.getConversationById(convId);
      setActiveConv(convData.conversation);
      setOtherProfile(convData.otherProfile);

      // Fetch partner's public key bundle for E2EE
      const otherUserId = convData.conversation.participantIds.find((id) => id !== user.id);
      if (otherUserId) {
        try {
          const bundle = await api.getKeyBundle(otherUserId);
          setPartnerPubKey(bundle.identityPublicKey);
        } catch (bundleErr) {
          console.warn('Could not fetch partner key bundle:', bundleErr);
        }
      }

      // Fetch message history and decrypt client-side
      const msgRes = await api.getMessages(convId, 50, 0);

      // Decrypt all envelopes locally
      const decryptedList: MessageEnvelope[] = [];
      for (const msg of msgRes.messages) {
        let text = '[Encrypted message]';
        try {
          // If I was the sender, decrypt using partner's pubkey; if I'm recipient, decrypt using sender's pubkey
          const senderPub = msg.senderId === user.id ? partnerPubKey : msg.ephemeralPubKey;
          if (senderPub) {
            text = await E2EEService.decrypt(
              msg.ciphertext,
              msg.iv,
              user.id,
              senderPub,
              convId
            );
          }
        } catch {
          text = '🔒 [Unable to decrypt message]';
        }
        decryptedList.push({ ...msg, decryptedText: text });
      }

      setMessages(decryptedList);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingConv(false);
    }
  }, [user, partnerPubKey]);

  useEffect(() => {
    if (routeConvId) {
      loadConversationData(routeConvId);
    }
  }, [routeConvId, loadConversationData]);

  // 4. WebSocket Event Handler
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(async (event) => {
      if (!user || !activeConv || event.conversationId !== activeConv.id) return;

      if (event.type === 'message' && event.messageEnvelope) {
        const env = event.messageEnvelope;
        // Decrypt client-side
        let decrypted = '[Encrypted message]';
        try {
          const pub = env.senderId === user.id ? partnerPubKey : env.ephemeralPubKey;
          if (pub) {
            decrypted = await E2EEService.decrypt(env.ciphertext, env.iv, user.id, pub, activeConv.id);
          }
        } catch {
          decrypted = '🔒 [Decryption failed]';
        }

        setMessages((prev) => [...prev, { ...env, decryptedText: decrypted }]);
        setTimeout(scrollToBottom, 50);
      } else if (event.type === 'typing_start') {
        if (event.senderId !== user.id) setPartnerIsTyping(true);
      } else if (event.type === 'typing_stop') {
        if (event.senderId !== user.id) setPartnerIsTyping(false);
      } else if (event.type === 'presence') {
        if (event.senderId !== user.id && event.payload) {
          setPartnerOnline(event.payload.online);
        }
      }
    });

    return () => unsubscribe();
  }, [user, activeConv, partnerPubKey]);

  // 5. Typing Indicator throttle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConv) return;

    if (!isTyping) {
      setIsTyping(true);
      wsClient.sendTyping(activeConv.id, true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConv) wsClient.sendTyping(activeConv.id, false);
    }, 2000);
  };

  // 6. Send E2EE Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeConv || !partnerPubKey || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // 1. Perform client-side authenticated encryption (AES-GCM-256)
      const encrypted = await E2EEService.encrypt(
        textToSend,
        user.id,
        partnerPubKey,
        activeConv.id
      );

      // Optimistic message bubble for immediate visual feedback
      const optimisticMsg: MessageEnvelope = {
        id: 'opt-' + Date.now(),
        conversationId: activeConv.id,
        senderId: user.id,
        recipientId: otherProfile?.userId || '',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        ephemeralPubKey: encrypted.ephemeralPubKey,
        createdAt: new Date().toISOString(),
        decryptedText: textToSend,
        isOptimistic: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(scrollToBottom, 50);

      // 2. Dispatch via WebSocket or HTTP fallback
      wsClient.send({
        type: 'message',
        conversationId: activeConv.id,
        messageEnvelope: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          ephemeralPubKey: encrypted.ephemeralPubKey,
        },
      });

      // Also persist to API for resilience
      await api.sendMessageEnvelope(activeConv.id, {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        ephemeralPubKey: encrypted.ephemeralPubKey,
      });

      if (isTyping) {
        setIsTyping(false);
        wsClient.sendTyping(activeConv.id, false);
      }
    } catch (err: any) {
      alert('Encryption or sending failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 h-[calc(100vh-5rem)]">
      <div className="h-full bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-pink-100/80 overflow-hidden flex flex-col md:flex-row">
        {/* Left Sidebar: Conversations List */}
        <div
          className={`w-full md:w-80 border-r border-gray-100 flex flex-col bg-white/60 ${
            routeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold font-serif text-gray-900">Chats</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-50 text-[#8B0036] font-semibold">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No active conversations yet. Match with a dancer to start private chatting!
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === routeConvId;
                const p = c.otherProfile;
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/chat/${c.id}`)}
                    className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                      isActive ? 'bg-pink-50/80' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={
                          getAssetUrl(p?.photoUrl) ||
                          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                            p?.firstName || 'User'
                          )}`
                        }
                        alt={p?.firstName}
                        className="w-12 h-12 rounded-full object-cover border border-pink-200"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {p?.firstName || 'Dandiya Partner'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        📍 {p?.city} • {p?.danceLevel}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Chat Pane */}
        {activeConv && otherProfile ? (
          <div
            className={`flex-1 flex flex-col h-full ${
              !routeConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Top Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/chat')}
                  className="md:hidden p-1 text-gray-500 hover:text-gray-900 mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <img
                    src={
                      getAssetUrl(otherProfile.photoUrl) ||
                      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                        otherProfile.firstName
                      )}`
                    }
                    alt={otherProfile.firstName}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-pink-200"
                  />
                  {partnerOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5 font-serif">
                    <span>{otherProfile.firstName}</span>
                    <span className="text-xs font-normal text-gray-500">
                      ({otherProfile.danceLevel})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#D81B60]" />
                      {otherProfile.city}
                    </span>
                    <span>•</span>
                    <span className={partnerOnline ? 'text-emerald-600 font-semibold' : ''}>
                      {partnerOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety & Info Actions */}
              <div className="flex items-center gap-2">
                <div
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl flex items-center gap-1.5 border border-emerald-200"
                  title="End-to-End Encrypted via native Web Crypto"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Encrypted Chat</span>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <div
                      className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30"
                      onMouseLeave={() => setShowMenu(false)}
                    >
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-pink-50"
                      >
                        Report User
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowBlockModal(true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Block User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* E2EE Assurance Ribbon */}
            <div className="bg-emerald-50/70 border-b border-emerald-100/70 px-4 py-2 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Private &amp; Encrypted:</strong> Messages stay exclusively between you and {otherProfile.firstName}. Feel free to chat!
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                100% Confidential
              </span>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#FAF8F9]/50">
              {loadingConv ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Decrypting message envelopes...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-pink-50 flex items-center justify-center text-[#8B0036]">
                    <MessageCircle className="w-6 h-6 text-[#D81B60]" />
                  </div>
                  <h4 className="text-sm font-bold font-serif text-gray-800">
                    No messages yet!
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Say hello to {otherProfile.firstName}! Agree on a venue or time to play Dandiya tonight.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs ${
                          isMe
                            ? 'btn-festive-primary text-white rounded-br-xs'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {msg.decryptedText || '🔒 [Ciphertext payload]'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 px-1">
                        <span>{timeStr}</span>
                        {isMe && <Check className="w-3 h-3 text-[#D81B60]" />}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {partnerIsTyping && (
                <div className="flex items-center gap-2 text-xs text-[#8B0036] italic animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D81B60]" />
                  <span>{otherProfile.firstName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Message ${otherProfile.firstName}... (Encrypted)`}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-3 rounded-2xl btn-festive-primary text-white disabled:opacity-40 transition-transform active:scale-95 shadow-md shrink-0"
                aria-label="Send encrypted message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-gray-500">
            <div className="space-y-2">
              <MessageCircle className="w-12 h-12 mx-auto text-pink-300" />
              <p className="font-serif text-gray-800 text-base font-semibold">
                Select a match to start private chatting
              </p>
              <p className="text-xs text-gray-500">
                All messages are end-to-end encrypted on this browser.
              </p>
            </div>
          </div>
        )}
      </div>


      {otherProfile && (
        <>
          <BlockModal
            isOpen={showBlockModal}
            onClose={() => setShowBlockModal(false)}
            targetUserId={otherProfile.userId}
            targetUserName={otherProfile.firstName}
            onBlocked={() => navigate('/matches')}
          />
          <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            targetUserId={otherProfile.userId}
            targetUserName={otherProfile.firstName}
          />
        </>
      )}
    </div>
  );
};
