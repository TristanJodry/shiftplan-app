import { User, ShiftTemplate } from './types';

// Updated to Solid Colors (White text on Dark Background) for better visibility like Teams
export const COLORS = [
  { name: 'Bleu', value: 'bg-blue-600 text-white border-blue-700' },
  { name: 'Vert', value: 'bg-emerald-600 text-white border-emerald-700' },
  { name: 'Rouge', value: 'bg-red-600 text-white border-red-700' },
  { name: 'Orange', value: 'bg-orange-500 text-white border-orange-600' },
  { name: 'Violet', value: 'bg-purple-600 text-white border-purple-700' },
  { name: 'Gris', value: 'bg-slate-500 text-white border-slate-600' },
  { name: 'Rose', value: 'bg-pink-600 text-white border-pink-700' },
  { name: 'Indigo', value: 'bg-indigo-600 text-white border-indigo-700' },
  { name: 'Sarcelle', value: 'bg-teal-600 text-white border-teal-700' },
  { name: 'Cyan', value: 'bg-cyan-600 text-white border-cyan-700' },
  { name: 'Ciel', value: 'bg-sky-500 text-white border-sky-600' },
  { name: 'Citron', value: 'bg-lime-600 text-white border-lime-700' },
  { name: 'Ambre', value: 'bg-amber-500 text-white border-amber-600' },
  { name: 'Fuchsia', value: 'bg-fuchsia-600 text-white border-fuchsia-700' },
  { name: 'Noir', value: 'bg-slate-800 text-white border-slate-900' },
  { name: 'Marron', value: 'bg-stone-600 text-white border-stone-700' },
];

// Mapping for Pastel Theme
const PASTEL_MAP: Record<string, string> = {
  'bg-blue-600': 'bg-blue-100 text-blue-900 border-blue-200',
  'bg-emerald-600': 'bg-emerald-100 text-emerald-900 border-emerald-200',
  'bg-red-600': 'bg-red-100 text-red-900 border-red-200',
  'bg-orange-500': 'bg-orange-100 text-orange-900 border-orange-200',
  'bg-purple-600': 'bg-purple-100 text-purple-900 border-purple-200',
  'bg-slate-500': 'bg-slate-200 text-slate-800 border-slate-300',
  'bg-pink-600': 'bg-pink-100 text-pink-900 border-pink-200',
  'bg-indigo-600': 'bg-indigo-100 text-indigo-900 border-indigo-200',
  'bg-teal-600': 'bg-teal-100 text-teal-900 border-teal-200',
  'bg-cyan-600': 'bg-cyan-100 text-cyan-900 border-cyan-200',
  'bg-sky-500': 'bg-sky-100 text-sky-900 border-sky-200',
  'bg-lime-600': 'bg-lime-100 text-lime-900 border-lime-200',
  'bg-amber-500': 'bg-amber-100 text-amber-900 border-amber-200',
  'bg-fuchsia-600': 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
  'bg-slate-800': 'bg-gray-200 text-gray-900 border-gray-300',
  'bg-stone-600': 'bg-stone-200 text-stone-800 border-stone-300',
};

/**
 * Transforms the stored color class into the requested theme (Solid vs Pastel)
 * Added safety check for undefined/null inputs.
 */
export const getModuleClasses = (originalClasses: string | undefined | null, theme: 'solid' | 'pastel' = 'solid'): string => {
  if (!originalClasses) return 'bg-slate-200 text-slate-800 border-slate-300'; // Fallback safely
  
  if (theme === 'solid') return originalClasses;

  // Find the key in the original class string (e.g. "bg-blue-600")
  const key = Object.keys(PASTEL_MAP).find(k => originalClasses.includes(k));
  
  // Return mapped pastel color or fallback to original if not found
  return key ? PASTEL_MAP[key] : originalClasses;
};

export const INITIAL_USERS: User[] = [];

export const INITIAL_TEMPLATES: ShiftTemplate[] = [];