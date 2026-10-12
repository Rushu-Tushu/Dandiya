import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api, getAssetUrl } from '../lib/api';
import { wsClient } from '../lib/socket';
import { E2EEService } from '../lib/crypto/e2ee';
import { Conversation, MessageEnvelope, Profile } from '../types';
import { BlockModal } from '../components/common/BlockModal';
import { ReportModal } from '../components/common/ReportModal';
import { EmojiPicker } from '../components/chat/EmojiPicker';
import { KeyRecoveryModal } from '../components/chat/KeyRecoveryModal';
import {
  Lock,
  Send,
  MoreVertical,
  MapPin,
  ShieldCheck,
  Check,
  CheckCheck,
  ArrowLeft,
  MessageCircle,
  Search,
  Smile,
  Key,
  Info,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { id: routeConvId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [partnerPubKey, setPartnerPubKey] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageEnvelope[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showKeyRecovery, setShowKeyRecovery] = useState(false);
  const [decryptionErrorCount, setDecryptionErrorCount] = useState(0);

  // Modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Fetch conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);

      // Only auto-open first conversation on desktop/tablet, NEVER on mobile
      if (!routeConvId && res.conversations.length > 0 && window.innerWidth >= 768) {
        navigate(`/chat/${res.conversations[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [routeConvId, navigate]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Connect WebSocket
  useEffect(() => {
    const token = localStorage.getItem('dandiya_auth_token');
    if (token) {
      wsClient.connect(token);
    }
  }, []);

  // 3. Load active conversation details & messages (with atomic partner key resolution)
  const loadConversationData = useCallback(async (convId: string) => {
    if (!user) return;
    setLoadingConv(true);
    setDecryptionErrorCount(0);

    try {
      const convData = await api.getConversationById(convId);
      setActiveConv(convData.conversation);
      setOtherProfile(convData.otherProfile);

      // Resolve partner's public key FIRST before decrypting messages
      const otherUserId = convData.conversation.participantIds.find((id) => id !== user.id);
      let resolvedPartnerPub = partnerPubKey;

      if (otherUserId) {
        try {
          const bundle = await api.getKeyBundle(otherUserId);
          resolvedPartnerPub = bundle.identityPublicKey;
          setPartnerPubKey(bundle.identityPublicKey);
        } catch (bundleErr) {
          console.warn('Could not fetch partner key bundle:', bundleErr);
        }
      }

      // Fetch message history
      const msgRes = await api.getMessages(convId, 100, 0);

      // Decrypt all envelopes locally with the resolved public key
      const decryptedList: MessageEnvelope[] = [];
      let decryptErrors = 0;

      for (const msg of msgRes.messages) {
        let text = '[Encrypted message]';
        try {
          const senderPub = msg.senderId === user.id ? resolvedPartnerPub : msg.ephemeralPubKey;
          if (senderPub) {
            text = await E2EEService.decrypt(
              msg.ciphertext,
              msg.iv,
              user.id,
              senderPub,
              convId
            );
            if (text.includes('⚠️')) decryptErrors++;
          } else {
            decryptErrors++;
          }
        } catch {
          text = '🔒 [Encrypted on another device - restore keys to view]';
          decryptErrors++;
        }
        decryptedList.push({ ...msg, decryptedText: text });
      }

      setDecryptionErrorCount(decryptErrors);
      setMessages(decryptedList);
      setTimeout(() => scrollToBottom(false), 50);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingConv(false);
    }
  }, [user, partnerPubKey]);

  useEffect(() => {
    if (routeConvId) {
      loadConversationData(routeConvId);
    } else {
      setActiveConv(null);
      setOtherProfile(null);
      setMessages([]);
    }
  }, [routeConvId, loadConversationData]);

  // 4. WebSocket Event Handler with Stable ID Reconciliation
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

        // Reconcile by ID: If optimistic message exists with this ID, replace it. Otherwise append.
        setMessages((prev) => {
          const existingIdx = prev.findIndex((m) => m.id === env.id);
          if (existingIdx !== -1) {
            // Update in place (optimistic -> confirmed server delivery)
            const updated = [...prev];
            updated[existingIdx] = { ...env, decryptedText: decrypted, isOptimistic: false };
            return updated;
          }
          // Also check for optimistic message that matches same ciphertext to prevent echo duplication
          const optimisticMatchIdx = prev.findIndex(
            (m) => m.isOptimistic && m.ciphertext === env.ciphertext && m.senderId === env.senderId
          );
          if (optimisticMatchIdx !== -1) {
            const updated = [...prev];
            updated[optimisticMatchIdx] = { ...env, decryptedText: decrypted, isOptimistic: false };
            return updated;
          }
          return [...prev, { ...env, decryptedText: decrypted, isOptimistic: false }];
        });

        setTimeout(() => scrollToBottom(true), 50);
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

  // 6. Send E2EE Message with Stable Client ID & Single Idempotent Dispatch
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeConv || !partnerPubKey || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    // Generate stable client message ID
    const clientMsgId = crypto.randomUUID();

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
        id: clientMsgId,
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
      setTimeout(() => scrollToBottom(true), 50);

      // 2. Transport dispatch: Single authoritative transport
      // If WebSocket is open, send via WebSocket with clientMsgId
      if (wsClient.isOpen()) {
        wsClient.send({
          type: 'message',
          conversationId: activeConv.id,
          messageEnvelope: {
            id: clientMsgId,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            ephemeralPubKey: encrypted.ephemeralPubKey,
          },
        });
      } else {
        // Fallback to HTTP API
        const saved = await api.sendMessageEnvelope(activeConv.id, {
          id: clientMsgId,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          ephemeralPubKey: encrypted.ephemeralPubKey,
        });

        // Reconcile optimistic state
        setMessages((prev) =>
          prev.map((m) => (m.id === clientMsgId ? { ...saved, decryptedText: textToSend, isOptimistic: false } : m))
        );
      }

      if (isTyping) {
        setIsTyping(false);
        wsClient.sendTyping(activeConv.id, false);
      }
    } catch (err: any) {
      alert('Encryption or sending failed: ' + err.message);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === clientMsgId ? { ...m, decryptedText: `❌ [Failed to send: ${err.message}]` } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const name = c.otherProfile?.firstName || '';
    const city = c.otherProfile?.city || '';
    return (
      name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      city.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || inputText.length;
      const end = input.selectionEnd || inputText.length;
      const updated = inputText.substring(0, start) + emoji + inputText.substring(end);
      setInputText(updated);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setInputText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 relative z-10 h-[calc(100vh-4.5rem)]">
      <div className="h-full bg-white/95 dark:bg-[#120710]/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-pink-100/90 dark:border-pink-900/30 overflow-hidden flex flex-col md:flex-row transition-colors">
        {/* ============================================================ */}
        {/* Left Sidebar: Conversations List */}
        {/* On mobile: shown ONLY when routeConvId is absent */}
        {/* On desktop: always shown */}
        {/* ============================================================ */}
        <div
          className={`w-full md:w-80 lg:w-88 border-r border-gray-100 dark:border-gray-800/80 flex flex-col bg-white/70 dark:bg-[#150913]/70 ${
            routeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-sans text-gray-900 dark:text-gray-100">
                Festive Chats
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-[#8B0036] dark:text-pink-300 font-semibold">
                {conversations.length}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 space-y-2">
                <MessageCircle className="w-8 h-8 mx-auto text-pink-300 dark:text-pink-800/60" />
                <p>
                  {searchFilter
                    ? 'No matches found.'
                    : 'No active conversations yet. Match with a dancer to start private chatting!'}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === routeConvId;
                const p = c.otherProfile;
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/chat/${c.id}`)}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors ${
                      isActive
                        ? 'bg-pink-50/90 dark:bg-pink-950/40 border-l-4 border-[#D81B60]'
                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          getAssetUrl(p?.photoUrl) ||
                          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                            p?.firstName || 'User'
                          )}`
                        }
                        alt={p?.firstName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-pink-200 dark:border-pink-900/60"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                          {p?.firstName || 'Dandiya Partner'}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        📍 {p?.city} • {p?.danceLevel}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* Main Chat Center Pane */}
        {/* ============================================================ */}
        {activeConv && otherProfile ? (
          <div
            className={`flex-1 flex flex-col h-full bg-white dark:bg-[#120710] ${
              !routeConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Top Chat Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/95 dark:bg-[#160812]/95 backdrop-blur-md">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  onClick={() => navigate('/chat')}
                  className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={
                      getAssetUrl(otherProfile.photoUrl) ||
                      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                        otherProfile.firstName
                      )}`
                    }
                    alt={otherProfile.firstName}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-pink-200 dark:border-pink-900/60"
                  />
                  {partnerOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#160812] rounded-full" />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center gap-1.5 font-serif">
                    <span>{otherProfile.firstName}</span>
                    <span className="text-xs font-normal text-gray-400">
                      ({otherProfile.danceLevel})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#D81B60]" />
                      {otherProfile.city}
                    </span>
                    <span>•</span>
                    <span className={partnerOnline ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                      {partnerOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety & Info Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/40"
                  title="End-to-End Encrypted via native Web Crypto"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Encrypted</span>
                </div>

                <button
                  onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Participant details"
                  aria-label="Toggle participant profile drawer"
                >
                  <Info className="w-4 h-4" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMenu && (
                    <div
                      className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1A0B15] rounded-2xl shadow-xl border border-gray-100 dark:border-pink-900/40 py-1.5 z-40 backdrop-blur-md"
                      onMouseLeave={() => setShowMenu(false)}
                    >
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowKeyRecovery(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 flex items-center gap-2"
                      >
                        <Key className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Sync E2EE Keys</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-950/40"
                      >
                        Report User
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowBlockModal(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Block User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* E2EE Assurance Banner / Recovery Prompt */}
            {decryptionErrorCount > 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Some older messages require your encryption key to decrypt on this device.
                  </span>
                </div>
                <button
                  onClick={() => setShowKeyRecovery(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 transition-colors shrink-0"
                >
                  Sync Keys
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100/70 dark:border-emerald-900/30 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Zero server knowledge: Messages are encrypted client-side with AES-256-GCM.
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  E2EE Active
                </span>
              </div>
            )}

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#FAF8F9]/50 dark:bg-[#0E050C]/50">
              {loadingConv ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-pink-400" />
                  <p>Decrypting message envelopes with native Web Crypto...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/30 flex items-center justify-center text-[#8B0036] dark:text-pink-300">
                    <Sparkles className="w-7 h-7 text-[#D81B60]" />
                  </div>
                  <h4 className="text-base font-semibold font-sans text-gray-800 dark:text-gray-200">
                    Say Hello to {otherProfile.firstName}!
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed font-sans">
                    You both matched for Navratri! Break the ice, compare favorite Garba steps, and coordinate which festival venue to meet at.
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
                        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs break-words ${
                          isMe
                            ? 'btn-festive-primary text-white rounded-br-xs'
                            : 'bg-white dark:bg-[#1A0B15] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-pink-900/30 rounded-bl-xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap select-text">
                          {msg.decryptedText || '🔒 [Ciphertext payload]'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 dark:text-gray-500 px-1">
                        <span>{timeStr}</span>
                        {isMe && (
                          msg.isOptimistic ? (
                            <Check className="w-3 h-3 text-pink-300" />
                          ) : (
                            <CheckCheck className="w-3 h-3 text-[#D81B60] dark:text-pink-400" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {partnerIsTyping && (
                <div className="flex items-center gap-2 text-xs text-[#8B0036] dark:text-pink-300 italic animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D81B60]" />
                  <span>{otherProfile.firstName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Bar */}
            <div className="relative p-3 sm:p-4 bg-white dark:bg-[#160812] border-t border-gray-100 dark:border-gray-800">
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 rounded-2xl text-gray-400 hover:text-pink-600 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors"
                  aria-label="Open emoji picker"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message ${otherProfile.firstName}... (Encrypted)`}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
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
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#120710]">
            <div className="space-y-3 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/30 flex items-center justify-center text-[#D81B60]">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-gray-800 dark:text-gray-200 text-lg font-bold">
                Select a match to start chatting
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                All messages are end-to-end encrypted on this browser. Only you and your dancing partner possess the keys to decrypt.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Right Details Drawer (Collapsible) */}
        {/* ============================================================ */}
        {showDetailsDrawer && otherProfile && (
          <div className="w-72 lg:w-80 border-l border-gray-100 dark:border-gray-800 p-5 bg-white/90 dark:bg-[#160812]/90 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Dancer Details
                </h4>
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-2">
                <img
                  src={
                    getAssetUrl(otherProfile.photoUrl) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      otherProfile.firstName
                    )}`
                  }
                  alt={otherProfile.firstName}
                  className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-pink-200 dark:border-pink-900/60 shadow-md"
                />
                <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 font-sans">
                  {otherProfile.firstName} {otherProfile.lastName || ''}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-sans">
                  {otherProfile.age} yrs • {otherProfile.city}
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Bio</span>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {otherProfile.bio || 'Looking forward to playing Dandiya this season!'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40">
                    <span className="text-[10px] text-gray-400 block">Level</span>
                    <strong className="text-[#8B0036] dark:text-pink-300">{otherProfile.danceLevel}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                    <span className="text-[10px] text-gray-400 block">Looking For</span>
                    <strong className="text-purple-700 dark:text-purple-300">{otherProfile.lookingFor}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowBlockModal(true)}
                className="w-full py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              >
                Block Dancer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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

      <KeyRecoveryModal
        isOpen={showKeyRecovery}
        onClose={() => setShowKeyRecovery(false)}
        onSuccess={() => {
          if (routeConvId) loadConversationData(routeConvId);
        }}
      />
    </div>
  );
};
