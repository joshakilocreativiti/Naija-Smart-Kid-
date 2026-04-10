import { UserProfile, ChatMessage, Suggestion } from '../types';

const STORAGE_KEYS = {
  USER: 'smart_naija_user',
  CHATS: 'smart_naija_chats',
  SUGGESTIONS: 'smart_naija_suggestions',
};

export const store = {
  getUser: (): UserProfile | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: UserProfile | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },
  getChats: (): ChatMessage[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CHATS);
    return data ? JSON.parse(data) : [];
  },
  saveChat: (message: ChatMessage) => {
    const chats = store.getChats();
    chats.push(message);
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  },
  clearChats: () => {
    localStorage.removeItem(STORAGE_KEYS.CHATS);
  },
  getSuggestions: (): Suggestion[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
    return data ? JSON.parse(data) : [];
  },
  addSuggestion: (suggestion: Suggestion) => {
    const suggestions = store.getSuggestions();
    suggestions.push(suggestion);
    localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
  }
};
