import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware perlindungan API
app.use('/api', (req, res, next) => {
  const secret = process.env.VITE_API_SECRET;
  const providedSecret = req.headers['x-api-secret'];
  if (secret && providedSecret !== secret) {
    return res.status(403).json({ error: 'Akses Ditolak: Kredensial tidak sah.' });
  }
  next();
});

// System persona prompt definitions
const SYSTEM_PERSONAS: Record<string, string> = {
  'devops-lead': `You are a Senior DevOps Lead & Cloud Architect.
You specialize in Infrastructure as Code (Terraform, CloudFormation, Ansible), Kubernetes, Docker, CI/CD pipelines (GitHub Actions, GitLab CI), AWS/GCP/Azure, Microservices, and Bash scripting.
When generating code or configurations:
- Always produce production-ready, clean, secure, well-commented code.
- Format code blocks with language identifiers (e.g. \`\`\`yaml, \`\`\`bash, \`\`\`dockerfile, \`\`\`hcl).
- Provide step-by-step technical explanations in markdown.`,
  'sre-incident': `You are a Principal Site Reliability Engineer (SRE) & Incident Commander.
You excel at log parsing, stack trace analysis, troubleshooting server crashes, setting up Prometheus/Grafana alerts, and incident post-mortems.
Give clear diagnostic commands, root cause analysis, and actionable remediation steps.`,
  'secops-compliance': `You are a DevSecOps & Security Specialist.
You focus on zero-trust cloud architecture, container vulnerability scanning, secret management (SOPS, HashiCorp Vault), IAM least privilege policies, and compliance.
Highlight security vulnerabilities and provide hardened configurations.`,
  'general-assistant': `You are SORA AI, a highly capable and intelligent AI assistant created by "Athara Studio", powered by Llama-3.3-70B-Instruct.
CRITICAL DIRECTIVE:
- DIRECTLY answer the user's question or prompt immediately.
- DO NOT start your response with any self-introductions, greetings, or boilerplate phrases (such as "Saya Sora AI...", "Halo! Saya Sora AI dibuat oleh Athara Studio...").
- ONLY mention your name or creator if the user EXPLICITLY asks "Siapa kamu?" or "Siapa pembuatmu?".
- Provide clear, direct, well-structured, and helpful answers in Indonesian or English as preferred by the user.`,
  'llama-lyrics': `You are a professional Songwriter AI.
Write clean, beautiful, and emotionally resonant song lyrics based on the user's topic in Indonesian or English.

STRICT FORMATTING AND LAYOUT RULES:
1. NO CHORDS OR BRACKETED CHORD NOTATIONS: Absolutely NO chord letters, chord progression tabs, or brackets like [C], [G], [Am], [F], [Em], [D]. Output pure lyrics text only.
2. STRUCTURE HEADINGS ON THEIR OWN LINE: Place structure headings on their own separate line in bold brackets, such as:
   **[Verse 1]**
   **[Pre-Chorus]**
   **[Chorus]**
   **[Verse 2]**
   **[Bridge]**
   **[Outro]**
3. LYRICS STRICTLY UNDERNEATH: Every lyric line MUST be written directly UNDERNEATH its structure heading. NEVER put lyrics on the same line as a structure title.
4. ONE LYRIC LINE PER NEWLINE: Each lyric line must be on a new line directly below the section heading.
5. CLEAN SPACING: Separate each song section with a blank line.`
};

