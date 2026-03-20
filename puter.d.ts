declare module 'puter' {
  interface PuterUser {
    username: string;
    email?: string;
  }

  interface PuterAI {
    chat(model: string, messages: Array<{ role: string; content: string }>): Promise<{ message: { content: string } }>;
  }

  interface PuterAuth {
    signIn(): Promise<PuterUser>;
    signOut(): Promise<void>;
    getUser(): Promise<PuterUser | null>;
  }

  interface PuterKV {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
  }

  interface Puter {
    ai: PuterAI;
    auth: PuterAuth;
    kv: PuterKV;
  }

  const puter: Puter;
  export default puter;
}
