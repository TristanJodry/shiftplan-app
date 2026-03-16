import React, { useState, useMemo } from 'react';
import { X, History, User as UserIcon, Clock, Search, Filter, Calendar } from 'lucide-react';
import { Log, User } from '../types';

interface HistoryModalProps {
  logs: Log[];
  users: User[];
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ logs, users, onClose }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesUser = selectedUserId === 'all' || log.userId === selectedUserId;
      const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           log.userName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesUser && matchesSearch;
    });
  }, [logs, selectedUserId, searchQuery]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Historique Complet</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Consultez toutes les modifications apportées au planning</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all group"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Rechercher une action ou un utilisateur..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="all">Tous les utilisateurs</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/30">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Search className="w-10 h-10" />
              </div>
              <p className="text-lg font-medium">Aucun résultat trouvé</p>
              <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{log.userName}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {log.details}
                      </p>
                      {log.action && (
                        <div className="mt-3 flex items-center gap-2">
                           <span className="text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                             {log.action}
                           </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Affichage de {filteredLogs.length} événements sur {logs.length} au total
          </p>
        </div>
      </div>
    </div>
  );
};
