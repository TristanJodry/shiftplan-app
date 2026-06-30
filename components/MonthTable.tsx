import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, ShiftTemplate, Assignment } from '../types';
import { getStartOfMonth, addDays, formatDateISO, getEndOfMonth } from '../utils/dateUtils';
import { getModuleClasses } from '../constants';
import { ChevronLeft, ChevronRight, Settings, Calendar as CalendarIcon, Check, Eraser, Plus, Type, Flag } from 'lucide-react';

interface MonthTableProps {
  currentDate: Date;
  onDateChange: (d: Date) => void;
  users: User[];
  hiddenUserIds: string[];
  templates: ShiftTemplate[];
  holidays: string[];
  showWeekends: boolean;
  moduleTheme: 'solid' | 'pastel';
  bgOpacity: number;
  theme: 'light' | 'dark';
  getAssignment: (userId: string, date: Date) => Assignment | undefined;
  onToggleTemplate: (userId: string, date: Date, templateId: string) => void;
  onUpdateText: (userId: string, date: Date, text: string) => void;
  onReplace: (userId: string, date: Date, templateIds: string[], customText: string) => void;
  onClear: (userId: string, date: Date) => void;
  onMoveAssignment: (fromUserId: string, fromDate: Date, toUserId: string, toDate: Date) => void;
  onToggleHoliday: (date: Date) => void;
  onOpenAdmin: () => void;
}

