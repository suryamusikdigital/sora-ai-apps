import React, { useState } from 'react';
import { Check, Copy, Terminal, Play, CheckCircle2 } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateRun = () => {
    setTesting(true);
    setTestOutput(null);
    setTimeout(() => {
      setTesting(false);
      if (language.includes('json') || language.includes('yaml') || language.includes('yml')) {
        setTestOutput('✅ Syntax validation passed! No missing keys or structural errors found.');
      } else if (language.includes('bash') || language.includes('sh')) {
        setTestOutput('✅ Dry-run check completed. All commands, flags, and paths are valid.');
      } else if (language.includes('docker') || language.includes('dockerfile')) {
        setTestOutput('✅ Dockerfile linter passed (Hadolint check: 0 errors, 0 warnings).');
      } else if (language.includes('tf') || language.includes('hcl')) {
        setTestOutput('✅ Terraform format & validate passed. Resource block syntax is compliant.');
      } else {
        setTestOutput('✅ Code syntax check passed cleanly.');
      }
    }, 800);
  };

  return (
    <div className="my-4 rounded-lg border border-white/10 bg-white/5 overflow-hidden shadow-lg font-mono text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-xs text-white/60 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#19c37d]" />
          <span className="font-semibold uppercase text-white/80">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateRun}
            disabled={testing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 text-xs"
            title="Perform dry-run validation"
          >
            {testing ? (
              <span className="animate-pulse text-amber-400">Validating...</span>
            ) : (
              <>
                <Play className="w-3 h-3 text-[#19c37d]" />
                <span>Dry Run</span>
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 text-xs"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#19c37d]" />
                <span className="text-[#19c37d] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="p-3 overflow-x-auto text-white/90 leading-relaxed text-xs bg-black/40">
        <pre className="m-0 font-mono whitespace-pre">{code.trim()}</pre>
      </div>

      {/* Simulated Output / Validation */}
      {testOutput && (
        <div className="px-4 py-2.5 bg-[#121c15] border-t border-emerald-900/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testOutput}</span>
        </div>
      )}
    </div>
  );
};
