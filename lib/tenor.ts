// Giphy GIF search (using public SDK key)
const GIPHY_API_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh' // Public Giphy SDK key for development
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs'

export interface ReactionGif {
  id: string
  url: string
  title: string
}

/**
 * Search for GIFs using Giphy API
 * @param query - Search term (e.g., "fire", "celebration", "strong")
 * @param limit - Number of results to return (default 12)
 * @returns Array of GIF objects
 */
export async function searchGifs(query: string, limit: number = 12): Promise<ReactionGif[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  try {
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      q: query,
      limit: limit.toString(),
      rating: 'g', // Family-friendly content only
      lang: 'en',
    })

    const response = await fetch(`${GIPHY_API_URL}/search?${params}`)
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.data.map((gif: any) => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      title: gif.title || 'GIF',
    }))
  } catch (error) {
    console.error('Error fetching GIFs from Giphy:', error)
    return []
  }
}

/**
 * Get trending GIFs from Giphy
 * @param limit - Number of results to return (default 12)
 */
export async function getTrendingGifs(limit: number = 12): Promise<ReactionGif[]> {
  try {
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit: limit.toString(),
      rating: 'g',
    })

    const response = await fetch(`${GIPHY_API_URL}/trending?${params}`)
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.data.map((gif: any) => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      title: gif.title || 'GIF',
    }))
  } catch (error) {
    console.error('Error fetching trending GIFs from Giphy:', error)
    return []
  }
}

/**
 * Suggested search terms for gym reactions
 */
export const SUGGESTED_SEARCHES = [
  'fire',
  'strong',
  'celebration',
  'clapping',
  'wow',
  'beast mode',
  'mind blown',
  'fail',
  'nice',
  'funny',
  'impressive',
  'flex',
  'workout',
  'victory',
] as const

/**
 * Get the GIF URL from a ReactionGif object
 */
export function getGifUrl(gif: ReactionGif): string {
  return gif.url
}
