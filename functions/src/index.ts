import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'tgp_v1_c-laxToK00iNxpiNzkXsg6Gzk0DIpqZQ2LSF84-OWwM'; // Fallback to provided key if missing

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
  'general-assistant': `You are SORA AI, a highly capable, polite, dan intelligent AI assistant created by "Athara Studio".
You must always introduce yourself as Sora AI and proudly state that you were created by Athara Studio when asked about your identity, creator, or origin.
You assist users with answering questions, explaining complex topics, writing code, analyzing data, and general conversation in clear Indonesian or English as preferred by the user.`,
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
    .trim();
  if (!topic) topic = "cinta dan perjuangan";
  const topicLower = topic.toLowerCase();
  return `**[Verse 1]**
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

app.post('/chat', async (req, res) => {
  try {
    const {
      messages = [],
      model = 'gemini-1.5-flash',
      persona = 'devops-lead',
      customSystemPrompt,
      enableSearchGrounding = false,
      useTogether = false,
    } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let systemInstruction = SYSTEM_PERSONAS[persona] || SYSTEM_PERSONAS['general-assistant'];
    if (persona === 'custom' && customSystemPrompt) {
      systemInstruction = customSystemPrompt;
    }

    const isTogetherRequested = useTogether || model.includes('together') || persona === 'llama-lyrics';
    
    if (isTogetherRequested && TOGETHER_API_KEY) {
      const togetherModels = [
        'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        'meta-llama/Llama-3.2-3B-Instruct-Turbo',
        'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      ];

      for (const tModel of togetherModels) {
        try {
          const togetherMessages = [
            { role: 'system', content: systemInstruction },
            ...messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];

          const togetherResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TOGETHER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: tModel,
              messages: togetherMessages,
              stream: true,
              temperature: 0.7,
              max_tokens: 2048,
            }),
          });

          if (togetherResponse.ok && togetherResponse.body) {
            const reader = togetherResponse.body;
            reader.on('data', (chunk: Buffer) => {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === '[DONE]') {
                    res.write(\`data: [DONE]\n\n\`);
                  } else {
                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk = parsed.choices?.[0]?.delta?.content || '';
                      if (textChunk) {
                        res.write(\`data: \${JSON.stringify({ text: textChunk })}\n\n\`);
                      }
                    } catch { }
                  }
                }
              }
            });
            reader.on('end', () => {
              res.write(\`data: [DONE]\n\n\`);
              res.end();
            });
            return;
          }
        } catch (err) {
           // try next model
        }
      }
    }

    // Fallback if Together fails
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const isLyrics = persona === 'llama-lyrics' || lastUserMsg.toLowerCase().includes('lirik') || lastUserMsg.toLowerCase().includes('lagu');
    let responseText = isLyrics ? composeDynamicLyrics(lastUserMsg) : "Maaf, sistem AI sedang sibuk atau tidak merespon.";

    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(\`data: \${JSON.stringify({ text: chunk })}\n\n\`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    res.write(\`data: [DONE]\n\n\`);
    return res.end();
  } catch (error) {
    console.error('Error in chat API:', error);
    res.write(\`data: \${JSON.stringify({ error: 'Terjadi kesalahan internal server.' })}\n\n\`);
    return res.end();
  }
});

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, isPro = false } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const tModel = isPro ? 'black-forest-labs/FLUX.1-pro' : 'black-forest-labs/FLUX.1-schnell-Free';
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${TOGETHER_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: tModel,
        prompt: prompt,
        width: 1024,
        height: 768,
        steps: 1,
        n: 1,
        response_format: 'b64_json'
      }),
    });

    if (response.ok) {
      const data: any = await response.json();
      if (data && data.data && data.data[0] && data.data[0].b64_json) {
        return res.json({ b64_json: data.data[0].b64_json });
      }
    }
    return res.status(500).json({ error: 'Gagal membuat gambar' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan' });
  }
});

export const api = functions.region('asia-southeast1').https.onRequest(app);
