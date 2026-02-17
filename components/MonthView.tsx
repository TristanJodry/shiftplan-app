import React from 'react';
import { User, ShiftTemplate, Assignment } from '../types';
import { getStartOfMonth, getEndOfMonth, getStartOfWeek, addDays, formatDateISO } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  onDateChange: (d: Date) => void;
  users: User[];
  templates: ShiftTemplate[];
  assignments: Assignment[]; 
  holidays: string[];
  showWeekends: boolean;
  onOpenAdmin: () => void;
  onDayClick: (d: Date) => void; // New interaction
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate, onDateChange, users, templates, assignments, holidays, showWeekends, onOpenAdmin, onDayClick
}) => {
  const startMonth = getStartOfMonth(currentDate);
  const endMonth = getEndOfMonth(currentDate);
  const startDate = getStartOfWeek(startMonth);
  const endDate = addDays(getStartOfWeek(endMonth), 6);

  const todayISO = formatDateISO(new Date());

  // Generate calendar grid
  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const daysToShow = showWeekends 
    ? calendarDays 
    : calendarDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  
  const gridCols = showWeekends ? 'grid-cols-7' : 'grid-cols-5';
  const weekDayNames = showWeekends 
    ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

  return (
    <div className="flex flex-col h-full bg-white/95 dark:bg-slate-800/95 shadow-sm border dark:border-slate-700 rounded-xl overflow-hidden transition-colors backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
            <button onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => onDateChange(new Date())} className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all">Aujourd'hui</button>
            <button onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-300"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)}
          </h2>
        </div>
        <button onClick={onOpenAdmin} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm">
          <Settings className="w-4 h-4" />
          <span>Gérer l'équipe</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/50 p-4">
        <div className={`grid ${gridCols} gap-4 h-full min-h-[600px] auto-rows-fr`}>
          {/* Headers */}
          {weekDayNames.map(dayName => (
            <div key={dayName} className="text-center font-bold text-slate-500 dark:text-slate-400 uppercase text-xs py-2">
              {dayName}
            </div>
          ))}

          {/* Days */}
          {daysToShow.map(date => {
            const dateISO = formatDateISO(date);
            const isToday = dateISO === todayISO;
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isHoliday = holidays.includes(dateISO);
            
            // Find assignments for this day
            const dayAssignments = assignments.filter(a => a.date === dateISO && (a.templateIds.length > 0 || a.customText));

            return (
              <div 
                key={dateISO} 
                onClick={() => onDayClick(date)}
                className={`min-h-[100px] bg-white dark:bg-slate-800 rounded-lg border p-2 flex flex-col gap-1 transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md
                  ${isToday ? 'ring-2 ring-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-700'} 
                  ${!isCurrentMonth ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900' : ''}
                  ${isHoliday ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                `}
              >
                <div className="flex justify-between items-start pointer-events-none">
                  <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : isHoliday ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                    {date.getDate()}
                  </span>
                  {isHoliday && <span className="text-[10px] font-bold text-red-500 uppercase">Férié</span>}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 mt-1 custom-scrollbar pointer-events-none">
                  {dayAssignments.map(assign => {
                    const user = users.find(u => u.id === assign.userId);
                    if (!user) return null;
                    
                    return (
                      <div key={assign.id} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-1 border border-slate-100 dark:border-slate-600">
                         <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400" 
                              style={{ 
                                backgroundColor: assign.templateIds.length > 0 
                                  ? undefined 
                                  : undefined 
                              }}>
                              {assign.templateIds.length > 0 && (
                                <div className={`w-full h-full rounded-full ${templates.find(t => t.id === assign.templateIds[0])?.color.split(' ')[0] || 'bg-slate-400'}`}></div>
                              )}
                              {assign.templateIds.length === 0 && <div className="w-full h-full rounded-full bg-yellow-400"></div>}
                         </div>
                         <span className="truncate font-medium text-slate-700 dark:text-slate-300 flex-1">{user.name.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                  {dayAssignments.length === 0 && isCurrentMonth && !isHoliday && (
                      <div className="text-[10px] text-slate-300 dark:text-slate-600 text-center mt-2 italic opacity-50">. . .</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};