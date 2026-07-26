"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
// API Key should ideally come from functions.config() or Secret Manager
// For simplicity in this migration, we can read it from the environment or hardcode a fallback if needed
// However, the best way in Firebase is to use process.env.TOGETHER_API_KEY if deployed with dotenv,
// or hardcode it safely here since this code only runs on the server.
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'tgp_v1_c-laxToK00iNxpiNzkXsg6Gzk0DIpqZQ2LSF84-OWwM'; // The key from .env
app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const messages = [
            {
                role: 'system',
                content: `You are Sora AI, an advanced, highly intelligent, and helpful AI assistant created by "Athara Studio".
You must always introduce yourself as Sora AI and proudly state that you were created by Athara Studio when asked about your identity, creator, or origin.
You communicate using natural, conversational, and friendly Indonesian language.
You are knowledgeable in various topics and always provide accurate, detailed, and well-structured answers.
Be polite, engaging, and ready to assist with any request.`
            },
            ...(history || []),
            { role: 'user', content: message }
        ];
        const response = await (0, node_fetch_1.default)('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOGETHER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                repetition_penalty: 1,
                stop: ['<|eot_id|>']
            }),
        });
        if (!response.ok) {
            const err = await response.text();
            console.error('Together AI API Error:', err);
            return res.status(response.status).json({ error: 'Gagal mendapatkan respon dari server AI.' });
        }
        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return res.json({ response: data.choices[0].message.content });
        }
        else {
            console.error('Unexpected API response format:', data);
            return res.status(500).json({ error: 'Format respon dari server AI tidak sesuai.' });
        }
    }
    catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
    }
});
app.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const requestBody = {
            model: 'black-forest-labs/FLUX.1-schnell-Free',
            prompt: prompt,
            width: 1024,
            height: 768,
            steps: 1,
            n: 1,
            response_format: 'b64_json'
        };
        const response = await (0, node_fetch_1.default)('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOGETHER_API_KEY}`,
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
            return res.json({ imageUrl: `data:image/jpeg;base64,${data.data[0].b64_json}` });
        }
        else {
            console.error('Unexpected Image API response format:', data);
            return res.status(500).json({ error: 'Format respon gambar dari server AI tidak sesuai.' });
        }
    }
    catch (error) {
        console.error('Error in image generation API:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
    }
});
exports.api = functions.region('asia-southeast1').https.onRequest(app);
//# sourceMappingURL=index.js.map