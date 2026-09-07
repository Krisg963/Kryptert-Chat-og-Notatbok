import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';
import { REGISTERED_USERS, saveCurrentUser } from '../utils/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  encryptionFingerprint: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  encryptionFingerprint,
}) => {
  const [customName, setCustomName] = useState(currentUser.name);

  if (!isOpen) return null;

  const handleSwitchUser = (user: UserProfile) => {
    saveCurrentUser(user);
    onSelectUser(user);
    onClose();
  };

  const handleUpdateName = () => {
    if (!customName.trim()) return;
    const updated: UserProfile = {
      ...currentUser,
      name: customName.trim(),
    };
    saveCurrentUser(updated);
    onSelectUser(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-neutral-100">Brukerprofil & Samarbeidsidentitet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Current profile info */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl select-none">
              {currentUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full text-sm font-semibold text-neutral-100 bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:outline-none py-0.5"
                placeholder="Ditt navn"
              />
              <div className="text-xs text-neutral-400 truncate">{currentUser.email}</div>
              <div className="text-[11px] text-indigo-400 mt-0.5 font-medium">{currentUser.role}</div>
            </div>
            <button
              onClick={handleUpdateName}
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md transition-colors"
            >
              Oppdater
            </button>
          </div>

          {/* E2EE Key Verification info */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Aktiv Ende-til-ende-kryptering (E2EE)</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Dine meldinger og delte notater sikres med 256-bit AES-GCM direkte i nettleseren.
            </p>
            <div className="pt-1.5 flex items-center gap-2 text-[11px] font-mono text-neutral-400 bg-neutral-950/60 p-2 rounded border border-neutral-800">
              <KeyRound className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">Nøkkelfingeravtrykk: {encryptionFingerprint || 'Genererer...'}</span>
            </div>
          </div>

          {/* Switch registered collaborator */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-neutral-300">
              Bytt aktiv bruker (Test sanntidssamarbeid):
            </div>
            <p className="text-xs text-neutral-400">
              Velg en registrert samarbeidspartner for å teste hvordan mapperettigheter og chat-kryptering oppfører seg mellom ulike bidragsytere:
            </p>
            <div className="space-y-2">
              {REGISTERED_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    currentUser.id === u.id
                      ? 'bg-indigo-600/10 border-indigo-500/50 text-neutral-100'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{u.avatar}</span>
                    <div>
                      <div className="text-xs font-medium text-neutral-200 flex items-center gap-2">
                        {u.name}
                        {currentUser.id === u.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500">{u.email} • {u.role}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors font-medium"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
