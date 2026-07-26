import React, { useState, useEffect, useRef } from 'react';
import { Search, Folder, FileText } from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; email: string; username?: string; avatar?: string } | null;
  onLogout: () => void;
  onNewChat: () => void;
  credits: number;
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string, e: React.MouseEvent) => void;
  onOpenSettings?: () => void;
  onOpenNotes?: () => void;
  onOpen?: () => void;
  onOpenAuth?: () => void;
}


export function Sidebar({ isOpen, onClose, onOpen, currentUser, onLogout, onNewChat, credits, sessions = [], currentSessionId, onSelectSession, onDeleteSession, onOpenSettings, onOpenNotes, onOpenAuth }: SidebarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Close profile menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Optimized Touch Drag Logic with direct DOM manipulation (60fps)
  useEffect(() => {
    const maxSidebarWidth = 288; // w-72 = 288px
    let isDragging = false;
    let touchStartX: number | null = null;
    let hasMoved = false;
    let currentTranslate = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const clientX = e.touches[0].clientX;
      // If closed, only allow drag from the far left edge
      if (!isOpen && clientX > 40) return;
      touchStartX = clientX;
      isDragging = true;
      hasMoved = false;
      currentTranslate = isOpen ? 0 : -maxSidebarWidth;

      if (sidebarRef.current) sidebarRef.current.style.transition = 'none';
      if (overlayRef.current) overlayRef.current.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || touchStartX === null) return;
      hasMoved = true;
      const clientX = e.touches[0].clientX;
      
      let newTranslate;
      if (!isOpen) {
        // When closed, pull out faster (multiplier 1.6)
        const effectiveX = clientX * 1.6;
        newTranslate = effectiveX - maxSidebarWidth;
      } else {
        // When open, push in faster
        const diff = clientX - touchStartX;
        newTranslate = diff * 1.6;
      }
      newTranslate = Math.max(-maxSidebarWidth, Math.min(0, newTranslate));

      if (sidebarRef.current) {
        sidebarRef.current.style.transform = `translateX(${newTranslate}px)`;
      }
      if (overlayRef.current) {
        const openPercentage = 1 - (Math.abs(newTranslate) / maxSidebarWidth);
        overlayRef.current.style.opacity = openPercentage.toString();
        overlayRef.current.style.pointerEvents = openPercentage > 0 ? 'auto' : 'none';
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging || touchStartX === null) return;
      isDragging = false;
      const clientX = e.changedTouches[0].clientX;
      touchStartX = null;

      if (!hasMoved) return;

      // Clean up inline styles so React/Tailwind classes take over again
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = '';
        sidebarRef.current.style.transform = '';
      }
      if (overlayRef.current) {
        overlayRef.current.style.transition = '';
        overlayRef.current.style.opacity = '';
        overlayRef.current.style.pointerEvents = '';
      }

      // Check threshold based on absolute finger position
      if (isOpen) {
        // If they dragged it to the left enough
        if (clientX < maxSidebarWidth - 60) onClose();
      } else {
        // If they dragged it to the right enough
        if (clientX > 60 && onOpen) onOpen();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose, onOpen]);

  return (
    <>
      {/* Overlay for mobile */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 bg-black/60 z-[90] transition-opacity duration-200 backdrop-blur-sm ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-[100dvh] w-72 bg-[#0d0d0d] text-white/90 z-[100] transform transition-transform duration-200 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Logo & Search */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 h-16 shrink-0">
          <img src="/logo.png" alt="SORA" className="h-6 object-contain shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 px-3 py-1.5 text-white/80 bg-white/5 rounded-full border border-white/5 focus-within:border-white/20 transition-colors">
            <Search className="w-4 h-4 text-white/40 shrink-0" strokeWidth={2.5} />
            <input 
              type="text" 
              placeholder="Cari obrolan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-white/30 py-0.5"
            />
          </div>
        </div>

        {/* Main Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 custom-scrollbar">
          <button className="flex items-center gap-2.5 w-full px-3 py-2 text-white/80 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-lg">
            <span className="mdi mdi-folder-outline text-[22px] text-white/40 shrink-0"></span>
            Folders
          </button>
          <button 
            onClick={() => {
              if (onOpenNotes) onOpenNotes();
              onClose();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-white/80 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-lg"
          >
            <span className="mdi mdi-file-document-outline text-[22px] text-white/40 shrink-0"></span>
            Catatan
          </button>

          {/* Chat History */}
          <div className="mt-2 flex flex-col gap-0.5">
            {sessions.length > 0 ? (
              <>
                <div className="text-base text-white/40 px-3 py-2 font-medium">Riwayat Percakapan</div>
                {sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  sessions
                    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(session => (
                    <div key={session.id} className="relative group">
                      <button
                        onClick={() => onSelectSession && onSelectSession(session.id)}
                        className={`w-full text-left truncate px-3 py-2 pr-10 text-lg rounded-lg cursor-pointer transition-colors ${
                          currentSessionId === session.id
                            ? 'text-white font-medium'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        {session.title}
                      </button>
                      <button
                        onClick={(e) => onDeleteSession && onDeleteSession(session.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus riwayat"
                      >
                        <span className="mdi mdi-delete-outline text-sm"></span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/40 px-3 py-2 text-center mt-2">
                    Tidak ada hasil pencarian
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-white/40 px-3 py-2 text-center mt-4">
                Belum ada percakapan
              </div>
            )}
          </div>
        </div>

        {/* Bottom User Profile Section */}
        {currentUser && (
          <div className="relative p-3 shrink-0" ref={menuRef}>
            {/* Popup Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-[4.5rem] left-3 w-[calc(100%-1.5rem)] bg-[#262626] border border-white/10 rounded-2xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-10 flex flex-col gap-0.5">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {getInitials(currentUser.name)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate text-white">{currentUser.email}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-white/60 font-medium">Aktif</span>
                    </div>
                  </div>
                </div>



                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-1.5 text-white/80 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-base"
                >
                  <span className="mdi mdi-cog-outline text-[20px] text-white/50"></span>
                  Pengaturan
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-1.5 text-white/80 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-base">
                  <span className="mdi mdi-tune-variant text-[20px] text-white/50"></span>
                  Controls
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-1.5 text-white/80 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-base">
                  <span className="mdi mdi-archive-outline text-[20px] text-white/50"></span>
                  Obrolan yang Diarsipkan
                </button>

                <button className="flex items-center gap-3 w-full px-3 py-1.5 text-white/80 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-base">
                  <span className="mdi mdi-calendar-blank-outline text-[20px] text-white/50"></span>
                  Calendar
                </button>


                <button 
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-3 py-1.5 text-white/80 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-base mt-1"
                >
                  <span className="mdi mdi-logout text-[20px] text-white/50"></span>
                  Keluar
                </button>
              </div>
            )}

            {/* Profile Toggle Button */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors cursor-pointer relative"
            >
              <div className="flex items-center gap-3 min-w-0 w-full">
                {currentUser.avatar ? (
                  <div className="relative shrink-0">
                    <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f0f0f]"></div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0 relative">
                    {getInitials(currentUser.name)}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f0f0f]"></div>
                  </div>
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-normal truncate text-white/90">{currentUser.email}</span>
                  <div className="flex items-center gap-1 mt-1 text-white/70" title="Saldo Anda">
                    <span className="mdi mdi-wallet-outline text-white/70 text-sm leading-none"></span>
                    <span className="text-xs font-semibold">Rp. {credits.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {!currentUser && (
          <div className="p-3 shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => {
                if (onOpenAuth) onOpenAuth();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-2.5 rounded-xl text-sm shadow-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="mdi mdi-account-circle text-lg leading-none"></span>
              <span>Masuk / Daftar</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
