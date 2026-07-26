import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, Copy, Check, Maximize2, Minimize2, Plus, Volume2, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Firebase Imports
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';

import { AuthModal } from './components/AuthModal';
import { Sidebar, ChatSession } from './components/Sidebar';
import { Menu } from 'lucide-react';
import { SettingsModal, UserProfileData } from './components/SettingsModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const SORA_IMAGE_SAMPLES = [
  "/fashion.jpeg",
  "/mata.jpeg",
  "/orang.jpeg",
  "/laba-laba.jpeg",
  "/bunga.jpeg",
];

const SORA_IMAGE_PRO_SAMPLES = [
  "/anime 1.2 pro.jpeg",
  "/buah 1.2 pro.jpeg",
  "/cover art 1.2 pro.jpeg",
  "/landscape 1.2 pro.jpeg",
  "/wanita 1.2 pro.jpeg",
];

const CodeBlock = ({ className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!match) {
    return (
      <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs sm:text-sm text-[#EE7B35] font-mono break-all" {...props}>
        {children}
      </code>
    );
  }

  const lang = match[1];
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await copyToClipboard(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10">
        <span className="text-xs font-mono text-white/50 lowercase">{lang}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? "Perkecil" : "Perbesar"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors cursor-pointer"
            title="Salin Kode"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isCopied ? 'text-white' : ''}`}>
              {isCopied ? 'Tersalin' : 'Salin'}
            </span>
          </button>
        </div>
      </div>
      <div className={`relative ${isExpanded ? '' : 'max-h-[300px]'} overflow-hidden transition-all duration-300`}>
        <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-gray-200 custom-scrollbar m-0 bg-transparent border-none">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
        {!isExpanded && codeString.split('\n').length > 12 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};

// Auto-detect if we are running on the web vs Android
const isWebProduction = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
const API_URL = isWebProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) {}
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
};

export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

function App() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showPromptMenu, setShowPromptMenu] = useState(true);
  const [availableModels, setAvailableModels] = useState<any[]>([
    { id: 'sora-prime-1.5-pro-fast', name: 'Sora Prime 1.5 Pro-Fast' },
    { id: 'sora-gen12-preview', name: 'Sora Gen12 Preview' },
    { id: 'sora-one-1.1', name: 'Sora One 1.1' }
  ]);
  const [selectedModel, setSelectedModel] = useState<string>('sora-prime-1.5-pro-fast');
  
  // Rating State
  const [ratedMessages, setRatedMessages] = useState<Record<string, 'like' | 'dislike'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [credits, setCredits] = useState<number>(() => {
    const savedSession = localStorage.getItem('sora_user_session');
    if (savedSession) {
      try {
        const u = JSON.parse(savedSession);
        if (u && u.email) {
          const emailKey = `sora_credits_${u.email.toLowerCase()}`;
          const savedC = localStorage.getItem(emailKey);
          if (savedC) return parseInt(savedC, 10);
          return u.email.toLowerCase().trim() === 'suryamusikdigital@gmail.com' ? 100000000 : 2000;
        }
      } catch { }
    }
    return 2000;
  });
  const [showFeaturePricing, setShowFeaturePricing] = useState(false);
  const [showProFeaturePricing, setShowProFeaturePricing] = useState(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [authBannerMessage, setAuthBannerMessage] = useState('');
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Chat History State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Refs for current states to avoid stale closures in back button handler
  const stateRef = useRef({
    fullscreenImage,
    isNotesModalOpen,
    isSettingsModalOpen,
    showAuthModal,
    isSidebarOpen
  });

  const previousStateRef = useRef({
    fullscreenImage: false,
    isNotesModalOpen: false,
    isSettingsModalOpen: false,
    showAuthModal: false,
    isSidebarOpen: false
  });

  useEffect(() => {
    stateRef.current = {
      fullscreenImage,
      isNotesModalOpen,
      isSettingsModalOpen,
      showAuthModal,
      isSidebarOpen
    };

    const prev = previousStateRef.current;
    let openedSomething = false;

    if (fullscreenImage && !prev.fullscreenImage) openedSomething = true;
    if (isNotesModalOpen && !prev.isNotesModalOpen) openedSomething = true;
    if (isSettingsModalOpen && !prev.isSettingsModalOpen) openedSomething = true;
    if (showAuthModal && !prev.showAuthModal) openedSomething = true;
    if (isSidebarOpen && !prev.isSidebarOpen) openedSomething = true;

    if (openedSomething) {
      window.history.pushState({ modal: true }, '');
    }

    previousStateRef.current = {
      fullscreenImage: !!fullscreenImage,
      isNotesModalOpen,
      isSettingsModalOpen,
      showAuthModal,
      isSidebarOpen
    };
  }, [fullscreenImage, isNotesModalOpen, isSettingsModalOpen, showAuthModal, isSidebarOpen]);

  // Hardware Back Button Handler via History API
  useEffect(() => {
    const handlePopState = () => {
      const state = stateRef.current;
      if (state.fullscreenImage) {
        setFullscreenImage(null);
      } else if (state.isNotesModalOpen) {
        setIsNotesModalOpen(false);
      } else if (state.isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
      } else if (state.showAuthModal) {
        setShowAuthModal(false);
      } else if (state.isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const hasLoadedData = useRef(false);

  // Sync sessions when user changes (Load from Firestore)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser({ name: user.displayName || user.email.split('@')[0], email: user.email, avatar: user.photoURL || undefined });
        
        try {
          // Load sessions
          const sessionsSnap = await getDoc(doc(db, 'users', user.email));
          if (sessionsSnap.exists()) {
            const data = sessionsSnap.data();
            
            // Sync user data from Firestore in case Auth profile is out of sync or base64 photoURL failed
            if (data.name || data.avatar) {
              setCurrentUser(prev => prev ? {
                ...prev,
                name: data.name || prev.name,
                avatar: data.avatar || prev.avatar
              } : prev);
            }

            if (data.sessions) {
              const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
              const validSessions = (data.sessions as ChatSession[]).filter(s => Date.now() - s.updatedAt < ONE_WEEK_MS);
              setSessions(validSessions);
              if (validSessions.length > 0) {
                setCurrentSessionId(validSessions[0].id);
                setMessages(validSessions[0].messages);
              }
            }
            if (data.notes) {
              setNotes(data.notes as Note[]);
            }
          }
          hasLoadedData.current = true;
        } catch (err) {
          console.error("Error loading data from Firestore", err);
          hasLoadedData.current = true; // prevent infinite lock if it fails
        }
      } else {
        hasLoadedData.current = false;
        setCurrentUser(null);
        setSessions([]);
        setCurrentSessionId(null);
        setMessages([]);
        setNotes([]);
        setText('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Save sessions to Firestore whenever they change (Debounced)
  useEffect(() => {
    if (currentUser?.email && sessions.length > 0 && hasLoadedData.current) {
      const timer = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'users', currentUser.email), { sessions }, { merge: true });
        } catch (err) {
          console.error("Error saving sessions", err);
        }
      }, 2000); // 2 second debounce to prevent spamming Firestore during streams
      return () => clearTimeout(timer);
    }
  }, [sessions, currentUser]);

  // Save notes to Firestore whenever they change (Debounced)
  useEffect(() => {
    if (currentUser?.email && hasLoadedData.current) {
      const timer = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'users', currentUser.email), { notes }, { merge: true });
        } catch (err) {
          console.error("Error saving notes", err);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [notes, currentUser]);

  const handleSaveNote = (msgId: string, content: string) => {
    const cleanContent = content.split('---SUGGESTIONS---')[0].replace(/[#*`_~]/g, '').trim();
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: cleanContent,
      createdAt: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
    
    // Visual feedback
    setSavedNoteId(msgId);
    setTimeout(() => setSavedNoteId(null), 2000);
  };

  const handleRateMessage = async (msgId: string, rating: 'like' | 'dislike') => {
    if (ratedMessages[msgId]) return; // Prevent multiple ratings
    
    // Optimistic UI update
    setRatedMessages(prev => ({ ...prev, [msgId]: rating }));
    
    try {
      const secret = import.meta.env.VITE_API_SECRET;
      await fetch(`${API_URL}/api/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-api-secret': secret } : {})
        },
        body: JSON.stringify({
          messageId: msgId,
          rating,
          model: selectedModel,
          user: currentUser?.email || 'Anonymous'
        })
      });
      
      // Save rating to Firestore
      if (currentUser?.email) {
        await setDoc(doc(db, 'users', currentUser.email, 'ratings', msgId), {
          messageId: msgId,
          rating,
          model: selectedModel,
          timestamp: Date.now()
        });
      }
      
      setToastMessage('Terima kasih atas masukannya!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Update current session's messages
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s
      ).sort((a, b) => b.updatedAt - a.updatedAt));
    }
  }, [messages, currentSessionId]);




  // Sync user credits when login session changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      const cleanEmail = currentUser.email.toLowerCase().trim();
      const emailKey = `sora_credits_${cleanEmail}`;
      const savedUserCredits = localStorage.getItem(emailKey);
      if (savedUserCredits) {
        setCredits(parseInt(savedUserCredits, 10));
      } else {
        const initial = cleanEmail === 'suryamusikdigital@gmail.com' ? 100000000 : 2000;
        setCredits(initial);
        localStorage.setItem(emailKey, initial.toString());
      }
    } else {
      setCredits(2000);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      const emailKey = `sora_credits_${currentUser.email.toLowerCase().trim()}`;
      localStorage.setItem(emailKey, credits.toString());
    }
    localStorage.setItem('sora_credits', credits.toString());
  }, [credits, currentUser]);

  useEffect(() => {
    fetch(`${API_URL}/api/models`, {
      headers: {
        'x-api-secret': import.meta.env.VITE_API_SECRET
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const filteredModels = data.data.filter((m: any) => m.id.toLowerCase().includes('sora'));
          if (filteredModels.length > 0) {
            setAvailableModels(filteredModels);
            setSelectedModel(filteredModels[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to fetch models', err));
  }, []);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTTS = async (msgId: string, content: string) => {
    if (playingAudioId === msgId) {
      if (ttsAbortControllerRef.current) {
        ttsAbortControllerRef.current.abort();
        ttsAbortControllerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }
    
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setPlayingAudioId(msgId);
    
    // Gunakan objek Audio langsung, set volume maksimal
    const audio = new Audio();
    audio.volume = 1.0;
    
    audio.onerror = (e) => {
      console.error('Audio playback error', e);
      alert('Error memutar audio di perangkat Anda.');
      setPlayingAudioId(null);
    };

    audioRef.current = audio;
    
    try {
      const secret = import.meta.env.VITE_API_SECRET;
      const cleanContent = content.split('---SUGGESTIONS---')[0].replace(/[#*`_~]/g, '').trim();
      
      // Auto-detect language (Indonesian vs English)
      const contentLower = cleanContent.toLowerCase();
      const englishWords = [' the ', ' is ', ' and ', ' to ', ' you ', ' in ', ' of ', ' for ', ' it ', ' that '];
      const indoWords = [' di ', ' yang ', ' dan ', ' ini ', ' itu ', ' untuk ', ' saya ', ' kamu ', ' dengan '];
      
      let enCount = 0;
      let idCount = 0;
      englishWords.forEach(w => { if (contentLower.includes(w)) enCount++; });
      indoWords.forEach(w => { if (contentLower.includes(w)) idCount++; });
      
      // Select voice based on detection
      const selectedVoice = enCount > idCount ? 'en-US-ChristopherNeural' : 'id-ID-ArdiNeural';
      
      ttsAbortControllerRef.current = new AbortController();

      let res: Response | null = null;
      let blob: Blob | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: any = null;

      while (retryCount < maxRetries) {
        try {
          res = await fetch(`${API_URL}/api/tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(secret ? { 'x-api-secret': secret } : {})
            },
            body: JSON.stringify({ text: cleanContent, voice: selectedVoice }),
            signal: ttsAbortControllerRef.current.signal
          });
          
          if (!res.ok) {
            throw new Error(`Server error: ${res.status}. Pastikan server sudah di-restart!`);
          }
          
          blob = await res.blob();
          if (!blob.type.includes('audio')) {
             throw new Error('Respon bukan file audio. Pastikan backend baru jalan.');
          }
          
          // Berhasil, keluar dari loop
          break;
        } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          lastError = err;
          retryCount++;
          console.warn(`TTS attempt ${retryCount} failed:`, err);
          if (retryCount >= maxRetries) {
            throw err;
          }
          // Tunggu sebentar sebelum mencoba lagi (backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
      
      if (!blob) throw lastError;

      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.onended = () => {
        setPlayingAudioId(null);
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('TTS aborted');
        return;
      }
      console.error('TTS Error:', err);
      alert('Gagal memutar suara: ' + err.message);
      setPlayingAudioId(null);
    } finally {
      if (ttsAbortControllerRef.current && !ttsAbortControllerRef.current.signal.aborted) {
        ttsAbortControllerRef.current = null;
      }
    }
  };

  const handleCopy = async (id: string, content: string) => {
    await copyToClipboard(content);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const downloadImage = async (src: string) => {
    try {
      const filename = `sora-image-${Date.now()}.jpeg`;
      let base64Data = src;
      if (src.startsWith('data:')) {
        const parts = src.split(',');
        base64Data = parts[1] || parts[0];
      }

      // Try saving using native Capacitor Filesystem
      try {
        await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: base64Data,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        alert('Gambar berhasil disimpan ke folder Download!');
        return;
      } catch {
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          alert('Gambar berhasil disimpan ke Dokumen!');
          return;
        } catch {
          // Fallback to web browser download
        }
      }

      const parts = src.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('Download image error:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    localStorage.removeItem('sora_user_session'); // Keep for safety
    setCurrentUser(null);
  };

  const handleQuickPromptClick = (promptPrefix: string) => {
    if (!currentUser) {
      setAuthBannerMessage('Silakan Masuk atau Daftar Akun terlebih dahulu untuk mulai berkirim pesan dengan SORA AI.');
      setShowAuthModal(true);
      return;
    }
    setText(promptPrefix);
    textareaRef.current?.focus();
    setShowPromptMenu(false);
  };

  const handleSendMessage = async (promptToSend?: string | any) => {
    const prompt = (typeof promptToSend === 'string' ? promptToSend : text).trim();
    if (!prompt || isLoading) return;

    if (!currentUser) {
      setAuthBannerMessage('Silakan Masuk atau Daftar Akun terlebih dahulu untuk mulai berkirim pesan dengan SORA AI.');
      setShowAuthModal(true);
      return;
    }

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      const title = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
      const newSession: ChatSession = {
        id: activeSessionId,
        title,
        messages: [],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(activeSessionId);
    }

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newMessages: Message[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: prompt, timestamp: currentTime }
    ];

    setMessages([
      ...newMessages,
      { id: assistantMsgId, role: 'assistant', content: '', timestamp: currentTime }
    ]);

    setText('');
    setIsLoading(true);
    setShowPromptMenu(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': import.meta.env.VITE_API_SECRET,
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
        }),
      });

      if (!response.ok || !response.body) {
        let serverErrorMsg = 'Gagal mendapatkan respon dari server.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            serverErrorMsg = errData.error;
          }
        } catch {
          // fallback if response is not JSON
        }
        throw new Error(serverErrorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulatedText = '';
      let sseBuffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  accumulatedText = accumulatedText.replace(/<\|im_end\|>/g, '');
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: accumulatedText }
                        : msg
                    )
                  );
                } else if (parsed.error) {
                  accumulatedText += `\n\n*[Error: ${parsed.error}]*`;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: accumulatedText }
                        : msg
                    )
                  );
                }
              } catch {
                // ignore chunk parse errors
              }
            }
          }
        }
      }

      if (sseBuffer.trim().startsWith('data: ')) {
        const dataStr = sseBuffer.trim().slice(6);
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
              accumulatedText = accumulatedText.replace(/<\|im_end\|>/g, '');
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedText }
                    : msg
                )
              );
            }
          } catch { }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generasi respon dihentikan oleh pengguna.');
      } else {
        console.error('Chat error:', err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    err?.message ||
                    'Maaf, terjadi kesalahan saat menghubungkan ke SORA AI. Silakan coba lagi.',
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleNewChat = () => {
    setMessages([]);
    setText('');
    setCurrentSessionId(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  return (
    <div 
      className="flex flex-col h-[100dvh] max-h-[100dvh] bg-black text-[#ececec] font-sans overflow-hidden relative touch-pan-y"
    >
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpen={() => setIsSidebarOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout} 
        onNewChat={handleNewChat} 
        credits={credits}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotes={() => setIsNotesModalOpen(true)}
        onOpenAuth={() => {
          setAuthBannerMessage('');
          setShowAuthModal(true);
        }}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onSave={async (data: UserProfileData) => {
          if (currentUser) {
            const updatedUser = { ...currentUser, ...data };
            setCurrentUser(updatedUser);
            // Save to Firebase
            try {
              if (auth.currentUser) {
                try {
                  await updateProfile(auth.currentUser, {
                    displayName: data.name,
                    photoURL: data.avatar || ""
                  });
                } catch (authErr) {
                  console.warn("Auth updateProfile failed (usually due to base64 length), skipping:", authErr);
                }
              }
              await setDoc(doc(db, 'users', currentUser.email), { 
                name: data.name,
                avatar: data.avatar || ""
              }, { merge: true });
            } catch (err: any) {
              console.error("Save profile error", err);
              alert("Gagal menyimpan profil: " + err.message);
            }
          }
        }}
      />

      {fullscreenImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={() => setFullscreenImage(null)}>
          <button
            type="button"
            className="absolute top-4 right-4 z-[60] w-10 h-10 flex items-center justify-center bg-transparent text-white/70 hover:text-white transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <span className="mdi mdi-close-box-outline text-3xl leading-none"></span>
          </button>
          <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
            >
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <img src={fullscreenImage} alt="Fullscreen View" className="w-full h-[100dvh] object-contain" />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
      {/* Floating Top Header with Credit Balance (Center) and Action Icons (Right) */}
      <header className="absolute top-0 left-0 right-0 z-20 w-full pointer-events-none bg-gradient-to-b from-black/90 via-black/40 to-transparent pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-[calc(env(safe-area-inset-top)+1rem)] pb-8 px-3 sm:px-4">
        <div className="w-full max-w-3xl mx-auto flex justify-between items-center pointer-events-auto relative">
          {/* Left: Hamburger & Model Selector */}
          <div className="flex items-center gap-2">

            
            {/* Model Selector Custom Dropdown */}
            {availableModels.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="bg-transparent px-3 py-1.5 text-lg sm:text-xl font-normal text-white/80 cursor-pointer flex items-center justify-between gap-2 min-w-[120px] max-w-[150px] sm:max-w-[200px] hover:text-white transition-colors"
                >
                  <span className="truncate capitalize">{selectedModel.replace(/-/g, ' ')}</span>
                  <span className="mdi mdi-chevron-down text-white/60 text-sm"></span>
                </button>

                {isModelDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsModelDropdownOpen(false)}
                    ></div>
                    <div className="absolute top-full left-0 mt-2 w-max min-w-[150px] max-w-[250px] bg-[#212121] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex flex-col max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {availableModels.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-base sm:text-lg text-left rounded-lg transition-colors cursor-pointer ${
                              selectedModel === m.id ? 'bg-white/10 text-white font-normal' : 'text-white/70 hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate pr-4 capitalize">{m.id.replace(/-/g, ' ')}</span>
                            {selectedModel === m.id && (
                              <span className="mdi mdi-check text-white/80"></span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewChat}
              className="ml-1 sm:ml-2 w-10 h-10 sm:w-11 sm:h-11 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10 cursor-pointer flex items-center justify-center"
              title="Tulis Baru"
            >
              <span className="mdi mdi-square-edit-outline text-[26px] sm:text-[30px] leading-none"></span>
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10 cursor-pointer flex items-center justify-center ml-1"
              title="Buka Menu"
            >
              <Menu className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Area / Chat Area */}
      <main className="flex-1 flex flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)] sm:pt-[calc(env(safe-area-inset-top)+6rem)] pb-[calc(env(safe-area-inset-bottom)+12rem)] sm:pb-[calc(env(safe-area-inset-bottom)+13rem)] overflow-y-auto overscroll-none w-full max-w-3xl mx-auto custom-scrollbar">
        {messages.length > 0 && (
          <div className="flex-1 space-y-2.5 sm:space-y-4 py-1 sm:py-2">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex flex-col w-full ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {msg.role === 'assistant' && !msg.content ? (
                  <div className="flex items-center gap-2 py-1 px-1 text-white/75 text-xs sm:text-sm font-medium animate-pulse select-none">
                    <span>Harap Tunggu...</span>
                  </div>
                ) : (
                  <div
                    className={`min-w-0 px-4 py-2.5 sm:px-5 sm:py-3 text-base sm:text-lg leading-relaxed break-words [overflow-wrap:anywhere] ${
                      msg.role === 'user'
                        ? 'max-w-[88%] sm:max-w-[80%] bg-[#212121] text-white rounded-tl-none rounded-bl-2xl rounded-tr-2xl rounded-br-none shadow'
                        : 'w-full bg-black text-white/90 rounded-2xl rounded-bl-none shadow'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</div>
                    ) : (
                      <div className="text-base sm:text-lg leading-relaxed break-words [overflow-wrap:anywhere] min-w-0 space-y-2">
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          urlTransform={(value: string) => value}
                          components={{
                            p: ({ children }) => <div className="mb-2 last:mb-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap leading-relaxed">{children}</div>,
                            h1: ({ children }) => <h1 className="text-lg sm:text-xl font-bold text-[#EE7B35] mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base sm:text-lg font-bold text-[#EE7B35] mt-4 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm sm:text-base font-bold text-[#EE7B35] mt-4 mb-1 tracking-wide">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-xs sm:text-sm font-bold text-amber-400 mt-3 mb-1">{children}</h4>,
                            pre: ({ children }) => <>{children}</>,
                            code: CodeBlock,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-1">{children}</ol>,
                            li: ({ children }) => <li className="break-words [overflow-wrap:anywhere]">{children}</li>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2 max-w-full custom-scrollbar">
                                <table className="min-w-full divide-y divide-white/10 text-left text-xs sm:text-sm">{children}</table>
                              </div>
                            ),
                            img: ({ src, alt }) => src ? (
                              <div className="relative group w-full max-w-md my-3">
                                <img
                                  src={src}
                                  alt={alt}
                                  className="w-full aspect-square object-cover rounded-lg shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
                                  onClick={() => setFullscreenImage(src)}
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); downloadImage(src); }}
                                  className="absolute bottom-2 right-2 p-1 flex items-center justify-center text-white/90 hover:text-white hover:scale-105 transition-all cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                                  title="Download Gambar"
                                >
                                  <span className="mdi mdi-download-circle text-[34px] leading-none"></span>
                                </button>
                              </div>
                            ) : null,
                          }}
                        >
                          {msg.content.split('---SUGGESTIONS---')[0].trim()}
                        </Markdown>
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'assistant' && msg.content && !msg.content.startsWith('![Hasil Gambar]') && (!isLoading || idx < messages.length - 1) && (
                  <div className="flex justify-start items-center w-full pt-1 pl-4 sm:pl-5 mb-2 sm:mb-3 gap-2">
                    {msg.timestamp && (
                      <span className="text-[10px] text-white/30 pt-0.5 font-medium tracking-wide">
                        {msg.timestamp}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center justify-center w-7 h-7 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                        title="Salin pesan"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTTS(msg.id, msg.content)}
                        className={`flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-md transition-colors cursor-pointer ${playingAudioId === msg.id ? 'text-white/90' : 'text-white/50 hover:text-white/90'}`}
                        title={playingAudioId === msg.id ? "Berhenti" : "Bicara"}
                      >
                        {playingAudioId === msg.id ? (
                          <span className="mdi mdi-stop-circle-outline text-[18px]"></span>
                        ) : (
                          <span className="mdi mdi-volume-high text-base"></span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateMessage(msg.id, 'like')}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer ${ratedMessages[msg.id] === 'like' ? 'text-white/90 bg-white/10' : 'text-white/50 hover:text-white/90 hover:bg-white/10'}`}
                        title="Suka"
                        disabled={!!ratedMessages[msg.id]}
                      >
                        <span className={`mdi ${ratedMessages[msg.id] === 'like' ? 'mdi-thumb-up' : 'mdi-thumb-up-outline'} text-base`}></span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateMessage(msg.id, 'dislike')}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer ${ratedMessages[msg.id] === 'dislike' ? 'text-white/90 bg-white/10' : 'text-white/50 hover:text-white/90 hover:bg-white/10'}`}
                        title="Tidak Suka"
                        disabled={!!ratedMessages[msg.id]}
                      >
                        <span className={`mdi ${ratedMessages[msg.id] === 'dislike' ? 'mdi-thumb-down' : 'mdi-thumb-down-outline'} text-base`}></span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(msg.id, msg.content)}
                        className="flex items-center justify-center w-7 h-7 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                        title="Simpan ke Catatan"
                      >
                        {savedNoteId === msg.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="mdi mdi-share-variant text-base"></span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Suggestions Block */}
                {msg.role === 'assistant' && msg.content && msg.content.includes('---SUGGESTIONS---') && (!isLoading || idx < messages.length - 1) && (
                  <div className="flex flex-col gap-2.5 mt-7 pl-4 sm:pl-5 pb-1">
                    <span className="text-white/80 text-xs sm:text-sm font-medium tracking-wide">Follow up</span>
                    <div className="flex flex-col gap-1.5">
                      {msg.content.split('---SUGGESTIONS---')[1]
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 3)
                        .map(line => line.replace(/^[\-\*\d\.]+\s*/, ''))
                        .slice(0, 4)
                        .map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSendMessage(suggestion);
                            }}
                            className="text-xs sm:text-sm text-white/50 hover:text-white/80 transition-all text-left cursor-pointer break-words [overflow-wrap:anywhere]"
                          >
                            {suggestion}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {msg.role === 'user' && msg.content && (
                  <div className="flex justify-end items-center w-full pt-1 px-1 mb-1 gap-2">
                    {msg.timestamp && (
                      <span className="text-[10px] text-white/30 pt-0.5 font-medium tracking-wide">
                        {msg.timestamp}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/90 transition-colors pt-0.5 pb-0 px-1.5 sm:py-1 rounded cursor-pointer select-none"
                      title="Salin pesan"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <span className="text-xs text-white/75 font-medium">Tersalin</span>
                          <Check className="w-4 h-4 text-white/75" />
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Bottom Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 w-full pointer-events-none bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1.25rem)] px-3 sm:px-4">
        <div className="w-full max-w-3xl mx-auto pointer-events-auto">
          
          {/* Mini Waveform when AI is speaking */}
          {playingAudioId && (
            <div className="flex justify-center items-center h-6 mb-3 gap-1 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-[4px] bg-white/80 rounded-full animate-waveform"
                  style={{ 
                    animationDelay: `${i * 0.15}s`,
                    height: '10px'
                  }}
                />
              ))}
              <span className="text-white/80 text-xs ml-2 animate-pulse tracking-wide">
                Sora sedang bicara...
              </span>
            </div>
          )}

          <div className="relative flex items-center bg-[#1a1a1a] border border-white/10 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 transition-colors shadow-lg">
          
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 shrink-0 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Tambah Lampiran"
          >
            <span className="mdi mdi-plus text-2xl leading-none"></span>
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm sm:text-base text-white placeholder-white/40 py-[3px] px-2 sm:py-[5px] resize-none max-h-36 overflow-y-auto leading-relaxed custom-scrollbar disabled:opacity-50"
          />

          <div className="flex items-center gap-1 shrink-0 mr-0.5 sm:mr-1">

            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-1.5 sm:p-2.5 rounded-full transition-all bg-white text-black hover:bg-gray-200 cursor-pointer shadow-md flex items-center justify-center"
                title="Hentikan respon"
              >
                <Square className="w-4 h-4 fill-black text-black" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!text.trim()}
                className={`p-1.5 sm:p-2.5 rounded-full transition-all bg-white text-black ${
                  text.trim()
                    ? 'hover:bg-gray-200 cursor-pointer shadow-md'
                    : 'cursor-not-allowed opacity-60'
                }`}
                title="Kirim pesan"
              >
                <ArrowUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
          {/* Modal Fitur & Harga */}
          {showFeaturePricing && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFeaturePricing(false)}></div>
              <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-sm px-6 pb-6 pt-4 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <span className="mdi mdi-star-four-points text-[#EE7B35]"></span>
                    Sora Image 1.1
                  </h3>
                  <button onClick={() => setShowFeaturePricing(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                    <span className="mdi mdi-close text-xl"></span>
                  </button>
                </div>
                
                <div className="bg-[#212121] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-white/70 text-xs sm:text-sm">Harga per Gambar</span>
                  <span className="text-[#EE7B35] text-lg sm:text-xl font-bold">Rp 150</span>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <h4 className="text-white/90 text-sm font-medium border-b border-white/10 pb-2">Kemampuan Utama:</h4>
                  <ul className="flex flex-col gap-3">
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-camera-iris text-white shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Fotorealisme Tinggi:</strong> Ahli menghasilkan foto manusia, alam, atau objek yang terlihat nyata layaknya jepretan kamera profesional.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-format-text text-white shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Teks dalam Gambar:</strong> Mampu menuliskan teks, logo, atau papan nama di dalam gambar dengan ejaan yang sangat tepat dan presisi.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-palette text-white shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Ilustrasi & Seni Konsep:</strong> Sangat mahir menciptakan ilustrasi digital, desain grafis, hingga gaya anime dengan detail warna yang kaya.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-lightning-bolt text-white shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Generasi Super Kilat:</strong> Mampu memproses perintah (*prompt*) yang panjang dan kompleks hanya dalam hitungan detik.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Modal Fitur & Harga Pro */}
          {showProFeaturePricing && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProFeaturePricing(false)}></div>
              <div className="relative bg-[#1A1A1A] border border-amber-400/30 rounded-2xl w-full max-w-sm px-6 pb-6 pt-4 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <span className="mdi mdi-crown text-amber-400"></span>
                    <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent font-bold">Sora Image v1.2 Pro</span>
                  </h3>
                  <button onClick={() => setShowProFeaturePricing(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                    <span className="mdi mdi-close text-xl"></span>
                  </button>
                </div>
                
                <div className="bg-[#212121] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-white/70 text-xs sm:text-sm">Harga per Gambar</span>
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent text-lg sm:text-xl font-bold">Rp 1.100</span>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <h4 className="text-white/90 text-sm font-medium border-b border-white/10 pb-2">Kemampuan Utama:</h4>
                  <ul className="flex flex-col gap-3">
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-rocket-launch text-amber-500 shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Kecepatan Ultra:</strong> Model tercanggih dengan kecepatan pemrosesan super cepat tanpa mengorbankan kualitas.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-high-definition text-amber-500 shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Resolusi & Detail Maksimal:</strong> Menghasilkan gambar dengan detail luar biasa tajam, tekstur realistis, dan pencahayaan sinematik.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-format-color-text text-amber-500 shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Tipografi Presisi:</strong> Kemampuan mutlak dalam menyematkan teks panjang atau desain logo di dalam gambar tanpa cacat ejaan.</span>
                    </li>
                    <li className="flex gap-2.5 text-white/70 text-sm leading-relaxed">
                      <span className="mdi mdi-brain text-amber-500 shrink-0 mt-0.5 text-base"></span>
                      <span><strong>Pengertian Prompt Akurat:</strong> Memahami perintah bahasa alami yang sangat kompleks, mematuhi instruksi tata letak, dan komposisi dengan sempurna.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Notes Modal */}
          {isNotesModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-6 sm:pt-12">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={() => setIsNotesModalOpen(false)}></div>
              <div className="relative w-full max-w-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-in fade-in zoom-in duration-300 ease-out">
                
                <div className="overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 gap-4 animate-in fade-in duration-500">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5 relative">
                        <div className="absolute inset-0 rounded-full bg-white/10 blur-xl animate-pulse"></div>
                        <span className="mdi mdi-text-box-remove-outline text-4xl text-white/50 relative z-10"></span>
                      </div>
                      <div className="text-center">
                        <p className="text-white/80 font-semibold text-lg">Belum ada catatan</p>
                        <p className="text-white/40 text-sm mt-1 max-w-xs">Simpan potongan penting dari jawaban AI dengan mengeklik ikon Bagikan (Share) pada setiap pesan.</p>
                      </div>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="group relative">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                          
                          {/* Header inside the card: Date and Actions */}
                          <div className="flex items-center justify-between text-white/40 text-xs font-normal tracking-wider uppercase">
                            <div className="flex items-center gap-2">
                              <span>{new Date(note.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => handleCopy(note.id, note.content)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                                title="Salin Catatan"
                              >
                                {copiedId === note.id ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-white/50 hover:text-rose-400 transition-all cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <span className="mdi mdi-delete-outline text-lg"></span>
                              </button>
                            </div>
                          </div>

                          {/* Content inside the card */}
                          <div className={`text-white/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap overflow-hidden transition-all duration-300 ${expandedNotes.has(note.id) ? '' : 'line-clamp-4 max-h-32'}`}>
                            {note.content}
                          </div>

                          {/* Expand/Collapse Button */}
                          {(note.content.length > 200 || note.content.split('\n').length > 4) && (
                            <button 
                              onClick={() => {
                                setExpandedNotes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(note.id)) next.delete(note.id);
                                  else next.add(note.id);
                                  return next;
                                });
                              }}
                              className="mt-2 pt-2 border-t border-white/10 text-xs text-white/50 hover:text-white/80 flex items-center justify-center gap-1 w-full transition-colors"
                            >
                              <span>{expandedNotes.has(note.id) ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Seluruhnya'}</span>
                              <span className={`mdi ${expandedNotes.has(note.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'} text-sm`}></span>
                            </button>
                          )}

                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auth Modal (Login / Register) */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => {
              setShowAuthModal(false);
              setAuthBannerMessage('');
            }}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setAuthBannerMessage('');
            }}
            bannerMessage={authBannerMessage}
          />
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-white text-black text-sm font-medium rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <span className="mdi mdi-check-circle text-emerald-500 text-lg"></span>
              {toastMessage}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
