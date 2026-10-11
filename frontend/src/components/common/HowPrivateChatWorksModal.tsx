import React from 'react';
import { ShieldCheck, Key, Lock, Server, X } from 'lucide-react';

interface HowPrivateChatWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowPrivateChatWorksModal: React.FC<HowPrivateChatWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-pink-100 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-maroon">
            <Lock className="w-6 h-6 text-[#8B0036]" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif text-gray-900">How Private Chat Works</h3>
            <p className="text-xs text-[#D81B60] font-medium">Genuine browser-level End-to-End Encryption</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-600 mt-4 leading-relaxed">
          <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <Key className="w-5 h-5 text-[#8B0036] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">1. Keys Generated in Your Browser</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your device generates an Elliptic Curve key pair (NIST P-256) via the native Web Crypto API. Your private key never leaves this browser.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <ShieldCheck className="w-5 h-5 text-[#D81B60] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">2. Mutual Shared Secret Derivation</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Using ECDH (Elliptic-Curve Diffie-Hellman) and HKDF-SHA256, both matched users derive a symmetric AES-256-GCM session key independently.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <Server className="w-5 h-5 text-[#9333EA] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">3. Zero Server Plaintext</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Before any message is sent over the network, it is encrypted on your device. The Go server only routes opaque ciphertext and unique IVs. The server cannot read your chat under any circumstances.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-pink-50/70 border border-pink-100 text-xs text-[#8B0036]">
          <strong>Notice:</strong> We do not make unverifiable marketing claims like &quot;military-grade&quot;. We implement standard cryptographic primitives (ECDH, HKDF, AES-GCM) reviewed by open web standards.
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl btn-festive-primary text-white font-medium text-sm transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