export const MonthTable: React.FC<MonthTableProps> = ({
  currentDate, onDateChange, users, hiddenUserIds = [], templates, holidays, showWeekends, moduleTheme = 'solid', bgOpacity = 0.95, theme = 'light', getAssignment, onToggleTemplate, onUpdateText, onReplace, onClear, onMoveAssignment, onToggleHoliday, onOpenAdmin
}) => {
  const startOfMonth = getStartOfMonth(currentDate);
  const endOfMonth = getEndOfMonth(currentDate);
  
  // Filter visible users
  const safeHiddenIds = Array.isArray(hiddenUserIds) ? hiddenUserIds : [];
  const visibleUsers = users.filter(user => !safeHiddenIds.includes(user.id));

  // Generate days for the month
  const monthDays = React.useMemo(() => {
    const days = [];
    let d = new Date(startOfMonth);
    while (d <= endOfMonth) {
      if (showWeekends || (d.getDay() !== 0 && d.getDay() !== 6)) {
        days.push(new Date(d));
      }
      d = addDays(d, 1);
    }
    return days;
  }, [startOfMonth, endOfMonth, showWeekends]);

  const todayISO = formatDateISO(new Date());
  const [clipboard, setClipboard] = useState<{templateIds: string[], customText: string} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{userId: string, date: Date} | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{userId: string, dateStr: string} | null>(null);
  
  const [popover, setPopover] = useState<{
    isOpen: boolean;
    userId: string | null;
    date: Date | null;
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ isOpen: false, userId: null, date: null, x: 0, y: 0, width: 288, height: 400 });

  const [localText, setLocalText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (popover.isOpen && popover.userId && popover.date) {
        const assignment = getAssignment(popover.userId, popover.date);
        setLocalText(assignment?.customText || '');
    }
  }, [popover.isOpen, popover.userId, popover.date, getAssignment]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopover(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCellClick = (e: React.MouseEvent, userId: string, date: Date) => {
    setSelectedCell({ userId, date });
    (e.currentTarget as HTMLElement).focus();
  };

  const handleCellDoubleClick = (e: React.MouseEvent | React.KeyboardEvent, userId: string, date: Date) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Popover placement logic
    const popW = 300; 
    const popH = 450;
    let x = rect.left;
    let y = rect.bottom + 5;
    
    if (x + popW > window.innerWidth) x = window.innerWidth - popW - 10;
    if (x < 10) x = 10;
    if (y + popH > window.innerHeight) {
        y = rect.top - popH - 5;
        if (y < 0) y = window.innerHeight - popH - 10;
    }

    setPopover({ isOpen: true, userId, date, x, y, width: popW, height: popH });
  };

  const handleKeyDown = (e: React.KeyboardEvent, userId: string, date: Date) => {
    if (popover.isOpen) return;

    // Copy/Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      const assignment = getAssignment(userId, date);
      if (assignment) {
        setClipboard({ templateIds: assignment.templateIds, customText: assignment.customText || '' });
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      if (clipboard) {
        onReplace(userId, date, clipboard.templateIds, clipboard.customText);
      }
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        handleCellDoubleClick(e, userId, date);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        onClear(userId, date);
    }
  };

  const handleDragStart = (e: React.DragEvent, userId: string, date: Date) => {
    const assignment = getAssignment(userId, date);
    if (!assignment) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ userId, date: date.toISOString() }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, userId: string, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dateStr = formatDateISO(date);
    if (dragOverCell?.userId !== userId || dragOverCell?.dateStr !== dateStr) {
        setDragOverCell({ userId, dateStr });
    }
  };

  const handleDrop = (e: React.DragEvent, targetUserId: string, targetDate: Date) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data && data.userId && data.date) {
            onMoveAssignment(data.userId, new Date(data.date), targetUserId, targetDate);
        }
    } catch (err) { console.error("Drop failed", err); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalText(e.target.value);
      if (popover.userId && popover.date) {
          onUpdateText(popover.userId, popover.date, e.target.value);
      }
  };

  const bgBaseColor = theme === 'dark' ? `30, 41, 59` : `255, 255, 255`; 
  const bgStyle = { backgroundColor: `rgba(${bgBaseColor}, ${bgOpacity})` };
  const headerBaseColor = theme === 'dark' ? `15, 23, 42` : `255, 255, 255`; 
  const headerStyle = { backgroundColor: `rgba(${headerBaseColor}, 1)` }; 
  const stickyColumnStyle = { backgroundColor: `rgba(${bgBaseColor}, 1)` };

  return (
    <div 
      className="flex flex-col h-full shadow-sm border dark:border-slate-700 rounded-xl overflow-hidden transition-colors backdrop-blur-sm"
      style={bgStyle}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b dark:border-slate-700 transition-colors gap-3" style={headerStyle}>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
            <button onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => onDateChange(new Date())} className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all">Aujourd'hui</button>
            <button onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="sm:hidden">{new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(currentDate)}</span>
            <span className="hidden sm:inline">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}</span>
          </h2>
        </div>
        <button onClick={onOpenAdmin} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm">
          <Settings className="w-4 h-4" />
          <span>Gérer l'équipe</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-40 shadow-sm backdrop-blur-md" style={headerStyle}>
            <tr>
              <th className="p-4 text-left border-b border-r dark:border-slate-700 w-48 sticky left-0 z-50 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider" style={headerStyle}>
                Membres
              </th>
              {monthDays.map((date) => {
                const dateISO = formatDateISO(date);
                const isToday = dateISO === todayISO;
                const isHoliday = holidays.includes(dateISO);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <th 
                    key={dateISO} 
                    className={`p-2 text-center border-b border-r dark:border-slate-700 min-w-[40px] relative transition-colors`} 
                    style={isToday ? { backgroundColor: theme === 'dark' ? '#1e3a8a' : '#eff6ff' } : isHoliday ? { backgroundColor: theme === 'dark' ? '#7f1d1d' : '#fef2f2' } : headerStyle}
                  >
                    <div className="flex flex-col items-center justify-center relative z-10 scale-90">
                      <span className={`text-[9px] uppercase font-bold mb-0.5 ${isToday ? 'text-blue-600 dark:text-blue-400' : isHoliday ? 'text-red-600 dark:text-red-400' : isWeekend ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(date)}
                      </span>
                      <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : isHoliday ? 'text-red-600 dark:text-red-400 font-black' : isWeekend ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="p-3 border-b border-r dark:border-slate-700 sticky left-0 z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 border-r-slate-200 dark:border-r-slate-700 transition-colors backdrop-blur-md" style={stickyColumnStyle}>
                  <div className="flex items-center gap-2 max-w-[170px]">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm text-[10px]">{user.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{user.name}</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{user.role}</div>
                    </div>
                  </div>
                </td>
                {monthDays.map((date) => {
                  const dateISO = formatDateISO(date);
                  const assignment = getAssignment(user.id, date);
                  const activeTemplateIds = assignment?.templateIds || [];
                  const hasCustomText = !!assignment?.customText;
                  const isEmpty = activeTemplateIds.length === 0 && !hasCustomText;
                  const isToday = dateISO === todayISO;
                  const isHoliday = holidays.includes(dateISO);
                  const isSelected = selectedCell?.userId === user.id && selectedCell?.date.getTime() === date.getTime();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isDragOver = dragOverCell?.userId === user.id && dragOverCell?.dateStr === dateISO;

                  return (
                    <td 
                      key={dateISO} 
                      draggable={!isEmpty}
                      className={`p-0.5 border-b border-r dark:border-slate-700 cursor-pointer relative transition-all h-12 outline-none ${isToday ? 'bg-blue-50/10 dark:bg-blue-900/10' : ''} ${isHoliday ? 'bg-red-50/30 dark:bg-red-900/10' : isWeekend ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} ${isDragOver ? 'bg-blue-100/50 dark:bg-blue-800/50 scale-[1.02] shadow-inner z-10' : ''}`} 
                      style={(!isToday && !isHoliday && !isWeekend && !isDragOver) ? bgStyle : undefined} 
                      onClick={(e) => handleCellClick(e, user.id, date)} 
                      onDoubleClick={(e) => handleCellDoubleClick(e, user.id, date)} 
                      onKeyDown={(e) => handleKeyDown(e, user.id, date)} 
                      onDragStart={(e) => handleDragStart(e, user.id, date)}
                      onDragOver={(e) => handleDragOver(e, user.id, date)}
                      onDrop={(e) => handleDrop(e, user.id, date)}
                      tabIndex={0}
                    >
                      <div className={`w-full h-full min-h-[2.5rem] rounded transition-all flex flex-col overflow-hidden relative z-10 ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''} ${isEmpty ? '' : 'bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600'}`}>
                        {isEmpty ? (
                          <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <Plus className="w-3 h-3 text-slate-300" />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col w-full h-full">
                            {activeTemplateIds.map(tid => {
                                const tpl = templates.find(t => t.id === tid);
                                if (!tpl) return null;
                                const tplClass = getModuleClasses(tpl.color, moduleTheme);
                                return (
                                  <div 
                                    key={tid} 
                                    className={`flex-1 flex items-center justify-center text-[8px] font-black ${tplClass} w-full border-b border-black/5 last:border-0`} 
                                    title={tpl.label}
                                  >
                                    <span className="truncate text-center">{tpl.code || tpl.label.charAt(0)}</span>
                                  </div>
                                );
                            })}
                            {hasCustomText && !activeTemplateIds.length && (
                              <div className="w-full h-full flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/20">
                                <Type className="w-3 h-3 text-yellow-600" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popover.isOpen && popover.userId && popover.date && (
        <div 
          ref={popoverRef}
          className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 z-[60] p-3 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3 overflow-y-auto"
          style={{ 
            left: popover.x, 
            top: popover.y,
            width: popover.width,
            maxHeight: popover.height,
          }}
        >
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
            {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(popover.date)}
          </div>
          
          <div className="relative sticky top-0 bg-white dark:bg-slate-800 z-10 pb-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Type className="h-4 w-4 text-slate-400" /></div>
             <input autoFocus type="text" placeholder="Note personnalisée..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={localText} onChange={handleTextChange} />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${holidays.includes(formatDateISO(popover.date)) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}><Flag className="w-4 h-4" /></div>
             <div className="flex-1"><div className="text-sm font-medium text-slate-800 dark:text-slate-200">Jour Férié</div></div>
             <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={holidays.includes(formatDateISO(popover.date))} onChange={() => onToggleHoliday(popover.date!)} />
          </label>

          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

          <div className="space-y-1">
            {templates.map(tpl => {
               const assignment = getAssignment(popover.userId!, popover.date!);
               const isSelected = assignment?.templateIds.includes(tpl.id);
               const tplClass = getModuleClasses(tpl.color, moduleTheme);
               return (
                  <button key={tpl.id} onClick={() => onToggleTemplate(popover.userId!, popover.date!, tpl.id)} className={`w-full text-left p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 group border ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div>
                    <span className={`w-3 h-3 rounded-full ${tplClass.split(' ')[0]}`}></span>
                    <span className="flex-1 truncate dark:text-slate-200">{tpl.label}</span>
                  </button>
               );
            })}
          </div>
            
          <div className="h-px bg-slate-100 dark:bg-slate-700 sticky bottom-10 bg-white dark:bg-slate-800 z-10"></div>
          <button onClick={() => { onClear(popover.userId!, popover.date!); setPopover(prev => ({...prev, isOpen: false})); }} className="w-full text-left p-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 sticky bottom-0 bg-white dark:bg-slate-800 z-10"><Eraser className="w-4 h-4" />Tout effacer</button>
        </div>
      )}
    </div>
  );
};
