import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Globe, Sparkles, Terminal, FileCode2, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, attachedFile?: { name: string; content: string }) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  enableSearchGrounding: boolean;
  onToggleSearchGrounding: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  enableSearchGrounding,
  onToggleSearchGrounding,
}) => {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;

    let fullText = input.trim();
    if (attachedFile) {
      fullText = `${fullText}\n\n\`\`\`${getFileLanguage(attachedFile.name)}\n// File: ${attachedFile.name}\n${attachedFile.content}\n\`\`\``.trim();
    }

    onSendMessage(fullText, attachedFile || undefined);
    setInput('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({ name: file.name, content });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getFileLanguage = (fileName: string) => {
    if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) return 'yaml';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.sh') || fileName.endsWith('.bash')) return 'bash';
    if (fileName.endsWith('.tf')) return 'hcl';
    if (fileName.toLowerCase().includes('dockerfile')) return 'dockerfile';
    return 'text';
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 pb-4 pt-2">
      {/* Attached File Pill Preview */}
      {attachedFile && (
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-[#2e2e34] text-xs text-emerald-300">
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-medium max-w-[200px] truncate">{attachedFile.name}</span>
          <span className="text-[10px] text-neutral-400">({(attachedFile.content.length / 1024).toFixed(1)} KB)</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-0.5 hover:text-white text-neutral-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form Pod */}
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl bg-[#2f2f2f]/40 border border-white/10 focus-within:border-white/30 transition-all overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask DevOps AI about Kubernetes, Terraform, Docker, CI/CD, or paste log traces..."
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-white placeholder-white/40 focus:outline-hidden resize-none leading-relaxed custom-scrollbar max-h-48"
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".yml,.yaml,.json,.sh,.bash,.tf,.log,.dockerfile,.txt,.js,.ts"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Bottom Actions Row */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
              title="Attach code snippet, YAML, script, or log file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Web Search Pill */}
            <button
              type="button"
              onClick={onToggleSearchGrounding}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                enableSearchGrounding
                  ? 'bg-blue-950/70 border-blue-600/60 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span>Search Web</span>
            </button>
          </div>

          {/* Submit or Stop Button */}
          <div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                title="Stop response generation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && !attachedFile}
                className={`p-2 rounded-xl transition-all ${
                  input.trim() || attachedFile
                    ? 'bg-white text-black hover:bg-neutral-200 font-bold shadow-md cursor-pointer'
                    : 'bg-white/10 text-white/20 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-3 text-center text-[11px] text-white/40">
        ChatGPT can make mistakes. Check important DevOps info.
      </div>
    </div>
  );
};
