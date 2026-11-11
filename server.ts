import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Gemini SDK with User-Agent header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback gastronomic translation glossary for 5-star hotel banqueting
const GASTRONOMIC_GLOSSARY: [RegExp, string][] = [
  [/tornedor de fil[eé] mignon/gi, 'prime beef filet mignon tournedos'],
  [/fil[eé] mignon/gi, 'filet mignon'],
  [/manteiga clarified de ervas|manteiga de ervas/gi, 'fine herb butter'],
  [/mousseline aveludada de mandioca/gi, 'velvety cassava mousseline'],
  [/mousseline/gi, 'mousseline'],
  [/trufas negras/gi, 'black truffles'],
  [/folha de ouro 24k/gi, '24k gold leaf'],
  [/folha de ouro/gi, 'gold leaf'],
  [/demi-glace laqueada ao vinho tinto de altitude/gi, 'high-altitude red wine glazed demi-glace'],
  [/demi-glace/gi, 'demi-glace'],
  [/vinho tinto/gi, 'red wine'],
  [/robalo chileno/gi, 'Chilean sea bass'],
  [/lombo de robalo selvagem/gi, 'wild sea bass loin'],
  [/robalo/gi, 'sea bass'],
  [/crosta crocante de pistaches torrados/gi, 'crispy roasted pistachio crust'],
  [/crosta de pistache/gi, 'pistachio crust'],
  [/velout[eé] de a[çc]afr[ãa]o espanhol/gi, 'velvety Spanish saffron velouté'],
  [/mini cenouras glaceadas/gi, 'glazed baby carrots'],
  [/arroz carnaroli/gi, 'Carnaroli rice'],
  [/risoto de tartufo nero/gi, 'black truffle risotto'],
  [/risoto/gi, 'risotto'],
  [/cogumelos silvestres da serra|cogumelos da serra/gi, 'wild mountain mushrooms'],
  [/cogumelos/gi, 'mushrooms'],
  [/azeite de ervas finas/gi, 'fine herb olive oil'],
  [/gnocchi artesanal de ab[oó]bora caboti[aá]/gi, 'handmade roasted kabocha squash gnocchi'],
  [/gnocchi artesanal/gi, 'handmade gnocchi'],
  [/fonduta bot[aâ]nica de castanhas/gi, 'botanical chestnut fondue'],
  [/nozes pecan caramelizadas/gi, 'candied pecans'],
  [/mille-feuille imp[eé]rial de baunilha bourbon/gi, 'Imperial Madagascar Bourbon vanilla mille-feuille'],
  [/mille-feuille/gi, 'mille-feuille'],
  [/creme diplomata/gi, 'diplomat cream'],
  [/pavlova tropical de frutas nobres/gi, 'tropical noble fruit pavlova'],
  [/pavlova/gi, 'pavlova'],
  [/mousse noir 80%/gi, 'whipped 80% grand cru dark chocolate mousse'],
  [/mousse de chocolate/gi, 'chocolate mousse'],
  [/flor de sal de gu[eé]rande/gi, 'Guérande fleur de sel'],
  [/frutas vermelhas da montanha/gi, 'wild mountain berries'],
  [/almo[çc]o executivo/gi, 'Executive Luncheon'],
  [/confraterniza[çc][ãa]o gastron[oô]mica exclusiva/gi, 'Exclusive Gastronomic Gathering'],
  [/alta c[uú]pula empresarial/gi, 'Executive Business Leadership'],
  [/almo[çc]o plen[aá]rio dos delegados e juristas/gi, 'Plenary Luncheon for Delegates and Jurists'],
  [/reuni[ãa]o do conselho de administra[çc][ãa]o/gi, 'Board of Directors Meeting'],
  [/painel de founders e rodada de parcerias/gi, 'Founders Panel and Partnerships Round'],
  [/identifique-se para visualizar as op[çc][õo]es e emitir sua comanda/gi, 'Please enter your name to view the menu options and issue your ticket'],
  [/bem-vindo ao almo[çc]o oficial/gi, 'Welcome to the official luncheon'],
  [/selecione seu prato para a sess[ãa]o gastron[oô]mica reservada/gi, 'Select your dish for the private dining session'],
  [/almo[çc]o buffet [aá]gil com pratos assinados pelo chef/gi, 'Express luncheon featuring signature chef creations'],
];

function fallbackTranslate(text: string): string {
  let result = text;
  for (const [pattern, replacement] of GASTRONOMIC_GLOSSARY) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Translation endpoint supporting Google Translate and Gemini IA
app.post('/api/translate', async (req, res) => {
  const { text, targetLang = 'en', context = 'dish', engine = 'gemini' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Texto não informado.' });
  }

  // 1. If Google Translate is selected
  if (engine === 'google') {
    try {
      const targetCode = targetLang === 'en' ? 'en' : 'pt';
      const sourceCode = targetLang === 'en' ? 'pt' : 'en';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text.trim())}`;
      
      const fetchRes = await fetch(url);
      if (fetchRes.ok) {
        const rawJson: any = await fetchRes.json();
        if (Array.isArray(rawJson) && Array.isArray(rawJson[0])) {
          const translatedChunks = rawJson[0].map((item: any) => item[0]).filter(Boolean).join('');
          if (translatedChunks.trim()) {
            return res.json({ translatedText: translatedChunks.trim(), source: 'google-translate' });
          }
        }
      }
    } catch (gErr: any) {
      console.warn('Google Translate API error, falling back:', gErr?.message);
    }
  }

  // 2. If Gemini IA is selected (or fallback)
  if (ai) {
    try {
      const targetLanguageName = targetLang === 'en' ? 'Inglês (English US)' : 'Português do Brasil (PT-BR)';
      const prompt = `Você é um tradutor executivo de alta gastronomia para o BH Raja Hotel.
Traduza o seguinte texto para ${targetLanguageName}.
Contexto: ${context === 'dish' ? 'Descrição culinária de prato/ingredientes' : 'Descrição/boas-vindas de evento'}.
IMPORTANTE:
- NUNCA altere títulos ou nomes próprios de pessoas/empresas.
- Preserve precisão de ingredientes e tom de hospitalidade.
- Devolva EXCLUSIVAMENTE a tradução final pura, sem aspas adicionais, sem preâmbulo, sem explicações.

Texto:
"${text.trim()}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const translatedText = response.text ? response.text.trim() : fallbackTranslate(text);
      return res.json({ translatedText, source: 'gemini-flash' });
    } catch (error: any) {
      console.warn('Gemini API call failed, using gastronomic translation engine:', error?.message);
      const fallback = fallbackTranslate(text);
      return res.json({ translatedText: fallback, source: 'gastronomic-engine' });
    }
  }

  // Fallback if no API key is set
  const translated = fallbackTranslate(text);
  return res.json({ translatedText: translated, source: 'gastronomic-engine' });
});

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hotel: 'BH Raja Hotel', aiReady: Boolean(ai) });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GarçON Server running at http://0.0.0.0:${PORT} [${isProduction ? 'prod' : 'dev'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
