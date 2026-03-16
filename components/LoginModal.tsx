import React, { useState } from 'react';
import { User, CurrentUser } from '../types';
import { UserPlus, User as UserIcon, LogIn } from 'lucide-react';
import { generateId } from '../utils/idUtils';

interface LoginModalProps {
  users: User[];
  onLogin: (user: CurrentUser) => void;
  onAddUser: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ users, onLogin, onAddUser }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const handleLogin = () => {
    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        onLogin({ id: user.id, name: user.name });
      }
    }
  };

  const handleCreateAndLogin = () => {
    if (newUserName.trim()) {
      const newUser: User = {
        id: generateId(),
        name: newUserName.trim(),
        role: 'Membre',
        avatar: `https://picsum.photos/seed/${newUserName}/100/100`
      };
      onAddUser(newUser);
      onLogin({ id: newUser.id, name: newUser.name });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Bienvenue sur ShiftPlan</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Veuillez vous identifier pour continuer</p>

          {!isCreating ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Choisir un profil existant</label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Sélectionner un utilisateur...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!selectedUserId}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                Se connecter
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Ou</span>
                </div>
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Créer un nouveau profil
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nom complet</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <button
                onClick={handleCreateAndLogin}
                disabled={!newUserName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                Créer et se connecter
              </button>

              <button
                onClick={() => setIsCreating(false)}
                className="w-full py-3 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              >
                Retour
              </button>
            </div>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <p className="text-xs text-slate-400">ShiftPlan Pro v2.0 - Gestion d'équipe simplifiée</p>
        </div>
      </div>
    </div>
  );
};
