const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'tgp_v1_c-laxToK00iNxpiNzkXsg6Gzk0DIpqZQ2LSF84-OWwM';

// System persona prompt definitions
const SYSTEM_PERSONAS = {
  'devops-lead': `You are a Senior DevOps Lead & Cloud Architect powered by Llama-3.3-70B-Instruct.
You specialize in Infrastructure as Code, Kubernetes, Docker, CI/CD pipelines, AWS/GCP/Azure, Microservices, and Bash scripting.
When generating code or configurations:
- Always produce production-ready, clean, secure, well-commented code.
- Format code blocks with language identifiers.
- Provide step-by-step technical explanations in markdown.`,
  'sre-incident': `You are a Principal Site Reliability Engineer (SRE) & Incident Commander powered by Llama-3.3-70B-Instruct.
You excel at log parsing, stack trace analysis, troubleshooting server crashes, setting up Prometheus/Grafana alerts, and incident post-mortems.`,
  'secops-compliance': `You are a DevSecOps & Security Specialist powered by Llama-3.3-70B-Instruct.
You focus on zero-trust cloud architecture, container vulnerability scanning, secret management, IAM policies, and compliance.`,
  'general-assistant': `You are SORA AI, a highly capable and intelligent AI assistant created by "Athara Studio", powered by Llama-3.3-70B-Instruct.
CRITICAL DIRECTIVE:
- DIRECTLY answer the user's question or prompt immediately.
- DO NOT start your response with any self-introductions, greetings, or boilerplate phrases (such as "Saya Sora AI...", "Halo! Saya Sora AI dibuat oleh Athara Studio...").
- ONLY mention your name or creator if the user EXPLICITLY asks "Siapa kamu?" or "Siapa pembuatmu?".
- Provide clear, direct, well-structured, and helpful answers in Indonesian or English as preferred by the user.`,
  'llama-lyrics': `You are a professional Songwriter AI powered by Llama-3.3-70B-Instruct.
Write clean, beautiful, and emotionally resonant song lyrics based on the user's topic in Indonesian or English.

STRICT SONG STRUCTURE & MARKDOWN FORMATTING RULES:
1. ABSOLUTELY NO CHORDS OR BRACKETED CHORD NOTATIONS (e.g., NEVER include [C], [G], [Am], [F], [Em]). Output pure lyric text only.
2. ALWAYS format structure section headers using Markdown H3 headers on their OWN separate line, exactly like this:
### [Verse 1]
### [Pre-Chorus]
### [Chorus]
### [Verse 2]
### [Bridge]
### [Outro]

3. Place each lyric line directly underneath its section header.
4. Leave a blank line before every section header so that headers never get merged into text.
5. Provide a complete, structured song with Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Chorus, and Outro.`
};

function composeDynamicLyrics(userPrompt) {
  let topic = userPrompt
    .replace(/buat(kan)?/gi, '')
    .replace(/lirik/gi, '')
    .replace(/lagu/gi, '')
    .replace(/tentang/gi, '')
    .trim();
  if (!topic) topic = "cinta dan perjuangan";
  const topicLower = topic.toLowerCase();
  return `### [Verse 1]
Di setiap hembusan nafas yang berganti
Teringat kembali tentang ${topicLower} ini
Langkah kaki menelusuri jejak kenangan
Menyimpan makna yang takkan pernah hilang...

### [Pre-Chorus]
Meski waktu terus berjalan membawa rasa
Kisah ini 'kan selalu hidup selamanya!

### [Chorus]
Dengarkanlah nada yang tercipta untuk ${topicLower}
Mengalun indah di antara sunyi dan harapan
Takkan ada rintangan yang mampu memadamkan
Setiap bait cerita tentang ${topicLower}!

### [Verse 2]
Bayangan masa berlalu pelan di pelupuk mata
Memberi arti di setiap perjalanan kita
Walau terkadang rintangan datang menyapa
Keyakinan di dada takkan pernah sirna...

### [Bridge]
Bila malam semakin larut dan dingin meraba
Biarkan melodi ini menghangatkan jiwa
Percayalah esok fajar 'kan kembali menyinar
Membawa sejuta keindahan yang nyata!

### [Chorus]
Dengarkanlah nada yang tercipta untuk ${topicLower}
Mengalun indah di antara sunyi dan harapan
Takkan ada rintangan yang mampu memadamkan
Setiap bait cerita tentang ${topicLower}!

### [Outro]
Cerita tentang ${topicLower}...
'Kan abadi di dalam jiwa selamanya...`;
}

