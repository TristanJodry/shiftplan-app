import React, { useState, useRef, useEffect } from 'react';
import { User, ShiftTemplate, Assignment } from '../types';
import { getStartOfWeek, addDays, formatDateFr, formatDateISO } from '../utils/dateUtils';
import { getModuleClasses } from '../constants';
import { ChevronLeft, ChevronRight, Settings, Calendar as CalendarIcon, Check, Eraser, Plus, Type, Copy, Flag } from 'lucide-react';

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (d: Date) => void;
  users: User[];
  hiddenUserIds: string[];
  templates: ShiftTemplate[];
  holidays: string[];
  showWeekends: boolean;
  moduleTheme: 'solid' | 'pastel';
  bgOpacity: number; // New prop for transparency
  theme: 'light' | 'dark'; // New prop for color calculation
  getAssignment: (userId: string, date: Date) => Assignment | undefined;
  onToggleTemplate: (userId: string, date: Date, templateId: string) => void;
  onUpdateText: (userId: string, date: Date, text: string) => void;
  onReplace: (userId: string, date: Date, templateIds: string[], customText: string) => void;
  onClear: (userId: string, date: Date) => void;
  onMoveAssignment: (fromUserId: string, fromDate: Date, toUserId: string, toDate: Date) => void;
  onToggleHoliday: (date: Date) => void;
  onOpenAdmin: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate, onDateChange, users, hiddenUserIds = [], templates, holidays, showWeekends, moduleTheme = 'solid', bgOpacity = 0.95, theme = 'light', getAssignment, onToggleTemplate, onUpdateText, onReplace, onClear, onMoveAssignment, onToggleHoliday, onOpenAdmin
}) => {
  const startOfWeek = getStartOfWeek(currentDate);
  
  // Filter visible users
  const safeHiddenIds = Array.isArray(hiddenUserIds) ? hiddenUserIds : [];
  const visibleUsers = users.filter(user => !safeHiddenIds.includes(user.id));

  // Calculate days to show
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i)).filter(date => {
      if (showWeekends) return true;
      const day = date.getDay();
      return day !== 0 && day !== 6;
  });

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
    
    // Popover placement logic...
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
    if (e.key === 'Enter') {
        e.preventDefault();
        handleCellDoubleClick(e, userId, date);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        onClear(userId, date);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const assignment = getAssignment(userId, date);
        if (assignment) setClipboard({ templateIds: assignment.templateIds, customText: assignment.customText || '' });
        else setClipboard(null);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (clipboard) onReplace(userId, date, clipboard.templateIds, clipboard.customText);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalText(e.target.value);
      if (popover.userId && popover.date) {
          onUpdateText(popover.userId, popover.date, e.target.value);
      }
  };

  const handleDragStart = (e: React.DragEvent, userId: string, date: Date) => {
    const assignment = getAssignment(userId, date);
    if (!assignment || (assignment.templateIds.length === 0 && !assignment.customText)) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ userId, date: formatDateISO(date) }));
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDragOverCell(null);
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

  // Dynamic Background Styles
  const bgBaseColor = theme === 'dark' ? `30, 41, 59` : `255, 255, 255`; // Slate-800 or White
  const bgStyle = { backgroundColor: `rgba(${bgBaseColor}, ${bgOpacity})` };
  // Header background slightly more opaque or same? Using same for transparency effect.
  // Actually headers need to hide scrolling content, but user wants transparency.
  // We use the same transparency. Content behind might be visible.
  
  // Header row style (slate-100 or slate-900 usually)
  const headerBaseColor = theme === 'dark' ? `15, 23, 42` : `241, 245, 249`; // Slate-900 or Slate-100
  const headerStyle = { backgroundColor: `rgba(${headerBaseColor}, ${bgOpacity})` };

  return (
    <div 
      className="flex flex-col h-full shadow-sm border dark:border-slate-700 rounded-xl overflow-hidden transition-colors backdrop-blur-sm"
      style={bgStyle} // Apply opacity to main container
    >
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b dark:border-slate-700 transition-colors gap-3" style={headerStyle}>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
            <button onClick={() => onDateChange(addDays(currentDate, -7))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => onDateChange(new Date())} className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all">Aujourd'hui</button>
            <button onClick={() => onDateChange(addDays(currentDate, 7))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 hidden sm:block" />
            <span className="sm:hidden">{new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(currentDate)}</span>
            <span className="hidden sm:inline">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}</span>
          </h2>
        </div>
        <button onClick={onOpenAdmin} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm">
          <Settings className="w-4 h-4" />
          <span>Gérer l'équipe</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto relative touch-pan-x touch-pan-y">
        <table className="w-full border-collapse min-w-[800px] md:min-w-[1000px]">
          <thead className="sticky top-0 z-40 shadow-sm" style={headerStyle}>
            <tr>
              <th className="p-4 text-left border-b border-r dark:border-slate-700 w-48 md:w-64 sticky left-0 z-50" style={headerStyle}>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Membres</span>
              </th>
              {weekDays.map((date) => {
                const dateISO = formatDateISO(date);
                const isToday = dateISO === todayISO;
                const isHoliday = holidays.includes(dateISO);
                // Header cells normally have specific colors for today/holiday, we mix them with opacity style if needed or rely on CSS classes and accept standard opacity
                // To support transparency properly, we use the headerStyle as base and let the inner divs handle highlighting
                return (
                  <th key={dateISO} className={`p-3 text-center border-b border-r dark:border-slate-700 min-w-[100px] md:min-w-[120px] relative overflow-hidden ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${isHoliday ? 'bg-red-50 dark:bg-red-900/20' : ''}`} style={(!isToday && !isHoliday) ? headerStyle : undefined}>
                    <div className="flex flex-col items-center justify-center relative z-10">
                      <span className={`text-xs uppercase font-bold mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : isHoliday ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date)}
                      </span>
                      <span className={`text-xl font-light w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : isHoliday ? 'text-red-600 dark:text-red-400 font-normal ring-1 ring-red-200 dark:ring-red-800' : 'text-slate-700 dark:text-slate-300'}`}>
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
                <td className="p-4 border-b border-r dark:border-slate-700 sticky left-0 z-30 group-hover:bg-slate-50/95 dark:group-hover:bg-slate-700/95 border-r-slate-200 dark:border-r-slate-700 transition-colors" style={bgStyle}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm text-xs md:text-sm">{user.name.charAt(0)}</div>
                    <div className="min-w-0"><div className="font-semibold text-slate-900 dark:text-slate-100 text-xs md:text-sm truncate">{user.name}</div><div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</div></div>
                  </div>
                </td>
                {weekDays.map((date) => {
                  const dateISO = formatDateISO(date);
                  const assignment = getAssignment(user.id, date);
                  const activeTemplateIds = assignment?.templateIds || [];
                  const hasCustomText = !!assignment?.customText;
                  const isEmpty = activeTemplateIds.length === 0 && !hasCustomText;
                  const isToday = dateISO === todayISO;
                  const isHoliday = holidays.includes(dateISO);
                  const isSelected = selectedCell?.userId === user.id && selectedCell?.date.getTime() === date.getTime();
                  const isDragOver = dragOverCell?.userId === user.id && dragOverCell?.dateStr === dateISO;

                  return (
                    <td key={dateISO} className={`p-1 border-b border-r dark:border-slate-700 cursor-pointer relative transition-all align-top h-20 md:h-24 outline-none ${isToday ? 'bg-blue-50/10 dark:bg-blue-900/10' : ''} ${isHoliday ? 'bg-red-50/30 dark:bg-red-900/10' : ''} ${isDragOver ? 'bg-blue-100 dark:bg-blue-800/50 ring-2 ring-inset ring-blue-400' : 'focus:bg-blue-50/30 dark:focus:bg-blue-900/20'}`} style={(!isToday && !isHoliday && !isDragOver) ? bgStyle : undefined} onClick={(e) => handleCellClick(e, user.id, date)} onDoubleClick={(e) => handleCellDoubleClick(e, user.id, date)} onKeyDown={(e) => handleKeyDown(e, user.id, date)} onDragOver={(e) => handleDragOver(e, user.id, date)} onDrop={(e) => handleDrop(e, user.id, date)} tabIndex={0}>
                        <div className={`w-full h-full min-h-[4rem] rounded-md transition-all flex flex-col overflow-hidden relative z-10 ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''} ${isEmpty ? 'border-2 border-dashed border-transparent hover:border-blue-200 dark:hover:border-slate-600' : 'bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600'}`} draggable={!isEmpty} onDragStart={(e) => handleDragStart(e, user.id, date)} onDragEnd={handleDragEnd}>
                        {isEmpty ? (<div className="w-full h-full flex items-center justify-center"><Plus className={`w-5 h-5 text-slate-300 dark:text-slate-600 ${isSelected ? 'text-blue-400' : ''}`} /></div>) : (
                          <><div className="flex-1 flex flex-col w-full h-full">
                                {activeTemplateIds.map(tid => {
                                    const tpl = templates.find(t => t.id === tid);
                                    if (!tpl) return null;
                                    const tplClass = getModuleClasses(tpl.color, moduleTheme);
                                    return (<div key={tid} className={`flex-1 flex items-center justify-center px-1 md:px-2 text-[10px] md:text-xs font-bold ${tplClass} w-full border-b border-black/10 last:border-0`} title={tpl.label}><span className="truncate text-center shadow-sm">{tpl.label}</span></div>);
                                })}
                            </div>
                            {hasCustomText && (<div className={`px-1 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 text-[9px] md:text-[10px] text-slate-700 dark:text-yellow-100 leading-tight border-t border-slate-100 dark:border-slate-600 text-center truncate ${activeTemplateIds.length === 0 ? 'h-full flex items-center justify-center font-medium text-xs' : ''}`}>{assignment.customText}</div>)}</>
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
          <div className="relative sticky top-0 bg-white dark:bg-slate-800 z-10 pb-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Type className="h-4 w-4 text-slate-400" /></div>
             <input autoFocus type="text" placeholder="Note personnalisée..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" value={localText} onChange={handleTextChange} />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${holidays.includes(formatDateISO(popover.date)) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}><Flag className="w-4 h-4" /></div>
             <div className="flex-1"><div className="text-sm font-medium text-slate-800 dark:text-slate-200">Jour Férié</div><div className="text-[10px] text-slate-500 dark:text-slate-400">Pour toute l'équipe</div></div>
             <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={holidays.includes(formatDateISO(popover.date))} onChange={() => onToggleHoliday(popover.date!)} />
          </label>

          <div className="h-px bg-slate-100 dark:bg-slate-700"></div>

          <div className="space-y-1">
             <div className="text-xs font-bold text-slate-400 uppercase px-1 mb-2">Modules</div>
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