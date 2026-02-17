import { useState, useEffect, useCallback, useRef } from 'react';
import { User, ShiftTemplate, Assignment } from '../types';
import { formatDateISO } from '../utils/dateUtils';
import { generateId } from '../utils/idUtils';

// Helper to interact with the Node.js backend
const API_URL = '/api/db';

export const usePlanner = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State containers
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  
  // Shared settings
  const [backgroundImage, setSharedBackgroundImage] = useState<string | null>(null);

  // Ref to track saving state to prevent race conditions with polling
  const isSaving = useRef(false);

  // Refs to access latest state inside async/interval functions without dependencies issues
  const stateRef = useRef({ users, templates, assignments, holidays, backgroundImage });
  
  useEffect(() => {
    stateRef.current = { users, templates, assignments, holidays, backgroundImage };
  }, [users, templates, assignments, holidays, backgroundImage]);

  // --- API FUNCTIONS ---

  const fetchData = async () => {
    // SECURITY: If we are currently saving, DO NOT fetch to avoid overwriting local changes with stale server data
    if (isSaving.current) return;

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      
      setUsers(data.users || []);
      setTemplates(data.templates || []);
      setAssignments(data.assignments || []);
      setHolidays(data.holidays || []);
      setSharedBackgroundImage(data.backgroundImage || null);
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (loading) {
         // Keep existing data if we fail after first load, otherwise init empty
         if (users.length === 0) {
             setUsers([]);
             setTemplates([]);
             setAssignments([]);
             setHolidays([]);
         }
         setLoading(false);
         setError("Mode hors ligne (Serveur non détecté).");
      }
    }
  };

  const saveData = async (
      newUsers: User[], 
      newTemplates: ShiftTemplate[], 
      newAssignments: Assignment[], 
      newHolidays: string[],
      newBackgroundImage: string | null
  ) => {
    isSaving.current = true;
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: newUsers,
          templates: newTemplates,
          assignments: newAssignments,
          holidays: newHolidays,
          backgroundImage: newBackgroundImage
        })
      });
      setError(null);
    } catch (err) {
      console.error("Failed to save data:", err);
      setError("Erreur de sauvegarde !");
    } finally {
      // Small delay to ensure the server file write completes before we allow polling again
      setTimeout(() => {
        isSaving.current = false;
      }, 1000);
    }
  };

  // --- INITIALIZATION & POLLING ---

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
        fetchData();
    }, 2000); 

    return () => clearInterval(intervalId);
  }, []);

  // --- ACTIONS ---

  const addUser = (user: User) => {
    const nextUsers = [...users, user];
    setUsers(nextUsers);
    saveData(nextUsers, templates, assignments, holidays, backgroundImage);
  };

  const removeUser = (id: string) => {
    const nextUsers = users.filter(u => u.id !== id);
    const nextAssignments = assignments.filter(a => a.userId !== id);
    setUsers(nextUsers);
    setAssignments(nextAssignments);
    saveData(nextUsers, templates, nextAssignments, holidays, backgroundImage);
  };

  const updateUser = (updated: User) => {
      const nextUsers = users.map(u => u.id === updated.id ? updated : u);
      setUsers(nextUsers);
      saveData(nextUsers, templates, assignments, holidays, backgroundImage);
  };

  const reorderUser = (id: string, direction: 'up' | 'down') => {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === users.length - 1) return;

    const newUsers = [...users];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap elements
    [newUsers[index], newUsers[swapIndex]] = [newUsers[swapIndex], newUsers[index]];
    
    setUsers(newUsers);
    saveData(newUsers, templates, assignments, holidays, backgroundImage);
  };

  const addTemplate = (tpl: ShiftTemplate) => {
    const nextTemplates = [...templates, tpl];
    setTemplates(nextTemplates);
    saveData(users, nextTemplates, assignments, holidays, backgroundImage);
  };

  const removeTemplate = (id: string) => {
    const nextTemplates = templates.filter(t => t.id !== id);
    const nextAssignments = assignments.map(a => ({
      ...a,
      templateIds: a.templateIds.filter(tid => tid !== id)
    }));
    setTemplates(nextTemplates);
    setAssignments(nextAssignments);
    saveData(users, nextTemplates, nextAssignments, holidays, backgroundImage);
  };

  const updateTemplate = (updated: ShiftTemplate) => {
      const nextTemplates = templates.map(t => t.id === updated.id ? updated : t);
      setTemplates(nextTemplates);
      saveData(users, nextTemplates, assignments, holidays, backgroundImage);
  };

  const toggleAssignmentTemplate = (userId: string, date: Date, templateId: string) => {
    const dateStr = formatDateISO(date);
    let nextAssignments = [...assignments];
    const existingIndex = nextAssignments.findIndex(a => a.userId === userId && a.date === dateStr);
      
    if (existingIndex >= 0) {
      const existing = nextAssignments[existingIndex];
      const hasTemplate = existing.templateIds.includes(templateId);
      let newTemplateIds;
      
      if (hasTemplate) {
        newTemplateIds = existing.templateIds.filter(id => id !== templateId);
      } else {
        newTemplateIds = [...existing.templateIds, templateId];
      }

      if (newTemplateIds.length === 0 && !existing.customText) {
           nextAssignments = nextAssignments.filter((_, i) => i !== existingIndex);
      } else {
           nextAssignments[existingIndex] = { ...existing, templateIds: newTemplateIds };
      }
    } else {
      nextAssignments.push({ id: generateId(), userId, date: dateStr, templateIds: [templateId], customText: '' });
    }

    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, backgroundImage);
  };

  const updateAssignmentText = (userId: string, date: Date, text: string) => {
    const dateStr = formatDateISO(date);
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
    
    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, backgroundImage);
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
    saveData(users, templates, nextAssignments, holidays, backgroundImage);
  };

  const clearAssignment = (userId: string, date: Date) => {
    const dateStr = formatDateISO(date);
    const nextAssignments = assignments.filter(a => !(a.userId === userId && a.date === dateStr));
    setAssignments(nextAssignments);
    saveData(users, templates, nextAssignments, holidays, backgroundImage);
  };

  const moveAssignment = (fromUserId: string, fromDate: Date, toUserId: string, toDate: Date) => {
      const fromDateStr = formatDateISO(fromDate);
      const toDateStr = formatDateISO(toDate);
      if (fromUserId === toUserId && fromDateStr === toDateStr) return;

      const sourceAssignment = assignments.find(a => a.userId === fromUserId && a.date === fromDateStr);
      if (!sourceAssignment) return; 

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
      saveData(users, templates, nextAssignments, holidays, backgroundImage);
  };

  const toggleHoliday = (date: Date) => {
      const dateStr = formatDateISO(date);
      let nextHolidays = [...holidays];
      if (nextHolidays.includes(dateStr)) {
          nextHolidays = nextHolidays.filter(h => h !== dateStr);
      } else {
          nextHolidays.push(dateStr);
      }
      setHolidays(nextHolidays);
      saveData(users, templates, assignments, nextHolidays, backgroundImage);
  };

  const setBackgroundImage = (url: string | null) => {
      setSharedBackgroundImage(url);
      saveData(users, templates, assignments, holidays, url);
  };

  const getAssignment = useCallback((userId: string, date: Date) => {
    const dateStr = formatDateISO(date);
    return assignments.find(a => a.userId === userId && a.date === dateStr);
  }, [assignments]);

  return {
    loading, error,
    users, addUser, removeUser, updateUser, reorderUser, // Exported reorderUser
    templates, addTemplate, removeTemplate, updateTemplate,
    holidays, toggleHoliday,
    getAssignment, assignments,
    toggleAssignmentTemplate, updateAssignmentText, clearAssignment, replaceAssignment, moveAssignment,
    backgroundImage, setBackgroundImage
  };
};