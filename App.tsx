import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './components/CalendarGrid';
import { MonthTable } from './components/MonthTable';
import { AdminPanel } from './components/AdminPanel';
import { DisplaySettings } from './components/DisplaySettings';
import { LoginModal } from './components/LoginModal';
import { NotificationBell } from './components/NotificationBell';
import { HistoryModal } from './components/HistoryModal';
import { usePlanner } from './hooks/usePlanner';
import { Loader2, AlertCircle, Moon, Sun, Layout, LogOut } from 'lucide-react';
import { CurrentUser } from './types';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  
  // Current User State (Authentication)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  
  // Theme State (Dark/Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  // Module Color Theme (Solid vs Pastel)
  const [moduleTheme, setModuleTheme] = useState<'solid' | 'pastel'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moduleTheme') === 'pastel' ? 'pastel' : 'solid';
    }
    return 'solid';
  });

  // Display Preferences State
  const [showWeekends, setShowWeekends] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('showWeekends');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  // Local Hidden Users State (Persisted in LocalStorage)
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hiddenUserIds');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // Local User Order State (Persisted in LocalStorage)
  const [userOrder, setUserOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userOrder');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // Background Opacity for the Planning Grid
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bgOpacity');
      return stored ? parseFloat(stored) : 0.95;
    }
    return 0.95;
  });

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist Local Settings
  useEffect(() => { localStorage.setItem('showWeekends', String(showWeekends)); }, [showWeekends]);
  useEffect(() => { localStorage.setItem('bgOpacity', String(bgOpacity)); }, [bgOpacity]);
  useEffect(() => { localStorage.setItem('hiddenUserIds', JSON.stringify(hiddenUserIds)); }, [hiddenUserIds]);
  useEffect(() => { localStorage.setItem('moduleTheme', moduleTheme); }, [moduleTheme]);
  useEffect(() => { localStorage.setItem('userOrder', JSON.stringify(userOrder)); }, [userOrder]);
  
  // Persist Current User
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleUserVisibility = (userId: string) => {
    setHiddenUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const {
    loading, error,
    users, addUser, removeUser, updateUser,
    templates, addTemplate, removeTemplate, updateTemplate,
    holidays, toggleHoliday, moveAssignment,
    getAssignment, 
    backgroundImage, setBackgroundImage,
    toggleAssignmentTemplate, updateAssignmentText, clearAssignment, replaceAssignment,
    logs
  } = usePlanner(currentUser);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Local Reorder Logic
  const handleLocalReorderUser = (id: string, direction: 'up' | 'down') => {
    let currentOrder = [...userOrder];
    // Ensure all current users are in the order list (init if needed)
    const missing = users.filter(u => !currentOrder.includes(u.id)).map(u => u.id);
    if (missing.length > 0) {
        currentOrder = [...currentOrder, ...missing];
    }

    const index = currentOrder.indexOf(id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;

    // Swap
    [currentOrder[index], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[index]];
    setUserOrder(currentOrder);
  };

  // Sort users based on local preference
  const sortedUsers = React.useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
        let indexA = userOrder.indexOf(a.id);
        let indexB = userOrder.indexOf(b.id);
        
        // If not found in order list, append to end
        if (indexA === -1) indexA = 9999;
        if (indexB === -1) indexB = 9999;
        
        return indexA - indexB;
    });
  }, [users, userOrder]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-medium">Chargement du planning partagé...</p>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 transition-colors duration-200 relative"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {!currentUser && (
        <LoginModal 
          users={users} 
          onLogin={setCurrentUser} 
          onAddUser={addUser} 
        />
      )}
      {/* Note: Overlay div removed to allow transparency control via CalendarGrid */}

      {/* Top Navigation Bar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 border-b dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm z-20 transition-colors backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">ShiftPlan Pro</h1>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewMode('week')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${viewMode === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  SEMAINE
                </button>
                <button 
                  onClick={() => setViewMode('month')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  MOIS
                </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
           <NotificationBell logs={logs} onViewHistory={() => setIsHistoryOpen(true)} />

           <button 
             onClick={() => setIsDisplaySettingsOpen(true)}
             className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
             title="Personnalisation"
           >
             <Layout className="w-5 h-5" />
           </button>

           <button 
             onClick={toggleTheme}
             className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
             title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
           >
             {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>

           <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

           <div className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
              {currentUser ? <span>Connecté: <strong>{currentUser.name}</strong></span> : 'Non connecté'}
           </div>
           
           {currentUser && (
             <button 
               onClick={handleLogout}
               className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
               title="Se déconnecter"
             >
               <LogOut className="w-5 h-5" />
             </button>
           )}

           <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow-sm overflow-hidden hidden md:block">
             <img src={`https://picsum.photos/seed/${currentUser?.name || 'guest'}/100/100`} alt="Avatar" className="w-full h-full object-cover" />
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col z-10 relative">
        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg mb-4 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Attention : {error}. Les modifications ne seront pas sauvegardées sur le serveur.
            </div>
        )}
        
        <div className="flex-1 h-full min-h-0">
          {viewMode === 'week' ? (
            <CalendarGrid 
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                users={sortedUsers}
                hiddenUserIds={hiddenUserIds}
                templates={templates}
                holidays={holidays}
                showWeekends={showWeekends}
                moduleTheme={moduleTheme}
                bgOpacity={bgOpacity}
                theme={theme}
                getAssignment={getAssignment}
                onToggleTemplate={toggleAssignmentTemplate}
                onUpdateText={updateAssignmentText}
                onReplace={replaceAssignment}
                onClear={clearAssignment}
                onMoveAssignment={moveAssignment}
                onToggleHoliday={toggleHoliday}
                onOpenAdmin={() => setIsAdminOpen(true)}
            />
          ) : (
            <MonthTable 
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                users={sortedUsers}
                hiddenUserIds={hiddenUserIds}
                templates={templates}
                holidays={holidays}
                showWeekends={showWeekends}
                moduleTheme={moduleTheme}
                bgOpacity={bgOpacity}
                theme={theme}
                getAssignment={getAssignment}
                onToggleTemplate={toggleAssignmentTemplate}
                onUpdateText={updateAssignmentText}
                onReplace={replaceAssignment}
                onClear={clearAssignment}
                onMoveAssignment={moveAssignment}
                onToggleHoliday={toggleHoliday}
                onOpenAdmin={() => setIsAdminOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Admin Modal */}
      {isAdminOpen && (
        <AdminPanel 
          users={sortedUsers} // Pass sorted users to admin list
          hiddenUserIds={hiddenUserIds} 
          onToggleVisibility={toggleUserVisibility} 
          templates={templates}
          moduleTheme={moduleTheme} 
          onAddUser={addUser}
          onRemoveUser={removeUser}
          onUpdateUser={updateUser}
          onReorderUser={handleLocalReorderUser} // Pass LOCAL reorder function
          onAddTemplate={addTemplate}
          onRemoveTemplate={removeTemplate}
          onUpdateTemplate={updateTemplate}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* Display Settings Modal */}
      {isHistoryOpen && (
        <HistoryModal 
          logs={logs} 
          users={users} 
          onClose={() => setIsHistoryOpen(false)} 
        />
      )}

      {isDisplaySettingsOpen && (
        <DisplaySettings
          showWeekends={showWeekends}
          onToggleWeekends={setShowWeekends}
          moduleTheme={moduleTheme} 
          onSetModuleTheme={setModuleTheme}
          backgroundImage={backgroundImage}
          onSetBackgroundImage={setBackgroundImage}
          bgOpacity={bgOpacity}
          onSetBgOpacity={setBgOpacity}
          onClose={() => setIsDisplaySettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;