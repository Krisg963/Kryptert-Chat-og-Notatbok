import React, { useState } from 'react';
import { X, Users, Shield, Plus, Trash2, FolderPlus, Check, FileDown } from 'lucide-react';
import { Folder, FolderCollaborator, PermissionLevel, UserProfile } from '../types';
import { REGISTERED_USERS } from '../utils/storage';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  currentUser: UserProfile;
  onSaveFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onExportFolderPDF?: (folder: Folder) => Promise<void>;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
];

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  currentUser,
  onSaveFolder,
  onDeleteFolder,
  onExportFolderPDF,
}) => {
  const selectedFolder = folders.find((f) => f.id === currentFolderId) || null;
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const [isCreatingNew, setIsCreatingNew] = useState(!selectedFolder);
  const [folderName, setFolderName] = useState(selectedFolder ? selectedFolder.name : '');
  const [folderColor, setFolderColor] = useState(selectedFolder ? selectedFolder.color : FOLDER_COLORS[0]);
  const [collaborators, setCollaborators] = useState<FolderCollaborator[]>(
    selectedFolder ? selectedFolder.collaborators : [
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar,
        permission: 'owner',
      }
    ]
  );
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<PermissionLevel>('edit');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setFolderName('');
    setFolderColor(FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]);
    setCollaborators([
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar,
        permission: 'owner',
      },
    ]);
  };

  const handleAddCollaborator = () => {
    if (!newEmail.trim()) return;

    // Check if already collaborator
    if (collaborators.some((c) => c.userEmail.toLowerCase() === newEmail.trim().toLowerCase())) {
      setErrorMsg('Brukeren er allerede lagt til i denne mappen');
      return;
    }

    // Match with existing registered user or invite as new
    const match = REGISTERED_USERS.find(
      (u) => u.email.toLowerCase() === newEmail.trim().toLowerCase()
    );

    const newCollab: FolderCollaborator = {
      userId: match ? match.id : `usr_${Date.now()}`,
      userName: match ? match.name : newEmail.split('@')[0],
      userEmail: newEmail.trim(),
      userAvatar: match ? match.avatar : '👤',
      permission: newPermission,
    };

    setCollaborators([...collaborators, newCollab]);
    setNewEmail('');
    setErrorMsg('');
  };

  const handleUpdatePermission = (userId: string, permission: PermissionLevel) => {
    setCollaborators(
      collaborators.map((c) => (c.userId === userId ? { ...c, permission } : c))
    );
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (userId === currentUser.id) {
      setErrorMsg('Du kan ikke fjerne deg selv som eier');
      return;
    }
    setCollaborators(collaborators.filter((c) => c.userId !== userId));
  };

  const handleSave = () => {
    if (!folderName.trim()) {
      setErrorMsg('Mappenavnet kan ikke være tomt');
      return;
    }

    const isShared = collaborators.length > 1;
    const folderToSave: Folder = {
      id: isCreatingNew || !selectedFolder ? `folder_${Date.now()}` : selectedFolder.id,
      name: folderName.trim(),
      color: folderColor,
      icon: isShared ? 'users' : 'folder',
      ownerId: selectedFolder ? selectedFolder.ownerId : currentUser.id,
      isShared,
      collaborators,
      createdAt: selectedFolder ? selectedFolder.createdAt : Date.now(),
    };

    onSaveFolder(folderToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: folderColor }}
            />
            <h2 className="text-base font-semibold text-neutral-100">
              {isCreatingNew ? 'Opprett ny mappe' : `Innstillinger: ${folderName || 'Mappe'}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick switcher if editing existing folders */}
          {!isCreatingNew && folders.length > 0 && (
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-medium text-neutral-400">Valgt mappe</span>
              <button
                onClick={handleStartCreate}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Ny mappe
              </button>
            </div>
          )}

          {/* Folder Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Mappenavn
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="F.eks. Felles prosjekt, Idéer..."
              className="w-full px-3.5 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40"
            />
          </div>

          {/* Folder Color */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Fargekode
            </label>
            <div className="flex items-center gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFolderColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    folderColor === c ? 'scale-110 ring-2 ring-white/50' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {folderColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Collaborators & Permissions Section */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Mappe-tilganger og samarbeidspartnere
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                {collaborators.length} {collaborators.length === 1 ? 'bruker' : 'brukere'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Gi andre registrerte brukere tilgang til å bidra eller se notater i denne mappen i sanntid.
            </p>

            {/* Quick add collaborator */}
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2.5">
              <div className="text-xs font-medium text-neutral-300">Legg til samarbeidspartner</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="f.eks. ola.hansen@arbeid.no"
                  className="flex-1 px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value as PermissionLevel)}
                  className="px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-md text-neutral-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="edit">Redigeringstilgang</option>
                  <option value="view">Kun lesetilgang</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCollaborator}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Legg til
                </button>
              </div>

              {/* Quick suggestions from existing registered users */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-neutral-400">
                <span>Forslag:</span>
                {REGISTERED_USERS.filter((u) => !collaborators.some((c) => c.userEmail === u.email)).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setNewEmail(u.email);
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  >
                    {u.name} ({u.role.split('&')[0].trim()})
                  </button>
                ))}
              </div>
            </div>

            {/* List of current collaborators */}
            <div className="divide-y divide-neutral-800/60 max-h-48 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/40">
              {collaborators.map((c) => (
                <div key={c.userId} className="flex items-center justify-between p-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base select-none">{c.userAvatar}</span>
                    <div>
                      <div className="font-medium text-neutral-200 flex items-center gap-1.5">
                        {c.userName}
                        {c.userId === currentUser.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Deg
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400">{c.userEmail}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.permission === 'owner' ? (
                      <span className="text-[11px] text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Eier
                      </span>
                    ) : (
                      <select
                        value={c.permission}
                        onChange={(e) => handleUpdatePermission(c.userId, e.target.value as PermissionLevel)}
                        className="text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="edit">Redigeringstilgang</option>
                        <option value="view">Lesetilgang</option>
                      </select>
                    )}

                    {c.permission !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(c.userId)}
                        className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                        title="Fjern tilgang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            {!isCreatingNew && selectedFolder && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Er du sikker på at du vil slette mappen "${selectedFolder.name}"?`)) {
                      onDeleteFolder(selectedFolder.id);
                      onClose();
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Slett
                </button>

                {onExportFolderPDF && (
                  <button
                    type="button"
                    disabled={isExportingPDF}
                    onClick={async () => {
                      setIsExportingPDF(true);
                      await onExportFolderPDF(selectedFolder);
                      setIsExportingPDF(false);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{isExportingPDF ? 'Eksporterer PDF...' : 'Eksporter mappe til PDF'}</span>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors font-medium"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-semibold shadow-sm"
            >
              {isCreatingNew ? 'Opprett mappe' : 'Lagre endringer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
