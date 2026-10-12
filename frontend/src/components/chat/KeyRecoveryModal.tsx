import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Lock, ShieldCheck, KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface KeyRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const KeyRecoveryModal: React.FC<KeyRecoveryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { restoreKeysWithCredential, backupKeysWithCredential } = useAuthStore();
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'restore' | 'backup'>('restore');

  if (!isOpen) return null;

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'restore') {
        const ok = await restoreKeysWithCredential(passphrase);
        if (ok) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1200);
        } else {
          setError('Could not decrypt key backup with this password. Please check your credentials.');
        }
      } else {
        const ok = await backupKeysWithCredential(passphrase);
        if (ok) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setError('Failed to create key backup. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#1A0B15] rounded-3xl p-6 shadow-2xl border border-pink-100 dark:border-pink-900/40 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              {mode === 'restore' ? 'Restore Encrypted Chat Keys' : 'Backup Encrypted Keys'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Zero-Knowledge End-to-End Encryption
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {mode === 'restore'
            ? 'Because Dandiya +1 uses genuine end-to-end encryption, private keys never leave your devices in plaintext. Enter the password you used on your other device to decrypt previous messages.'
            : 'Store an opaque client-encrypted copy of your identity key. Only your password can unlock it; the server never has your decryption key.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {mode === 'restore'
                ? 'Keys restored! Re-decrypting conversation...'
                : 'Backup created successfully!'}
            </span>
          </div>
        )}

        <form onSubmit={handleAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Account Password or Passphrase
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !passphrase.trim()}
              className="flex-1 py-2.5 px-4 rounded-2xl btn-festive-primary text-white text-xs font-semibold disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'restore' ? 'Unlock & Restore Keys' : 'Create Encrypted Backup'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AES-256-GCM + PBKDF2</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'restore' ? 'backup' : 'restore');
              setError(null);
            }}
            className="text-[#8B0036] dark:text-pink-400 font-semibold hover:underline"
          >
            {mode === 'restore' ? 'Need to create a backup?' : 'Restore existing backup?'}
          </button>
        </div>
      </div>
    </div>
  );
};
