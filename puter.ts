import puter from 'puter';

export interface PuterUser {
  username: string;
  email?: string;
  uuid: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    description: 'Advanced multimodal AI with superior reasoning',
  },
  {
    id: 'claude-opus-4.6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    description: 'Most capable Claude model for complex tasks',
  },
  {
    id: 'gpt-5.3-chat',
    name: 'ChatGPT 5.3',
    provider: 'OpenAI',
    description: 'Latest GPT model with enhanced capabilities',
  },
];

class PuterService {
  private initialized = false;
  private currentUser: PuterUser | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await puter.auth.getUser();
      this.initialized = true;
    } catch (error) {
      this.initialized = true;
    }
  }

  async login(): Promise<PuterUser> {
    await this.initialize();
    const user = await puter.auth.signIn();
    this.currentUser = {
      username: user.username,
      email: user.email,
      uuid: user.uuid,
    };
    return this.currentUser;
  }

  async logout(): Promise<void> {
    await puter.auth.signOut();
    this.currentUser = null;
  }

  async getUser(): Promise<PuterUser | null> {
    if (this.currentUser) return this.currentUser;
    
    try {
      const user = await puter.auth.getUser();
      if (user) {
        this.currentUser = {
          username: user.username,
          email: user.email,
          uuid: user.uuid,
        };
        return this.currentUser;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async generateCode(prompt: string, model: string = 'gpt-5.3-chat'): Promise<string> {
    await this.initialize();
    
    const systemPrompt = `You are an expert Roblox Lua developer. Generate clean, efficient, and well-structured Lua code for Roblox games. Focus on best practices, performance, and maintainability. Do not include comments.`;
    
    try {
      const response = await puter.ai.chat(prompt, {
        model,
        system: systemPrompt,
      });
      
      return response;
    } catch (error) {
      throw new Error(`AI generation failed: ${error}`);
    }
  }

  async analyzeWorkspace(workspaceData: any, model: string = 'gpt-5.3-chat'): Promise<string> {
    await this.initialize();
    
    const prompt = `Analyze this Roblox workspace structure and provide insights:\n${JSON.stringify(workspaceData, null, 2)}`;
    
    try {
      const response = await puter.ai.chat(prompt, {
        model,
      });
      
      return response;
    } catch (error) {
      throw new Error(`Workspace analysis failed: ${error}`);
    }
  }

  async improveCode(code: string, model: string = 'gpt-5.3-chat'): Promise<string> {
    await this.initialize();
    
    const prompt = `Improve this Roblox Lua code. Make it more efficient, fix any issues, and enhance functionality. Return only the improved code without comments:\n\n${code}`;
    
    try {
      const response = await puter.ai.chat(prompt, {
        model,
      });
      
      return response;
    } catch (error) {
      throw new Error(`Code improvement failed: ${error}`);
    }
  }
}

export const puterService = new PuterService();

export async function getPublishedGamesCount(): Promise<number> {
  try {
    const stored = localStorage.getItem('published_games_count');
    return stored ? parseInt(stored) : 0;
  } catch {
    return 0;
  }
}

export async function incrementPublishedGames(): Promise<number> {
  const current = await getPublishedGamesCount();
  const newCount = current + 1;
  localStorage.setItem('published_games_count', newCount.toString());
  return newCount;
}