import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Globe,
  Terminal,
  Activity,
  Code2,
} from 'lucide-react';
import { ApiIntegration } from '../types';

interface ApiIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendApiDataToChat: (prompt: string) => void;
}

export const ApiIntegrationModal: React.FC<ApiIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSendApiDataToChat,
}) => {
  if (!isOpen) return null;

  const [integrations, setIntegrations] = useState<ApiIntegration[]>([
    {
      id: 'gh-1',
      name: 'GitHub Repo Status',
      type: 'github',
      endpointUrl: 'https://api.github.com/repos/octocat/Hello-World',
      enabled: true,
    },
    {
      id: 'custom-1',
      name: 'DevOps Health Check',
      type: 'rest_api',
      endpointUrl: '/api/health',
      enabled: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'tester' | 'webhooks'>('tester');

  // Interactive REST Tester state
  const [testUrl, setTestUrl] = useState('https://api.github.com/repos/octocat/Hello-World');
  const [testMethod, setTestMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [testHeaders, setTestHeaders] = useState('{"Accept": "application/vnd.github.v3+json"}');
  const [testBody, setTestBody] = useState('{\n  "event": "ping"\n}');
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inbound Webhooks state
  const [receivedWebhooks, setReceivedWebhooks] = useState<any[]>([]);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (data.webhooks) {
        setReceivedWebhooks(data.webhooks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteApiCall = async () => {
    setLoading(true);
    setApiResult(null);
    setErrorMsg(null);

    try {
      let parsedHeaders = {};
      if (testHeaders.trim()) {
        try {
          parsedHeaders = JSON.parse(testHeaders);
        } catch (e) {
          throw new Error('Invalid JSON format in Headers input.');
        }
      }

      let parsedBody = undefined;
      if (testMethod !== 'GET' && testBody.trim()) {
        try {
          parsedBody = JSON.parse(testBody);
        } catch (e) {
          parsedBody = testBody;
        }
      }

      const res = await fetch('/api/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testUrl,
          method: testMethod,
          headers: parsedHeaders,
          body: parsedBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to call API proxy');
      }

      setApiResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error making API request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToAI = () => {
    if (!apiResult) return;
    const promptText = `I have executed a real-time third-party API call to \`${testUrl}\` (${testMethod}). Here is the server response:\n\n\`\`\`json\n${JSON.stringify(
      apiResult,
      null,
      2
    )}\n\`\`\`\n\nPlease analyze this API response, check for status errors, performance latency, and provide a summary with any recommended DevOps or code actions.`;

    onSendApiDataToChat(promptText);
    onClose();
  };

  const handleCopyResult = () => {
    if (apiResult) {
      navigator.clipboard.writeText(JSON.stringify(apiResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl bg-[#0d0d10] border border-[#27272e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#222228] flex items-center justify-between bg-[#131317]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-700/50 text-purple-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Third-Party Real-Time API & Webhooks Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  Proxy Active
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Execute live HTTP calls to external services (GitHub, Slack, PagerDuty, REST) & analyze data with SORA AI.
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

        {/* Navigation Tabs */}
        <div className="px-4 bg-[#111114] border-b border-[#222228] flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('tester')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tester'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Real-Time REST API Executor</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('webhooks');
              fetchWebhooks();
            }}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'webhooks'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Inbound Webhooks Log ({receivedWebhooks.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeTab === 'tester' && (
            <div className="space-y-4">
              {/* Request Configuration Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-2">
                  <select
                    value={testMethod}
                    onChange={(e: any) => setTestMethod(e.target.value)}
                    className="w-full bg-[#18181c] border border-[#2a2a32] rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-hidden focus:border-purple-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://api.github.com/... or https://your-server/api/..."
                    className="w-full bg-[#18181c] border border-[#2a2a32] rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={handleExecuteApiCall}
                    disabled={loading || !testUrl.trim()}
                    className="w-full h-full min-h-[36px] bg-purple-600 hover:bg-purple-500 disabled:bg-[#25252b] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    {loading ? (
                      <span className="animate-pulse">Calling...</span>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Headers & Body Accordion/Textareas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Headers (JSON Object)
                  </label>
                  <textarea
                    rows={3}
                    value={testHeaders}
                    onChange={(e) => setTestHeaders(e.target.value)}
                    className="w-full bg-[#121215] border border-[#27272e] rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
                  />
                </div>

                {testMethod !== 'GET' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Request Body (JSON / Raw)
                    </label>
                    <textarea
                      rows={3}
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full bg-[#121215] border border-[#27272e] rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Live Response Result Viewer */}
              {apiResult && (
                <div className="rounded-xl bg-[#121215] border border-[#27272e] overflow-hidden space-y-2">
                  <div className="p-3 bg-[#18181d] border-b border-[#27272e] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          apiResult.ok
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        Status: {apiResult.status} {apiResult.statusText}
                      </span>
                      <span className="text-neutral-400">Latency: {apiResult.latencyMs}ms</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyResult}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#25252b] hover:bg-[#303038] text-neutral-200"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Response'}</span>
                      </button>

                      <button
                        onClick={handleSendToAI}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-semibold shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Analyze with DevOps AI</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs text-emerald-300 bg-[#09090b]">
                    <pre>{JSON.stringify(apiResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#16161a] border border-[#27272e] text-xs text-neutral-300 space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Webhook Endpoint URL</span>
                </div>
                <div className="font-mono bg-[#0c0c0e] p-2 rounded border border-[#2a2a30] text-emerald-400 select-all">
                  {window.location.origin}/api/webhook
                </div>
                <p className="text-[11px] text-neutral-400">
                  Send POST requests to this URL from GitHub, Slack, Docker Hub, or PagerDuty to capture real-time events.
                </p>
              </div>

              {receivedWebhooks.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-[#27272e] rounded-xl">
                  No webhooks received yet. Send a test POST payload to <code>/api/webhook</code> to log events!
                </div>
              ) : (
                <div className="space-y-2">
                  {receivedWebhooks.map((wh) => (
                    <div
                      key={wh.id}
                      className="p-3 rounded-xl bg-[#121215] border border-[#25252c] text-xs space-y-2 font-mono"
                    >
                      <div className="flex items-center justify-between text-neutral-400 border-b border-[#222228] pb-1.5">
                        <span className="text-emerald-400 font-semibold">{wh.id}</span>
                        <span>{wh.timestamp}</span>
                      </div>
                      <div className="bg-[#09090b] p-2 rounded text-neutral-300 text-[11px] max-h-32 overflow-y-auto">
                        <pre>{JSON.stringify(wh.body, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
