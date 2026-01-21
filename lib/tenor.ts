// Tenor GIF API integration
const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || ''
const TENOR_API_URL = 'https://tenor.googleapis.com/v2'

export interface TenorGif {
  id: string
  title: string
  media_formats: {
    gif?: {
      url: string
      dims: [number, number]
      size: number
    }
    tinygif?: {
      url: string
      dims: [number, number]
      size: number
    }
    nanogif?: {
      url: string
      dims: [number, number]
      size: number
    }
  }
  created: number
  content_description: string
  itemurl: string
  url: string
  tags: string[]
  flags: string[]
  hasaudio: boolean
}

export interface TenorSearchResponse {
  results: TenorGif[]
  next: string
}

/**
 * Search for GIFs using the Tenor API
 * @param query - Search term (e.g., "fire", "celebration", "fail")
 * @param limit - Number of results to return (default 8)
 * @returns Array of GIF objects
 */
export async function searchGifs(query: string, limit: number = 8): Promise<TenorGif[]> {
  if (!TENOR_API_KEY) {
    console.error('Tenor API key is missing')
    return []
  }

  try {
    const params = new URLSearchParams({
      q: query,
      key: TENOR_API_KEY,
      client_key: 'gym_tracker',
      limit: limit.toString(),
      media_filter: 'gif,tinygif',
      contentfilter: 'medium', // Filter out NSFW content
    })

    const response = await fetch(`${TENOR_API_URL}/search?${params}`)
    
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status}`)
    }

    const data: TenorSearchResponse = await response.json()
    return data.results
  } catch (error) {
    console.error('Error fetching GIFs from Tenor:', error)
    return []
  }
}

/**
 * Get featured/trending GIFs for a category
 * @param category - Category name (e.g., "excited", "strong", "celebration")
 * @param limit - Number of results to return (default 8)
 */
export async function getFeaturedGifs(category: string, limit: number = 8): Promise<TenorGif[]> {
  return searchGifs(category, limit)
}

/**
 * Predefined reaction categories for gym workouts
 */
export const REACTION_CATEGORIES = [
  { label: 'Fire', emoji: '🔥', query: 'fire excited' },
  { label: 'Strong', emoji: '💪', query: 'strong powerful' },
  { label: 'Celebration', emoji: '🎉', query: 'celebration victory' },
  { label: 'Clap', emoji: '👏', query: 'clapping applause' },
  { label: 'Impressive', emoji: '😮', query: 'impressive wow' },
  { label: 'Beast Mode', emoji: '😤', query: 'beast mode intense' },
  { label: 'Mind Blown', emoji: '🤯', query: 'mind blown shocked' },
  { label: 'Fail', emoji: '😅', query: 'fail oops' },
  { label: 'Nice', emoji: '😎', query: 'cool nice' },
  { label: 'Funny', emoji: '😂', query: 'funny hilarious' },
] as const

/**
 * Get the best GIF URL from a Tenor GIF object
 * Prefers smaller formats for faster loading
 */
export function getGifUrl(gif: TenorGif, size: 'small' | 'medium' | 'original' = 'medium'): string {
  const formats = gif.media_formats
  
  if (size === 'small') {
    return formats.nanogif?.url || formats.tinygif?.url || formats.gif?.url || ''
  }
  
  if (size === 'medium') {
    return formats.tinygif?.url || formats.gif?.url || ''
  }
  
  return formats.gif?.url || formats.tinygif?.url || ''
}
