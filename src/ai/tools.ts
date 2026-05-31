export async function webSearch(query: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error('Search failed');

    const html = await res.text();
    const results: string[] = [];
    const regex = /<a[^>]+class="result__a"[^>]*>(.*?)<\/a>/g;
    let m;
    while ((m = regex.exec(html)) && results.length < 5) {
      const title = m[1].replace(/<[^>]+>/g, '');
      results.push(`• ${title}`);
    }
    return results.length ? `Search results for "${query}":\n${results.join('\n')}` : 'No good results found.';
  } catch (e: any) {
    return `Web search unavailable (${e.message}). Using built-in knowledge.`;
  }
}

export interface ImageResult {
  success: boolean;
  message: string;
  imageDataUrl?: string;
}

export async function generateImage(prompt: string): Promise<ImageResult> {
  const backendUrl = process.env.IMAGE_BACKEND_URL;
  if (!backendUrl) {
    return {
      success: false,
      message: 'No local image backend configured. I can still write you an excellent detailed prompt for Roblox thumbnails/concept art that you can use in ComfyUI or Automatic1111.'
    };
  }

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt + ', high quality, detailed',
        negative_prompt: 'blurry, low quality, text, watermark',
        steps: 20,
        width: 1024,
        height: 1024
      })
    });

    if (!res.ok) throw new Error(`Backend status ${res.status}`);

    const data = await res.json();
    const base64 = data.images?.[0];
    if (!base64) throw new Error('No image returned');

    return {
      success: true,
      message: 'Image generated using your local backend.',
      imageDataUrl: `data:image/png;base64,${base64}`
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Failed to generate image via local backend: ${e.message}`
    };
  }
}