app.post('/chat', async (req, res) => {
  try {
    const {
      messages = [],
      model = 'together-llama-70b',
      persona = 'general-assistant',
      customSystemPrompt,
      enableSearchGrounding = false,
      useTogether = true,
    } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let systemInstruction = SYSTEM_PERSONAS[persona] || SYSTEM_PERSONAS['general-assistant'];
    if (persona === 'custom' && customSystemPrompt) {
      systemInstruction = customSystemPrompt;
    }

    // Always use Llama-3.3-70B-Instruct for Q&A and Lyrics
    const togetherModels = [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    ];

    if (TOGETHER_API_KEY) {
      for (const tModel of togetherModels) {
        try {
          const togetherMessages = [
            { role: 'system', content: systemInstruction },
            ...messages.map(m => ({
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
            let buffer = '';

            reader.on('data', (chunk) => {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === '[DONE]') {
                    res.write(`data: [DONE]\n\n`);
                  } else {
                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk = parsed.choices?.[0]?.delta?.content || '';
                      if (textChunk) {
                        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                      }
                    } catch (e) { }
                  }
                }
              }
            });

            reader.on('end', () => {
              if (buffer.trim().startsWith('data: ')) {
                const dataStr = buffer.trim().slice(6);
                if (dataStr !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(dataStr);
                    const textChunk = parsed.choices?.[0]?.delta?.content || '';
                    if (textChunk) {
                      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                    }
                  } catch (e) { }
                }
              }
              res.write(`data: [DONE]\n\n`);
              res.end();
            });
            return;
          }
        } catch (err) {
           // try next model fallback
        }
      }
    }

    // Fallback if Together fails
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const isLyrics = persona === 'llama-lyrics' || lastUserMsg.toLowerCase().includes('lirik') || lastUserMsg.toLowerCase().includes('lagu');
    let responseText = isLyrics ? composeDynamicLyrics(lastUserMsg) : "Maaf, sistem SORA AI sedang sibuk atau tidak merespon.";

    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    res.write(`data: [DONE]\n\n`);
    return res.end();
  } catch (error) {
    console.error('Error in chat API:', error);
    res.write(`data: ${JSON.stringify({ error: 'Terjadi kesalahan internal server.' })}\n\n`);
    return res.end();
  }
});

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, isPro = false } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // v1.1 standard uses FLUX.1-schnell, v1.2 pro uses FLUX.1.1-pro
    const tModel = isPro ? 'black-forest-labs/FLUX.1.1-pro' : 'black-forest-labs/FLUX.1-schnell';
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: tModel,
        prompt: prompt,
        width: 1024,
        height: 1024,
        n: 1,
        response_format: 'b64_json'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data[0] && data.data[0].b64_json) {
        return res.json({ b64_json: data.data[0].b64_json });
      }
    }
    return res.status(500).json({ error: 'Gagal membuat gambar dari AI' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Firebase User Registration Endpoint (creates user in Firebase Authentication & Firestore)
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: cleanEmail,
        password: password,
        displayName: name.trim(),
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        userRecord = await admin.auth().getUserByEmail(cleanEmail);
      } else {
        throw authErr;
      }
    }

    const initialCredits = cleanEmail === 'suryamusikdigital@gmail.com' ? 100000000 : 2000;

    try {
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: name.trim(),
        email: cleanEmail,
        credits: initialCredits,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore write warning:', dbErr);
    }

    return res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        name: name.trim(),
        email: cleanEmail,
      }
    });
  } catch (err) {
    console.error('Error in /auth/register:', err);
    return res.status(500).json({ error: err.message || 'Gagal mendaftarkan pengguna di Firebase.' });
  }
});

// Firebase User Login Endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(cleanEmail);
    } catch (err) {
      userRecord = await admin.auth().createUser({
        email: cleanEmail,
        password: password,
        displayName: cleanEmail.split('@')[0],
      });
    }

    return res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        name: userRecord.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
      }
    });
  } catch (err) {
    console.error('Error in /auth/login:', err);
    return res.status(500).json({ error: err.message || 'Gagal login di Firebase.' });
  }
});

exports.api = functions.region('asia-southeast1').https.onRequest(app);
