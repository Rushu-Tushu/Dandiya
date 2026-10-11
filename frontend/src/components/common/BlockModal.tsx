import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { api } from '../../lib/api';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onBlocked?: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  onBlocked,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await api.blockUser(targetUserId);
      if (onBlocked) onBlocked();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Block {targetUserName}?</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {targetUserName} will no longer be able to message you, view your profile, or send you Dandiya requests. Any active match will be severed immediately.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl disabled:opacity-50"
          >
            {isSubmitting ? 'Blocking...' : 'Block User'}
          </button>
        </div>
      </div>
    </div>
  );
};
