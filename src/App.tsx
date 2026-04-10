import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  Lightbulb, 
  User, 
  LogOut,
  GraduationCap,
  ChevronRight,
  Send,
  Plus,
  Sparkles,
  BrainCircuit,
  ClipboardList,
  Clock,
  Target
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile, ChatMessage, Subject, Suggestion } from './types';
import { store } from './lib/store';
import { askDrSmartStream } from './lib/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ className, variant = 'primary', size = 'md', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'accent', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-primary hover:bg-emerald-600 text-white',
    secondary: 'bg-secondary hover:bg-blue-600 text-white',
    accent: 'bg-accent hover:bg-amber-600 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  return (
    <button 
      className={cn('rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant], sizes[size], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-card border border-slate-700/50 rounded-2xl p-4 shadow-xl', className)}>
    {children}
  </div>
);

// --- Pages ---

const Dashboard = ({ user, setTab }: { user: UserProfile, setTab: (t: string) => void }) => {
  const suggestedTopics = [
    { title: 'Algebra Basics', subject: 'Mathematics', icon: BrainCircuit },
    { title: 'Photosynthesis', subject: 'Biology', icon: Sparkles },
    { title: 'Newton\'s Laws', subject: 'Physics', icon: Target },
    { title: 'Essay Writing', subject: 'English', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Welcome, {user.fullName.split(' ')[0]}! 👋</h1>
        <p className="text-slate-400">Ready to learn something new today?</p>
      </header>

      <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary rounded-2xl text-white">
            <GraduationCap size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-white">How to use Smart Naija Kid</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ask Dr. Smart any question about your subjects. He'll explain it simply with examples!
            </p>
            <Button size="sm" onClick={() => setTab('ask')} className="mt-2">
              Start Chatting
            </Button>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles size={20} className="text-accent" />
          Suggested Topics
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {suggestedTopics.map((topic, i) => (
            <motion.div
              key={topic.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setTab('ask')}
              className="group cursor-pointer"
            >
              <Card className="flex items-center justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-800 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <topic.icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{topic.title}</h4>
                    <p className="text-xs text-slate-500">{topic.subject}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

const AskDrSmart = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(store.getChats());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'General'>('General');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      subject: selectedSubject === 'General' ? undefined : selectedSubject
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    store.saveChat(userMsg);

    try {
      let assistantContent = '';
      const assistantMsgId = (Date.now() + 1).toString();
      
      // Add placeholder for streaming
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      }]);

      const history = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      const stream = askDrSmartStream(text, history);
      
      for await (const chunk of stream) {
        assistantContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: assistantContent } : m
        ));
      }

      store.saveChat({
        id: assistantMsgId,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Simplify more', icon: BrainCircuit },
    { label: 'Give quiz', icon: ClipboardList },
    { label: 'Explain further', icon: Plus },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {['General', 'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology'].map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s as any)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              selectedSubject === s 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-slate-800 text-slate-400 border border-slate-700"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="p-6 bg-slate-800 rounded-full">
              <MessageSquare size={48} className="text-primary" />
            </div>
            <div className="max-w-xs">
              <h3 className="font-bold text-white">Ask Dr. Smart</h3>
              <p className="text-sm">Type any question about your subjects to get started!</p>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl p-4",
              m.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-card border border-slate-700 rounded-tl-none"
            )}>
              <div className="markdown-body">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              <p className={cn("text-[10px] mt-2 opacity-50", m.role === 'user' ? "text-right" : "text-left")}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length-1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-card border border-slate-700 rounded-2xl rounded-tl-none p-4 flex gap-1">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-primary rounded-full" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 space-y-4">
        {messages.length > 0 && !isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSend(action.label)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap hover:bg-slate-700"
              >
                <action.icon size={14} />
                {action.label}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Dr. Smart anything..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-4 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2.5 bg-primary text-white rounded-xl disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const HowToRead = () => {
  const sections = [
    {
      title: 'Study Techniques',
      icon: BrainCircuit,
      tips: [
        'Active Recall: Test yourself instead of just re-reading.',
        'Spaced Repetition: Review topics at increasing intervals.',
        'The Feynman Technique: Explain a concept to someone else simply.'
      ]
    },
    {
      title: 'Memory Tips',
      icon: Lightbulb,
      tips: [
        'Use Mnemonics (e.g., MR NIGER D for Biology).',
        'Visualize concepts with diagrams and mind maps.',
        'Get enough sleep! Your brain processes info while you sleep.'
      ]
    },
    {
      title: 'Exam Strategies',
      icon: Target,
      tips: [
        'Read all instructions carefully before starting.',
        'Answer easy questions first to build confidence.',
        'Manage your time—don\'t spend too long on one question.'
      ]
    },
    {
      title: 'Time Management',
      icon: Clock,
      tips: [
        'Use the Pomodoro Technique (25 mins study, 5 mins break).',
        'Create a realistic study timetable.',
        'Remove distractions (put your phone away!).'
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">How to Read & Understand 📚</h1>
        <p className="text-slate-400">Master your studies with these proven tips.</p>
      </header>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="space-y-3">
              <div className="flex items-center gap-3 text-primary">
                <section.icon size={24} />
                <h3 className="font-bold text-white">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.tips.map((tip, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-accent rounded-full shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SuggestionBox = () => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('General');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const suggestion: Suggestion = {
      id: Date.now().toString(),
      userId: 'user-1',
      message,
      category,
      timestamp: Date.now()
    };

    store.addSuggestion(suggestion);
    setIsSubmitted(true);
    setMessage('');
    
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Suggestion Box 💡</h1>
        <p className="text-slate-400">Help us make Smart Naija Kid better for you.</p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Subject/Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
            >
              <option>General</option>
              <option>English</option>
              <option>Mathematics</option>
              <option>Physics</option>
              <option>Chemistry</option>
              <option>Biology</option>
              <option>New Feature</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          <Button type="submit" className="w-full py-4 text-lg">
            Submit Suggestion
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 bg-primary text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <Sparkles size={24} />
            <p className="font-medium">Thank you! Your suggestion has been sent.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Profile = ({ user, onSignOut, onUpdate }: { user: UserProfile, onSignOut: () => void, onUpdate: (u: UserProfile) => void }) => {
  const [formData, setFormData] = useState(user);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdate(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">My Profile 👤</h1>
        <p className="text-slate-400">Manage your account information.</p>
      </header>

      <div className="flex flex-col items-center py-4 space-y-4">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-2xl">
          {user.fullName[0]}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
          <p className="text-slate-500">{user.email}</p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Date of Birth</label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Class/Grade</label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
          >
            <option>JSS 1</option>
            <option>JSS 2</option>
            <option>JSS 3</option>
            <option>SSS 1</option>
            <option>SSS 2</option>
            <option>SSS 3</option>
          </select>
        </div>

        <div className="pt-4 space-y-3">
          <Button onClick={handleSave} className="w-full py-4">
            {isSaved ? 'Changes Saved!' : 'Save Changes'}
          </Button>
          <Button onClick={onSignOut} variant="ghost" className="w-full py-4 text-red-400 hover:bg-red-400/10 hover:text-red-400">
            <LogOut size={20} className="mr-2 inline" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

// --- Auth Flow ---

const Login = ({ onLogin }: { onLogin: (u: UserProfile) => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-4"
      >
        <div className="w-24 h-24 bg-primary rounded-[2rem] mx-auto flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-12">
          <GraduationCap size={48} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">Smart Naija Kid</h1>
        <p className="text-slate-400 max-w-xs mx-auto">
          The AI-powered teacher in your pocket. Learn English, Math, and Science the easy way!
        </p>
      </motion.div>

      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Welcome Back</h2>
          <p className="text-sm text-slate-500">Sign in to continue your learning journey.</p>
        </div>
        <Button 
          onClick={() => onLogin({
            uid: 'user-1',
            fullName: 'Joshua Adebayo',
            email: 'josh9ja@gmail.com',
            dob: '2008-05-15',
            grade: 'SSS 2'
          })}
          className="w-full py-4 flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(store.getUser());
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (u: UserProfile) => {
    store.setUser(u);
    setUser(u);
  };

  const handleSignOut = () => {
    store.setUser(null);
    setUser(null);
  };

  const handleUpdateProfile = (u: UserProfile) => {
    store.setUser(u);
    setUser(u);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'ask', label: 'Ask AI', icon: MessageSquare },
    { id: 'read', label: 'Study', icon: BookOpen },
    { id: 'suggest', label: 'Suggest', icon: Lightbulb },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background flex flex-col">
      <main className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard user={user} setTab={setActiveTab} />}
            {activeTab === 'ask' && <AskDrSmart />}
            {activeTab === 'read' && <HowToRead />}
            {activeTab === 'suggest' && <SuggestionBox />}
            {activeTab === 'profile' && <Profile user={user} onSignOut={handleSignOut} onUpdate={handleUpdateProfile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-slate-700/50 px-6 py-3 pb-6 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                  : "text-slate-500 hover:text-slate-300"
              )}>
                <tab.icon size={22} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                activeTab === tab.id ? "text-primary opacity-100" : "text-slate-500 opacity-0 group-hover:opacity-100"
              )}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
