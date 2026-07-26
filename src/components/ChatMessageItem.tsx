import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  User,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { CodeBlock } from './CodeBlock';

interface ChatMessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onRegenerate }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`py-6 px-4 md:px-6 w-full flex justify-center transition-colors border-b border-white/5 ${
        isUser ? 'bg-[#000000]' : 'bg-[#0a0a0a]'
      }`}
    >
      <div className="max-w-3xl w-full flex gap-4 md:gap-5">
        {/* Avatar Icon */}
        <div className="shrink-0">
          {isUser ? (
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              JD
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#19c37d] flex-shrink-0 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header metadata */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {isUser ? 'You' : 'ChatGPT'}
              </span>
              {!isUser && (
                <span className="px-1.5 py-0.5 rounded bg-[#19c37d]/10 border border-[#19c37d]/30 text-[10px] text-[#19c37d] font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {message.model || 'GPT-4o'}
                </span>
              )}
            </div>
            <span className="text-white/40 text-[11px]">{message.timestamp}</span>
          </div>

          {/* Reasoning / Thinking Process Toggle (If assistant and has thinking) */}
          {!isUser && message.thinkingProcess && (
            <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden my-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full px-3 py-2 text-xs font-medium text-white/60 hover:text-white flex items-center justify-between bg-white/5"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>DevOps Architecture Reasoning & Analysis</span>
                </div>
                {showThinking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showThinking && (
                <div className="p-3 text-xs font-mono text-white/80 bg-black/40 border-t border-white/10 leading-relaxed whitespace-pre-wrap">
                  {message.thinkingProcess}
                </div>
              )}
            </div>
          )}

          {/* Main Body Markdown */}
          <div className="prose prose-invert max-w-none text-white/90 text-sm md:text-base leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && (match || codeString.includes('\n'))) {
                    return <CodeBlock language={language} code={codeString} />;
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-xs border border-white/10"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-2 bg-white/5 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2.5 bg-black/40 border-t border-white/10 text-white/80">
                      {children}
                    </td>
                  );
                },
                ul({ children }) {
                  return <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>;
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#19c37d] underline hover:text-[#19c37d]/80"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content || ' '}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-2.5 h-2.5 ml-1 rounded-full bg-[#19c37d] animate-pulse" />
            )}
          </div>

          {/* Grounding Web Search Sources (if available) */}
          {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-white/60 font-medium mb-2">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Web Grounding Sources ({message.groundingSources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.groundingSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:text-white hover:border-[#19c37d]/50 transition-colors truncate max-w-[240px]"
                  >
                    🔗 {source.title || source.uri}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          {!isUser && !message.isStreaming && (
            <div className="flex items-center gap-2 pt-2 text-xs text-white/40 select-none">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 hover:text-white transition-colors"
                title="Copy full answer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#19c37d]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 hover:text-white transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
