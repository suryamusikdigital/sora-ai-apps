export type Role = 'user' | 'assistant' | 'system';

export type DevOpsPersona = 'devops-lead' | 'sre-incident' | 'secops-compliance' | 'custom';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  model?: string;
  groundingSources?: Array<{ title: string; uri: string }>;
  isStreaming?: boolean;
  thinkingProcess?: string;
  codeSnippets?: Array<{ language: string; code: string }>;
  apiActionResult?: {
    endpoint?: string;
    status?: number;
    data?: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  persona: DevOpsPersona;
  customSystemPrompt?: string;
  enableSearchGrounding?: boolean;
  pinned?: boolean;
}

export interface ApiIntegration {
  id: string;
  name: string;
  type: 'github' | 'slack' | 'pagerduty' | 'custom_webhook' | 'rest_api';
  endpointUrl: string;
  apiKeyOrToken?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  lastTestedAt?: string;
  lastStatus?: 'success' | 'failed' | 'idle';
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'Kubernetes' | 'CI/CD' | 'Docker' | 'Terraform' | 'Monitoring' | 'Security';
  prompt: string;
  description: string;
}
