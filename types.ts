export interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface ShiftTemplate {
  id: string;
  label: string; // e.g., "8h-16h" or "Matin"
  code?: string;  // Short code (Optional now)
  color: string; // Tailwind color class or hex
  description?: string;
}

export interface Assignment {
  id: string;
  userId: string;
  date: string; // ISO Date string YYYY-MM-DD
  templateIds: string[]; // Changed from single ID to array
  customText?: string;   // New field for free text
}

export interface ViewState {
  currentDate: Date;
  isAdminOpen: boolean;
}