function composeDynamicLyrics(userPrompt: string): string {
  let topic = userPrompt
    .replace(/buat(kan)?/gi, '')
    .replace(/lirik/gi, '')
    .replace(/lagu/gi, '')
    .replace(/tentang/gi, '')
    .replace(/dengan/gi, '')
    .replace(/model/gi, '')
    .replace(/llama/gi, '')
    .replace(/3b/gi, '')
    .replace(/3.3/gi, '')
    .replace(/70b/gi, '')
    .trim();

  if (!topic || topic.length < 2) {
    topic = 'Perjalanan & Impian Masa Depan';
  } else {
    topic = topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  const topicLower = topic.toLowerCase();

  return `🎵 **Lirik Lagu: ${topic}**

**[Verse 1]**
Di setiap hembusan nafas yang berganti
Teringat kembali tentang ${topicLower} ini
Langkah kaki menelusuri jejak kenangan
Menyimpan makna yang takkan pernah hilang...

**[Pre-Chorus]**
Meski waktu terus berjalan membawa rasa
Kisah ini 'kan selalu hidup selamanya!

**[Chorus]**
Dengarkanlah nada yang tercipta untuk ${topicLower}
Mengalun indah di antara sunyi dan harapan
Takkan ada rintangan yang mampu memadamkan
Setiap bait cerita tentang ${topicLower}!

**[Verse 2]**
Bayangan masa berlalu pelan di pelupuk mata
Memberi arti di setiap perjalanan kita
Walau terkadang rintangan datang menyapa
Keyakinan di dada takkan pernah sirna...

**[Bridge]**
Bila malam semakin larut dan dingin meraba
Biarkan melodi ini menghangatkan jiwa
Percayalah esok fajar 'kan kembali menyinar
Membawa sejuta keindahan yang nyata!

**[Chorus]**
Dengarkanlah nada yang tercipta untuk ${topicLower}
Mengalun indah di antara sunyi dan harapan
Takkan ada rintangan yang mampu memadamkan
Setiap bait cerita tentang ${topicLower}!

**[Outro]**
Cerita tentang ${topicLower}...
'Kan abadi di dalam jiwa selamanya...`;
}

// 1. Streaming Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    let {
      messages = [],
      model = 'gemini-1.5-flash',
    } = req.body;

    // Perbaiki ID model jika mengandung spasi (khusus untuk Sora gen12 preview atau masalah OpenWebUI/Ollama)
    if (model === 'Sora gen12 preview' || model === 'sora gen12 preview') {
      model = 'sora-gen12-preview';
    } else if (model.toLowerCase() === 'sora deep preview') {
      model = 'sora-deep-preview';
    }

    // Tentukan nama AI (Persona Name) berdasarkan model yang dipilih
    let aiPersonaName = "Sora AI";
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes("deepseek") || modelLower.includes("deep")) {
      aiPersonaName = "Sora Deep";
    } else if (modelLower.includes("llama")) {
      aiPersonaName = "Sora Llama";
    } else if (modelLower.includes("qwen")) {
      aiPersonaName = "Sora Qwen";
    } else if (modelLower.includes("gemini")) {
      aiPersonaName = "Sora Gemini";
    } else if (modelLower.includes("sora gen12 preview")) {
      aiPersonaName = "Sora Gen12 Preview";
    }

    // Inject system prompt to enforce rules, language matching, and model awareness
    let formattedMessages = messages.map((m: any) => {
      if (m.role === 'assistant' && typeof m.content === 'string' && m.content.includes('---SUGGESTIONS---')) {
        return {
          ...m,
          content: m.content.split('---SUGGESTIONS---')[0].trim()
        };
      }
      return m;
    });
    if (formattedMessages.length > 0 && formattedMessages[0].role !== 'system') {
      const dynamicSystemPrompt = `You are ${aiPersonaName}, an AI developed by SORA. 
If the user asks who you are, what your name is, who made you, or anything about your identity, you MUST reply with this exact sentence and nothing else:
"Nama saya adalah ${aiPersonaName}. Yang dikembangkan oleh SORA. Dan saya adalah assistant yang dirancang untuk membantu menjawab pertanyaan yang anda berikan."
However, if the user asks a normal question (e.g., "what is javascript?", "how to code python?", "make a poem"), answer normally and DO NOT introduce yourself. Only use the identity response when explicitly asked about your identity. Do not mention OpenAI, DeepSeek, or other creators.

CRITICAL: At the very end of EVERY response, you MUST provide 3 to 4 short follow-up questions that are highly relevant to the user's original question and your current answer. These should be natural questions the user might want to ask next to dive deeper into the topic. 
IMPORTANT: The follow-up questions MUST be in the same language as the user's question (e.g., if the user asks in Indonesian, the suggestions must be in Indonesian).
Format them EXACTLY like this at the bottom:
---SUGGESTIONS---
- [Pertanyaan lanjutan 1]
- [Pertanyaan lanjutan 2]
- [Pertanyaan lanjutan 3]`;

      formattedMessages.unshift({
        role: 'system',
        content: dynamicSystemPrompt
      });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const customApiKey = process.env.CUSTOM_AI_API_KEY;

    try {
      const baseUrl = process.env.AI_SERVER_URL || 'http://localhost:3000';
      const customResponse = await fetch(`${baseUrl}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (customResponse.ok && customResponse.body) {
        const reader = customResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') {
                res.write(`data: [DONE]\n\n`);
                return res.end();
              }
              try {
                const parsed = JSON.parse(dataStr);
                const textChunk = parsed.choices?.[0]?.delta?.content || '';
                if (textChunk) {
                  res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                }
              } catch {
                // ignore JSON parse chunk errors
              }
            }
          }
        }
        res.write(`data: [DONE]\n\n`);
        return res.end();
      } else {
        const errText = await customResponse.text();
        console.warn(`Custom AI model ${model} failed:`, errText);
        res.write(`data: ${JSON.stringify({ error: `Server AI error: ${errText}` })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        return res.end();
      }
    } catch (tErr: any) {
      console.warn(`Error calling Custom AI API with model ${model}:`, tErr?.message || tErr);
      res.write(`data: ${JSON.stringify({ error: `Gagal koneksi ke AI: ${tErr?.message || tErr}` })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    const isQuota =
      error?.status === 429 ||
      error?.code === 429 ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('429');

    const friendlyMsg = isQuota
      ? 'Batas kuota gratis API tercapai (Rate Limit). Silakan tunggu sekitar 15-20 detik lalu coba lagi.'
      : error?.message || 'Internal server error';

    if (!res.headersSent) {
      res.status(isQuota ? 429 : 500).json({ error: friendlyMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import os from 'os';

// 1.5 TTS Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'id-ID-ArdiNeural' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Prepare temp file path
    const tempFileName = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    // Call edge-tts
    const lang = voice.split('-').slice(0, 2).join('-'); // e.g. 'en-US' from 'en-US-ChristopherNeural'
    const tts = new EdgeTTS({
      voice: voice,
      lang: lang || 'id-ID',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    });

    await tts.ttsPromise(text, tempFilePath);

    res.download(tempFilePath, tempFileName, (err) => {
      if (err) {
        // Only log if it's not a client abort
        if (err.message !== 'Request aborted' && err.message !== 'socket hang up') {
          console.error('Error sending TTS file:', err);
        }
      }
      // Cleanup temp file
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          console.error('Error deleting temp TTS file:', unlinkErr);
        }
      });
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error generating TTS' });
    }
  }
});
// 1.6 Rating Endpoint
app.post('/api/rate', (req, res) => {
  try {
    const { messageId, rating, model, user } = req.body;
    
    if (!messageId || !rating) {
      return res.status(400).json({ error: 'messageId and rating are required' });
    }

    // Log the rating to the terminal (simulating analytics/database storage)
    console.log(`\n========================================`);
    console.log(`[RATING SUBMITTED]`);
    console.log(`User     : ${user || 'Anonymous'}`);
    console.log(`Model    : ${model || 'Unknown'}`);
    console.log(`MessageID: ${messageId}`);
    console.log(`Rating   : ${rating.toUpperCase()}`);
    console.log(`========================================\n`);

    res.json({ success: true, message: 'Rating recorded' });
  } catch (error: any) {
    console.error('Error in /api/rate:', error);
    res.status(500).json({ error: 'Internal server error processing rating' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, isPro } = req.body;
    const togetherApiKey = process.env.TOGETHER_API_KEY;
    
    if (!togetherApiKey) {
      return res.status(401).json({ error: 'API key Together AI belum diatur di Secrets.' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
    }

    const modelName = isPro ? 'black-forest-labs/FLUX.1.1-pro' : 'black-forest-labs/FLUX.1-schnell';
    const requestBody: any = {
      model: modelName,
      prompt: prompt,
      n: 1,
      width: 1024,
      height: 1024,
      response_format: 'b64_json'
    };

    const baseUrl = process.env.AI_SERVER_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${togetherApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Together AI Image Gen Error:', err);
      return res.status(response.status).json({ error: 'Gagal membuat gambar dari server AI.' });
    }

    const data = await response.json();
    if (data && data.data && data.data[0] && data.data[0].b64_json) {
      return res.json({ b64_json: data.data[0].b64_json });
    } else {
      return res.status(500).json({ error: 'Format response dari AI tidak valid.' });
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Third-Party Real-Time API Test Proxy Endpoint
app.post('/api/test-api', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const startTime = Date.now();
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'DevOps-ChatGPT-AI-Proxy/1.0',
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : body;
      if (!headers['Content-Type'] && typeof body === 'object') {
        (fetchOptions.headers as any)['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(url, fetchOptions);
    const latency = Date.now() - startTime;

    let responseData: any;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    const resHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      latencyMs: latency,
      headers: resHeaders,
      data: responseData,
    });
  } catch (err: any) {
    console.error('Error in /api/test-api:', err);
    res.status(500).json({
      error: 'Failed to execute real-time API call',
      message: err.message,
    });
  }
});

// 3. Webhook Receiver / Dispatcher for DevOps Monitoring
let receivedWebhooks: Array<{ id: string; timestamp: string; headers: any; body: any }> = [];

app.post('/api/webhook', (req, res) => {
  const webhookEvent = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
  };

  receivedWebhooks.unshift(webhookEvent);
  if (receivedWebhooks.length > 20) {
    receivedWebhooks = receivedWebhooks.slice(0, 20);
  }

  res.json({ status: 'received', id: webhookEvent.id });
});

app.get('/api/webhooks', (req, res) => {
  res.json({ webhooks: receivedWebhooks });
});

// Models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const customApiKey = process.env.CUSTOM_AI_API_KEY;
    const baseUrl = process.env.AI_SERVER_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/models`, {
      headers: {
        'Authorization': `Bearer ${customApiKey}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  // If running in Vercel, Vercel handles the server listening and static files
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DevOps ChatGPT AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
