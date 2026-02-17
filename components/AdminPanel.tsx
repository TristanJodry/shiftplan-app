import React, { useState } from 'react';
import { User, ShiftTemplate } from '../types';
import { COLORS, getModuleClasses } from '../constants';
import { Trash2, Plus, User as UserIcon, Calendar, X, Pencil, Save, RotateCcw, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { generateId } from '../utils/idUtils';

interface AdminPanelProps {
  users: User[];
  hiddenUserIds: string[]; // List of locally hidden users
  onToggleVisibility: (userId: string) => void; // Function to toggle visibility
  templates: ShiftTemplate[];
  moduleTheme: 'solid' | 'pastel'; // Add theme prop
  onAddUser: (u: User) => void;
  onRemoveUser: (id: string) => void;
  onUpdateUser: (u: User) => void;
  onReorderUser: (id: string, direction: 'up' | 'down') => void;
  onAddTemplate: (t: ShiftTemplate) => void;
  onRemoveTemplate: (id: string) => void;
  onUpdateTemplate: (t: ShiftTemplate) => void;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users, hiddenUserIds, onToggleVisibility, templates, moduleTheme, onAddUser, onRemoveUser, onUpdateUser, onReorderUser, onAddTemplate, onRemoveTemplate, onUpdateTemplate, onClose
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'templates'>('users');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTplLabel, setNewTplLabel] = useState('');
  const [newTplColor, setNewTplColor] = useState(COLORS[0].value);
  const [newTplDesc, setNewTplDesc] = useState('');

  const startEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserRole(user.role);
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserRole('');
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    if (editingUserId) {
        onUpdateUser({
            id: editingUserId,
            name: newUserName,
            role: newUserRole || 'Employé'
        });
        setEditingUserId(null);
    } else {
        onAddUser({
            id: generateId(),
            name: newUserName,
            role: newUserRole || 'Employé'
        });
    }
    setNewUserName('');
    setNewUserRole('');
  };

  const startEditTemplate = (tpl: ShiftTemplate) => {
    setEditingTemplateId(tpl.id);
    setNewTplLabel(tpl.label);
    setNewTplColor(tpl.color);
    setNewTplDesc(tpl.description || '');
  };

  const cancelEditTemplate = () => {
    setEditingTemplateId(null);
    setNewTplLabel('');
    setNewTplColor(COLORS[0].value);
    setNewTplDesc('');
  };

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplLabel.trim()) return;

    if (editingTemplateId) {
        onUpdateTemplate({
            id: editingTemplateId,
            label: newTplLabel,
            code: newTplLabel.substring(0, 3).toUpperCase(),
            color: newTplColor,
            description: newTplDesc
        });
        setEditingTemplateId(null);
    } else {
        onAddTemplate({
            id: generateId(),
            label: newTplLabel,
            code: newTplLabel.substring(0, 3).toUpperCase(),
            color: newTplColor,
            description: newTplDesc
        });
    }
    setNewTplLabel('');
    setNewTplDesc('');
    if (editingTemplateId) {
        setNewTplColor(COLORS[0].value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 transition-colors m-2">
        <div className="p-4 md:p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Administration</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex border-b dark:border-slate-700">
          <button
            onClick={() => { setActiveTab('users'); cancelEditTemplate(); }}
            className={`flex-1 py-3 md:py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <UserIcon className="w-4 h-4" />
            Utilisateurs
          </button>
          <button
            onClick={() => { setActiveTab('templates'); cancelEditUser(); }}
            className={`flex-1 py-3 md:py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'templates' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Calendar className="w-4 h-4" />
            Modèles
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-slate-800">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <form onSubmit={handleUserSubmit} className={`p-4 rounded-lg border space-y-4 transition-colors ${editingUserId ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm uppercase tracking-wide ${editingUserId ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                        {editingUserId ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
                    </h3>
                    {editingUserId && (
                        <button type="button" onClick={cancelEditUser} className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3"/> Annuler
                        </button>
                    )}
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Nom complet"
                    className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Rôle (ex: Manager)"
                    className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className={`text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${editingUserId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {editingUserId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                    {editingUserId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {users.map((user, index) => {
                    const isHidden = hiddenUserIds.includes(user.id);
                    return (
                        <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border dark:border-slate-700 rounded-lg hover:shadow-sm transition-all gap-3 ${editingUserId === user.id ? 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-slate-700/50'} ${isHidden ? 'opacity-60 grayscale' : ''}`}>
                            <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1 mr-1">
                                <button 
                                    onClick={() => onReorderUser(user.id, 'up')}
                                    disabled={index === 0}
                                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${index === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <ArrowUp className="w-3 h-3"/>
                                </button>
                                <button 
                                    onClick={() => onReorderUser(user.id, 'down')}
                                    disabled={index === users.length - 1}
                                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${index === users.length - 1 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <ArrowDown className="w-3 h-3"/>
                                </button>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 font-bold text-xs shrink-0">
                                {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {user.name}
                                    {isHidden && <span className="text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 rounded text-slate-500">Masqué</span>}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{user.role}</div>
                            </div>
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                                <button 
                                    onClick={() => onToggleVisibility(user.id)}
                                    className={`p-2 rounded-full transition-colors mr-2 ${isHidden ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                    title={isHidden ? "Afficher dans mon planning" : "Masquer de mon planning"}
                                >
                                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                <button 
                                onClick={() => startEditUser(user)}
                                className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                title="Modifier"
                                >
                                <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => onRemoveUser(user.id)}
                                className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                title="Supprimer définitivement"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {users.length === 0 && <p className="text-center text-slate-400 py-4">Aucun utilisateur.</p>}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <form onSubmit={handleTemplateSubmit} className={`p-4 rounded-lg border space-y-4 transition-colors ${editingTemplateId ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm uppercase tracking-wide ${editingTemplateId ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                        {editingTemplateId ? 'Modifier le modèle' : 'Créer un modèle'}
                    </h3>
                    {editingTemplateId && (
                        <button type="button" onClick={cancelEditTemplate} className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3"/> Annuler
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="Nom du module (ex: 08h-16h, Télétravail)"
                    className="px-3 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    value={newTplLabel}
                    onChange={(e) => setNewTplLabel(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Description (optionnel)"
                    className="px-3 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    value={newTplDesc}
                    onChange={(e) => setNewTplDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-2 block">Couleur</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewTplColor(c.value)}
                        className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${c.value.split(' ')[0]} ${newTplColor === c.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : ''}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                  {newTplLabel && (
                     <div className="mt-4">
                        <span className="text-xs text-slate-400 block mb-1">Aperçu :</span>
                        {/* Preview uses getModuleClasses with the currently selected color */}
                        <div className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-bold shadow-sm ${getModuleClasses(newTplColor, moduleTheme)}`}>
                           {newTplLabel}
                        </div>
                     </div>
                  )}
                </div>
                <div className="flex justify-end">
                   <button 
                        type="submit" 
                        className={`text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${editingTemplateId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                    {editingTemplateId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                    {editingTemplateId ? 'Enregistrer le modèle' : 'Créer le modèle'}
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(tpl => {
                    const tplClass = getModuleClasses(tpl.color, moduleTheme);
                    return (
                        <div key={tpl.id} className={`flex items-center justify-between p-3 border dark:border-slate-600 rounded-lg hover:shadow-sm transition-all border-l-4 dark:bg-slate-700/30 ${tplClass.replace('bg-', 'border-').split(' ')[0]} ${editingTemplateId === tpl.id ? 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                            <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${tplClass.split(' ')[0]}`}></span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{tpl.label}</span>
                            </div>
                            {tpl.description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tpl.description}</div>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                onClick={() => startEditTemplate(tpl)}
                                className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                title="Modifier"
                                >
                                <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => onRemoveTemplate(tpl.id)}
                                className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};