import React from 'react';
import {
  Menu,
  Plus,
  Globe,
  Radio,
  BookOpen,
  ChevronDown,
  Shield,
  Activity,
  Terminal,
  Settings as SettingsIcon,
} from 'lucide-react';
import { DevOpsPersona } from '../types';
import { DEVOPS_PERSONAS } from '../data/devopsPrompts';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  currentPersona: DevOpsPersona;
  onSelectPersona: (persona: DevOpsPersona) => void;
  enableSearchGrounding: boolean;
  onToggleSearchGrounding: () => void;
  onOpenApiHub: () => void;
  onOpenPromptLibrary: () => void;
  onOpenSettings: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleSidebar,
  onNewChat,
  currentPersona,
  onSelectPersona,
  enableSearchGrounding,
  onToggleSearchGrounding,
  onOpenApiHub,
  onOpenPromptLibrary,
  onOpenSettings,
}) => {
  const [personaMenuOpen, setPersonaMenuOpen] = React.useState(false);

  const getPersonaIcon = (p: DevOpsPersona) => {
    switch (p) {
      case 'sre-incident':
        return <Activity className="w-4 h-4 text-amber-400" />;
      case 'secops-compliance':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'custom':
        return <SettingsIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <Terminal className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full h-14 bg-[#000000] border-b border-white/10 px-4 md:px-6 flex items-center justify-between select-none">
      {/* Left section: Sidebar toggle & New Chat */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-medium transition-colors"
          title="Start new DevOps chat"
        >
          <Plus className="w-4 h-4 text-[#19c37d]" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Center: Model & DevOps Persona Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-medium text-white transition-colors"
        >
          {getPersonaIcon(currentPersona)}
          <span className="max-w-[140px] sm:max-w-[200px] truncate">
            {DEVOPS_PERSONAS[currentPersona]?.name || 'DevOps Persona'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-white/50" />
        </button>

        {personaMenuOpen && (
          <div
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-72 rounded-xl bg-[#0d0d0d] border border-white/15 shadow-2xl p-1 z-30 space-y-1"
            onMouseLeave={() => setPersonaMenuOpen(false)}
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase text-white/40 tracking-wider border-b border-white/10">
              Select DevOps AI Specialist
            </div>
            {(Object.keys(DEVOPS_PERSONAS) as DevOpsPersona[]).map((key) => {
              const item = DEVOPS_PERSONAS[key];
              const isSelected = currentPersona === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelectPersona(key);
                    setPersonaMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs flex items-start gap-2.5 transition-colors ${
                    isSelected ? 'bg-[#19c37d]/10 border border-[#19c37d]/30 text-[#19c37d]' : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="mt-0.5">{getPersonaIcon(key)}</div>
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right controls: Web Search, API Integration Hub, Prompt Library */}
      <div className="flex items-center gap-1.5">
        {/* Real-time Search Grounding Toggle */}
        <button
          onClick={onToggleSearchGrounding}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            enableSearchGrounding
              ? 'bg-blue-950/60 border-blue-600/50 text-blue-300'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
          title="Toggle live Google Search grounding for real-time web info"
        >
          <Globe className={`w-3.5 h-3.5 ${enableSearchGrounding ? 'text-blue-400 animate-pulse' : ''}`} />
          <span className="hidden lg:inline">Web Search</span>
          <span
            className={`w-2 h-2 rounded-full ${
              enableSearchGrounding ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-neutral-600'
            }`}
          />
        </button>

        {/* 3rd Party API Hub */}
        <button
          onClick={onOpenApiHub}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
          title="Open Third-Party API & Webhooks Testing Hub"
        >
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">API & Webhooks</span>
        </button>

        {/* Prompt Library */}
        <button
          onClick={onOpenPromptLibrary}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
          title="Open DevOps Prompt Templates"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Prompts</span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="System Persona & App Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
