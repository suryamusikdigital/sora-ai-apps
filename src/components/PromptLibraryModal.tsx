import React, { useState } from 'react';
import { X, BookOpen, Terminal, Sparkles, Send, Tag } from 'lucide-react';
import { PROMPT_TEMPLATES } from '../data/devopsPrompts';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string) => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  if (!isOpen) return null;

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Kubernetes', 'Docker', 'CI/CD', 'Terraform', 'Monitoring', 'Security'];

  const filteredPrompts =
    selectedCategory === 'All'
      ? PROMPT_TEMPLATES
      : PROMPT_TEMPLATES.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-3xl bg-[#0d0d10] border border-[#27272e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#222228] flex items-center justify-between bg-[#131317]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">DevOps Prompt Library</h2>
              <p className="text-xs text-neutral-400">
                Production-ready prompt engineering templates for Kubernetes, Docker, Terraform & CI/CD.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202026]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="p-3 bg-[#111114] border-b border-[#222228] flex items-center gap-1.5 overflow-x-auto text-xs custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-[#1a1a1e] text-neutral-400 hover:text-white border border-[#27272e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Prompts Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPrompts.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onSelectPrompt(item.prompt);
                onClose();
              }}
              className="p-4 rounded-xl bg-[#121215] border border-[#25252c] hover:border-amber-500/50 hover:bg-[#18181e] cursor-pointer transition-all flex flex-col justify-between group space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-100 group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1f1f26] flex items-center justify-between text-[11px] text-neutral-500 group-hover:text-neutral-300">
                <span className="truncate max-w-[200px] font-mono italic">"{item.prompt}"</span>
                <span className="flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Use Prompt</span>
                  <Send className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
