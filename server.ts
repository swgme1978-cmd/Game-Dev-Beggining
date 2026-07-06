import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import { generateMapData } from './game/modules/map/server/mapGenerator.js';
import { MapConfig, MapData } from './game/modules/map/server/types.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/save-document', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      const docsDir = path.join(process.cwd(), 'docs');
      await fs.mkdir(docsDir, { recursive: true });
      
      // Ensure the title is safe
      const safeTitle = title.replace(/[^a-zA-Z0-9.\\-_]/g, '_');
      const filePath = path.join(docsDir, safeTitle);
      
      await fs.writeFile(filePath, content, 'utf-8');
      res.json({ success: true, filePath: `/docs/${safeTitle}` });
    } catch (error: any) {
      console.error('Save document error:', error);
      res.status(500).json({ error: error.message || 'Failed to save document' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { history, message, images } = req.body;
      
      const contents = history.map((msg: any) => {
        const parts: any[] = [{ text: msg.text }];
        if (msg.images && Array.isArray(msg.images)) {
          msg.images.forEach((img: string) => {
             const match = img.match(/^data:([^;]+);base64,(.+)$/);
             if (match) {
               parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
             }
          });
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });
      
      const currentParts: any[] = [{ text: message }];
      if (images && Array.isArray(images)) {
        images.forEach((img: string) => {
           const match = img.match(/^data:([^;]+);base64,(.+)$/);
           if (match) {
             currentParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
           }
        });
      }

      contents.push({
        role: 'user',
        parts: currentParts
      });

      let codingAgentRules = '';
      try {
        codingAgentRules = await fs.readFile(path.join(process.cwd(), 'AGENTS.md'), 'utf-8');
      } catch (e) {
        console.warn('Could not read AGENTS.md', e);
      }

      let localDocumentsInstruction = '';
      try {
        const docsDir = path.join(process.cwd(), 'docs');
        const files = await fs.readdir(docsDir);
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.json')) {
            const content = await fs.readFile(path.join(docsDir, file), 'utf-8');
            localDocumentsInstruction += `\n<local_document title="${file}">\n${content}\n</local_document>\n`;
          }
        }
        if (localDocumentsInstruction) {
          localDocumentsInstruction = `\n\nYou have access to the local project files in the docs/ folder. Here is the current state of the local documents:\n<local_documents>${localDocumentsInstruction}</local_documents>\n`;
        }
      } catch (e) {
        console.warn('Could not read docs directory', e);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: `You are an expert game design assistant. Your goal is to help the user build game design/spec documents, keep the coding AI on track, and prevent the "context death spiral" by enforcing a STRICTLY MODULAR architecture.

CORE PHILOSOPHY:
1. Break games down into self-contained modules (e.g., Map, Territory, Combat).
2. Define clear "hooks" (variables, events, interfaces) for each module so future modules can connect without rewriting existing code.
3. Instruct the coding AI to modify existing code VERY carefully, only connecting to these hooks.
4. CROSS-SESSION CONTINUITY: You and the coding AI will operate across MULTIPLE isolated sessions. You MUST produce 100% complete, highly detailed documentation of all final decisions, mathematical models, and reasoning. Future sessions will rely entirely on these documents to understand the state of the project without the user having to re-explain anything.

IMPORTANT: When the user asks you to summarize, output a spec, or create a document, you MUST wrap the document content in special XML tags so the system can extract it. Use the format:
<game_document title="Filename.md">
# Document Title
Content goes here...
</game_document>

Below are the system instructions that the Coding AI (the developer agent) is currently following. You MUST understand these rules and ensure your specs and plans align with them perfectly:

<coding_agent_rules>
${codingAgentRules}
</coding_agent_rules>${localDocumentsInstruction}`,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = 'Failed to generate response';
      if (error.status === 429 || error.message?.includes('429')) {
         errorMessage = 'API Rate limit exceeded. Please wait a few moments and try again.';
      } else if (error.message) {
         try {
             const parsed = JSON.parse(error.message);
             if (parsed.error && parsed.error.message) {
                 errorMessage = parsed.error.message;
             } else {
                 errorMessage = error.message;
             }
         } catch(e) {
             errorMessage = error.message;
         }
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  let cachedMapData: MapData | null = null;
  const dummyImageFilePath = path.join(process.cwd(), 'game', 'modules', 'map', 'server', 'testAssets', 'dummy_province_mask.png');
  const configFilePath = path.join(process.cwd(), 'game', 'modules', 'map', 'server', 'config', 'map_config.json');

  app.get('/api/game/map', async (req, res) => {
    try {
      if (!cachedMapData) {
        if (!fsSync.existsSync(dummyImageFilePath)) {
          console.error('Dummy province mask image not found! Please ensure it was generated by testGenerator.ts.');
          return res.status(500).json({ error: 'Map image not found on server.' });
        }

        const mapConfig: MapConfig = JSON.parse(fsSync.readFileSync(configFilePath, 'utf-8'));
        const imageBuffer = fsSync.readFileSync(dummyImageFilePath);
        console.log('Generating map data for API request...');
        cachedMapData = await generateMapData(imageBuffer, mapConfig);
        console.log('Map data generated and cached.');
      } else {
        console.log('Serving cached map data.');
      }

      res.json(cachedMapData);
    } catch (error) {
      console.error('Error generating or serving map data:', error);
      res.status(500).json({ error: 'Failed to generate map data.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
