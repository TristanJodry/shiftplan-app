import { useState, useEffect, useCallback, useRef } from 'react';
import { User, ShiftTemplate, Assignment, Log, CurrentUser } from '../types';
import { formatDateISO } from '../utils/dateUtils';
import { generateId } from '../utils/idUtils';

// Helper to interact with the Node.js backend
const API_URL = '/api/db';
const LOGS_URL = '/api/logs';

export const usePlanner = (currentUser: CurrentUser | null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State containers
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [rtts, setRtts] = useState<string[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  
  // Shared settings
  const [backgroundImage, setSharedBackgroundImage] = useState<string | null>(null);

  // Refs to track saving and fetching states to prevent race conditions with polling
  const isSaving = useRef(false);
  const lastSaveTime = useRef<number>(0);
  const lastFetchTime = useRef<number>(0);

  // Refs to access latest state inside async/interval functions without dependencies issues
  const stateRef = useRef({ users, templates, assignments, holidays, rtts, backgroundImage });
  
  useEffect(() => {
    stateRef.current = { users, templates, assignments, holidays, rtts, backgroundImage };
  }, [users, templates, assignments, holidays, rtts, backgroundImage]);

  // --- API FUNCTIONS ---

  const fetchData = async () => {
    // SECURITY: If we are currently saving, DO NOT fetch to avoid overwriting local changes with stale server data
    if (isSaving.current) return;

    const fetchTime = Date.now();
    lastFetchTime.current = fetchTime;

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      
      // If a save was started or completed after this fetch was initiated, ignore this fetch result
      if (fetchTime < lastSaveTime.current) {
        return;
      }
      // If a newer fetch has already been initiated, ignore this fetch result
      if (fetchTime < lastFetchTime.current) {
        return;
      }
      
      setUsers(data.users || []);
      setTemplates(data.templates || []);
      setAssignments(data.assignments || []);
      setHolidays(data.holidays || []);
      setRtts(data.rtts || []);
      setSharedBackgroundImage(data.backgroundImage || null);
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (loading) {
         if (users.length === 0) {
             setUsers([]);
             setTemplates([]);
             setAssignments([]);
             setHolidays([]);
             setRtts([]);
         }
         setLoading(false);
         setError("Mode hors ligne (Serveur non détecté).");
      }
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(LOGS_URL);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const addLog = async (action: string, details: string, targetUserId?: string) => {
    if (!currentUser) return;
    try {
      await fetch(LOGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          action,
          details,
          targetUserId
        })
      });
      fetchLogs();
    } catch (err) {
      console.error("Failed to add log:", err);
    }
  };

  const saveData = async (
      newUsers: User[], 
      newTemplates: ShiftTemplate[], 
      newAssignments: Assignment[], 
      newHolidays: string[],
      newRtts: string[],
      newBackgroundImage: string | null
  ) => {
    isSaving.current = true;
    lastSaveTime.current = Date.now();
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: newUsers,
          templates: newTemplates,
          assignments: newAssignments,
          holidays: newHolidays,
          rtts: newRtts,
          backgroundImage: newBackgroundImage
        })
      });
      setError(null);
    } catch (err) {
      console.error("Failed to save data:", err);
      setError("Erreur de sauvegarde !");
    } finally {
      setTimeout(() => {
        isSaving.current = false;
      }, 1000);
    }
  };

  // --- INITIALIZATION & POLLING ---

  useEffect(() => {
    fetchData();
    fetchLogs();
    const intervalId = setInterval(() => {
        fetchData();
        fetchLogs();
    }, 2000); 

    return () => clearInterval(intervalId);
  }, []);

  // --- ACTIONS ---

  const addUser = (user: User) => {
    const nextUsers = [...users, user];
    setUsers(nextUsers);
    saveData(nextUsers, templates, assignments, holidays, rtts, backgroundImage);
    addLog('ADD_USER', `A ajouté l'utilisateur ${user.name}`);
  };

  const removeUser = (id: string) => {
    const userToRemove = users.find(u => u.id === id);
    const nextUsers = users.filter(u => u.id !== id);
    const nextAssignments = assignments.filter(a => a.userId !== id);
    setUsers(nextUsers);
    setAssignments(nextAssignments);
    saveData(nextUsers, templates, nextAssignments, holidays, rtts, backgroundImage);
    if (userToRemove) addLog('REMOVE_USER', `A supprimé l'utilisateur ${userToRemove.name}`);
  };

  const updateUser = (updated: User) => {
      const nextUsers = users.map(u => u.id === updated.id ? updated : u);
      setUsers(nextUsers);
      saveData(nextUsers, templates, assignments, holidays, rtts, backgroundImage);
      addLog('UPDATE_USER', `A mis à jour l'utilisateur ${updated.name}`);
  };

  const reorderUser = (id: string, direction: 'up' | 'down') => {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === users.length - 1) return;

    const newUsers = [...users];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newUsers[index], newUsers[swapIndex]] = [newUsers[swapIndex], newUsers[index]];
    
    setUsers(newUsers);
    saveData(newUsers, templates, assignments, holidays, rtts, backgroundImage);
  };

  const addTemplate = (tpl: ShiftTemplate) => {
    const nextTemplates = [...templates, tpl];
    setTemplates(nextTemplates);
    saveData(users, nextTemplates, assignments, holidays, rtts, backgroundImage);
    addLog('ADD_TEMPLATE', `A ajouté le modèle ${tpl.label}`);
  };

  const removeTemplate = (id: string) => {
    const tplToRemove = templates.find(t => t.id === id);
    const nextTemplates = templates.filter(t => t.id !== id);
    const nextAssignments = assignments.map(a => ({
      ...a,
      templateIds: a.templateIds.filter(tid => tid !== id)
    }));
    setTemplates(nextTemplates);
    setAssignments(nextAssignments);
    saveData(users, nextTemplates, nextAssignments, holidays, rtts, backgroundImage);
    if (tplToRemove) addLog('REMOVE_TEMPLATE', `A supprimé le modèle ${tplToRemove.label}`);
  };

  const updateTemplate = (updated: ShiftTemplate) => {
      const nextTemplates = templates.map(t => t.id === updated.id ? updated : t);
      setTemplates(nextTemplates);
      saveData(users, nextTemplates, assignments, holidays, rtts, backgroundImage);
      addLog('UPDATE_TEMPLATE', `A mis à jour le modèle ${updated.label}`);
  };

  const toggleAssignmentTemplate = (userId: string, date: Date, templateId: string) => {
    const dateStr = formatDateISO(date);
    const user = users.find(u => u.id === userId);
    const tpl = templates.find(t => t.id === templateId);
    
    let nextAssignments = [...assignments];
    const existingIndex = nextAssignments.findIndex(a => a.userId === userId && a.date === dateStr);
      
    if (existingIndex >= 0) {
      const existing = nextAssignments[existingIndex];
      const hasTemplate = existing.templateIds.includes(templateId);
      let newTemplateIds;
      
      if (hasTemplate) {
        newTemplateIds = existing.templateIds.filter(id => id !== templateId);
        if (user && tpl) addLog('REMOVE_ASSIGNMENT', `A retiré ${tpl.label} pour ${user.name} le ${dateStr}`, userId);
      } else {
        newTemplateIds = [...existing.templateIds, templateId];
        if (user && tpl) addLog('ADD_ASSIGNMENT', `A ajouté ${tpl.label} pour ${user.name} le ${dateStr}`, userId);
      }

      if (newTemplateIds.length === 0 && !existing.customText) {
           nextAssignments = nextAssignments.filter((_, i) => i !== existingIndex);
      } else {
           nextAssignments[existingIndex] = { ...existing, templateIds: newTemplateIds };
      }
    } else {
      nextAssignments.push({ id: generateId(), userId, date: dateStr, templateIds: [templateId], customText: '' });
      if (user && tpl) addLog('ADD_ASSIGNMENT', `A ajouté ${tpl.label} pour ${user.name} le ${dateStr}`, userId);
    }

    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, rtts, backgroundImage);
  };

  const updateAssignmentText = (userId: string, date: Date, text: string) => {
    const dateStr = formatDateISO(date);
    const user = users.find(u => u.id === userId);
    let nextAssignments = [...assignments];
    const existingIndex = nextAssignments.findIndex(a => a.userId === userId && a.date === dateStr);
      
    if (existingIndex >= 0) {
      const existing = nextAssignments[existingIndex];
      if (!text && existing.templateIds.length === 0) {
           nextAssignments = nextAssignments.filter((_, i) => i !== existingIndex);
      } else {
           nextAssignments[existingIndex] = { ...existing, customText: text };
      }
    } else {
      if (text) {
          nextAssignments.push({ id: generateId(), userId, date: dateStr, templateIds: [], customText: text });
      }
    }
    
    if (user && text) addLog('UPDATE_TEXT', `A mis à jour le texte pour ${user.name} le ${dateStr}`, userId);
    
    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, rtts, backgroundImage);
  };

  const replaceAssignment = (userId: string, date: Date, templateIds: string[], customText: string) => {
    const dateStr = formatDateISO(date);
    let nextAssignments = [...assignments];
    const existingIndex = nextAssignments.findIndex(a => a.userId === userId && a.date === dateStr);
    
    if (templateIds.length === 0 && !customText) {
        if (existingIndex >= 0) {
            nextAssignments = nextAssignments.filter((_, i) => i !== existingIndex);
        }
    } else {
        if (existingIndex >= 0) {
            nextAssignments[existingIndex] = { ...nextAssignments[existingIndex], templateIds, customText };
        } else {
            nextAssignments.push({ id: generateId(), userId, date: dateStr, templateIds, customText });
        }
    }

    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, rtts, backgroundImage);
  };

  const clearAssignment = (userId: string, date: Date) => {
    const dateStr = formatDateISO(date);
    const user = users.find(u => u.id === userId);
    const nextAssignments = assignments.filter(a => !(a.userId === userId && a.date === dateStr));
    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, rtts, backgroundImage);
    if (user) addLog('CLEAR_ASSIGNMENT', `A effacé le planning de ${user.name} le ${dateStr}`, userId);
  };

  const moveAssignment = (fromUserId: string, fromDate: Date, toUserId: string, toDate: Date) => {
      const fromDateStr = formatDateISO(fromDate);
      const toDateStr = formatDateISO(toDate);
      if (fromUserId === toUserId && fromDateStr === toDateStr) return;

      const sourceAssignment = assignments.find(a => a.userId === fromUserId && a.date === fromDateStr);
      if (!sourceAssignment) return; 

      const fromUser = users.find(u => u.id === fromUserId);
      const toUser = users.find(u => u.id === toUserId);

      let nextAssignments = [...assignments];
      nextAssignments = nextAssignments.filter(a => !(a.userId === fromUserId && a.date === fromDateStr));

      const targetIndex = nextAssignments.findIndex(a => a.userId === toUserId && a.date === toDateStr);
      const newAssignment = {
          id: generateId(), 
          userId: toUserId,
          date: toDateStr,
          templateIds: sourceAssignment.templateIds,
          customText: sourceAssignment.customText
      };

      if (targetIndex >= 0) {
          nextAssignments[targetIndex] = newAssignment;
      } else {
          nextAssignments.push(newAssignment);
      }

      setAssignments(nextAssignments);
      saveData(users, templates, nextAssignments, holidays, rtts, backgroundImage);
      if (fromUser && toUser) addLog('MOVE_ASSIGNMENT', `A déplacé le shift de ${fromUser.name} (${fromDateStr}) vers ${toUser.name} (${toDateStr})`);
  };

  const toggleHoliday = (date: Date) => {
      const dateStr = formatDateISO(date);
      let nextHolidays = [...holidays];
      let nextRtts = [...rtts];
      if (nextHolidays.includes(dateStr)) {
          nextHolidays = nextHolidays.filter(h => h !== dateStr);
          addLog('REMOVE_HOLIDAY', `A retiré le jour férié du ${dateStr}`);
      } else {
          nextHolidays.push(dateStr);
          // Uncheck RTT if checked
          if (nextRtts.includes(dateStr)) {
              nextRtts = nextRtts.filter(r => r !== dateStr);
          }
          addLog('ADD_HOLIDAY', `A ajouté un jour férié le ${dateStr}`);
      }
      setHolidays(nextHolidays);
      setRtts(nextRtts);
      saveData(users, templates, assignments, nextHolidays, nextRtts, backgroundImage);
  };

  const toggleRtt = (date: Date) => {
      const dateStr = formatDateISO(date);
      let nextRtts = [...rtts];
      let nextHolidays = [...holidays];
      if (nextRtts.includes(dateStr)) {
          nextRtts = nextRtts.filter(r => r !== dateStr);
          addLog('REMOVE_RTT', `A retiré le RTT du ${dateStr}`);
      } else {
          nextRtts.push(dateStr);
          // Uncheck Holiday if checked
          if (nextHolidays.includes(dateStr)) {
              nextHolidays = nextHolidays.filter(h => h !== dateStr);
          }
          addLog('ADD_RTT', `A ajouté un RTT le ${dateStr}`);
      }
      setRtts(nextRtts);
      setHolidays(nextHolidays);
      saveData(users, templates, assignments, nextHolidays, nextRtts, backgroundImage);
  };

  const setBackgroundImage = (url: string | null) => {
      setSharedBackgroundImage(url);
      saveData(users, templates, assignments, holidays, rtts, url);
      addLog('UPDATE_BG', `A mis à jour l'image de fond`);
  };

  const syncFrenchHolidays = async () => {
    try {
      const years = [2025, 2026, 2027];
      const allHolidays = new Set<string>();

      for (const year of years) {
        try {
          const res = await fetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`);
          if (res.ok) {
            const data = await res.json();
            Object.keys(data).forEach(dateStr => {
              allHolidays.add(dateStr);
            });
          }
        } catch (err) {
          console.error(`Failed to fetch holidays for year ${year}`, err);
        }
        // Always add Saint-Barbe (Dec 4th)
        allHolidays.add(`${year}-12-04`);
      }

      const newHolidays = Array.from(allHolidays).sort();
      const addedHolidays = newHolidays.filter(h => !holidays.includes(h));
      const countNew = addedHolidays.length;

      setHolidays(newHolidays);
      
      // Clean up any RTT conflicts
      const newRtts = rtts.filter(r => !newHolidays.includes(r));
      setRtts(newRtts);

      await saveData(users, templates, assignments, newHolidays, newRtts, backgroundImage);
      addLog('SYNC_HOLIDAYS', 'A synchronisé les jours fériés officiels via Etalab (avec Sainte-Barbe)');
      return { success: true, count: countNew, total: newHolidays.length };
    } catch (err) {
      console.error('Failed to sync holidays', err);
      return { success: false, error: String(err) };
    }
  };

  const getAssignment = useCallback((userId: string, date: Date) => {
    const dateStr = formatDateISO(date);
    return assignments.find(a => a.userId === userId && a.date === dateStr);
  }, [assignments]);

  return {
    loading, error,
    users, addUser, removeUser, updateUser, reorderUser,
    templates, addTemplate, removeTemplate, updateTemplate,
    holidays, toggleHoliday,
    rtts, toggleRtt,
    getAssignment, assignments,
    toggleAssignmentTemplate, updateAssignmentText, clearAssignment, replaceAssignment, moveAssignment,
    backgroundImage, setBackgroundImage,
    logs, fetchLogs,
    syncFrenchHolidays
  };
};
