import 'dotenv/config';
import { pipeline } from '@xenova/transformers';

let generatorPromise: Promise<any> | null = null;

export async function preloadModel() {
  if (!generatorPromise) {
    console.log('[PrysmisAI] Preloading embedded model...');
    generatorPromise = pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
      quantized: true,
    });
    await generatorPromise; // wait for it to finish loading
    console.log('[PrysmisAI] Embedded model is ready!');
  }
}

async function getGenerator() {
  if (!generatorPromise) {
    await preloadModel();
  }
  return generatorPromise;
}

interface ChatRequest {
  message: string;
  history?: any[];
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  images?: string[];
}

export async function callOllama(req: ChatRequest): Promise<string> {
  const gen = await getGenerator();

  let prompt = '';
  if (req.systemPrompt) {
    prompt += `<|im_start|>system\n${req.systemPrompt}<|im_end|>\n`;
  }
  
  if (req.history && req.history.length) {
    for (const msg of req.history) {
      const role = msg.isUser ? 'user' : 'assistant';
      prompt += `<|im_start|>${role}\n${msg.content}<|im_end|>\n`;
    }
  }
  
  prompt += `<|im_start|>user\n${req.message}<|im_end|>\n<|im_start|>assistant\n`;

  const output = await gen(prompt, {
    max_new_tokens: 256,
    temperature: 0.7,
    do_sample: true,
    top_p: 0.92,
    repetition_penalty: 1.15,
    return_full_text: false,
  });

  let text = output[0].generated_text.trim();
  if (!text || text.length < 3) {
    text = "Got it. How else can I help?";
  }
  return text;
}

export async function streamOllama(
  req: ChatRequest,
  onToken: (token: string) => void | Promise<void>,
  onDone: () => void | Promise<void>
) {
  const gen = await getGenerator();

  let prompt = '';
  if (req.systemPrompt) {
    prompt += `<|im_start|>system\n${req.systemPrompt}<|im_end|>\n`;
  }

  if (req.history && req.history.length) {
    for (const msg of req.history) {
      const role = msg.isUser ? 'user' : 'assistant';
      prompt += `<|im_start|>${role}\n${msg.content}<|im_end|>\n`;
    }
  }

  prompt += `<|im_start|>user\n${req.message}<|im_end|>\n<|im_start|>assistant\n`;

  const output = await gen(prompt, {
    max_new_tokens: 256,
    temperature: 0.7,
    do_sample: true,
    top_p: 0.92,
    repetition_penalty: 1.15,
    return_full_text: false,
  });

  let fullText = output[0].generated_text.trim();

  if (!fullText || fullText.length < 3) {
    fullText = "Got it. How can I help you with that?";
  }

  const words = fullText.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    await onToken(chunk);
  }

  await onDone();
}
