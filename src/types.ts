
export type Subject = 'English' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  dob: string;
  grade?: string;
  photoURL?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  subject?: Subject;
}

export interface Suggestion {
  id: string;
  userId: string;
  message: string;
  category?: string;
  timestamp: number;
}
