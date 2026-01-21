// Pre-selected GIF reactions (no API key required!)

export interface ReactionGif {
  id: string
  url: string
  title: string
}

// Pre-curated GIFs from Giphy (these URLs work without API keys)
const REACTION_GIFS: Record<string, ReactionGif[]> = {
  'fire excited': [
    { id: '1', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Fire' },
    { id: '2', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', title: 'Fire Emoji' },
    { id: '3', url: 'https://media.giphy.com/media/QWaSVX9FizaxO/giphy.gif', title: 'On Fire' },
    { id: '4', url: 'https://media.giphy.com/media/3ohs4BSacFKI7A717y/giphy.gif', title: 'Flames' },
  ],
  'strong powerful': [
    { id: '5', url: 'https://media.giphy.com/media/l3q2Z6S6n38zjPswo/giphy.gif', title: 'Strong Arm' },
    { id: '6', url: 'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif', title: 'Flex' },
    { id: '7', url: 'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif', title: 'Power' },
    { id: '8', url: 'https://media.giphy.com/media/fdyZ3qI0GVZC0/giphy.gif', title: 'Beast Mode' },
  ],
  'celebration victory': [
    { id: '9', url: 'https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif', title: 'Celebrate' },
    { id: '10', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Party' },
    { id: '11', url: 'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif', title: 'Victory' },
    { id: '12', url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif', title: 'Yes!' },
  ],
  'clapping applause': [
    { id: '13', url: 'https://media.giphy.com/media/2xPGQCgJ72jHEevgCI/giphy.gif', title: 'Clapping' },
    { id: '14', url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif', title: 'Applause' },
    { id: '15', url: 'https://media.giphy.com/media/l3q2Z6S6n38zjPswo/giphy.gif', title: 'Clap' },
    { id: '16', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', title: 'Standing Ovation' },
  ],
  'impressive wow': [
    { id: '17', url: 'https://media.giphy.com/media/3o7527pa7qs9kCG78A/giphy.gif', title: 'Wow' },
    { id: '18', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', title: 'Mind Blown' },
    { id: '19', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', title: 'Impressed' },
    { id: '20', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', title: 'Amazing' },
  ],
  'beast mode intense': [
    { id: '21', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', title: 'Beast' },
    { id: '22', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', title: 'Intense' },
    { id: '23', url: 'https://media.giphy.com/media/sDcfxFDozb3bO/giphy.gif', title: 'Power Up' },
    { id: '24', url: 'https://media.giphy.com/media/BpGWitbFZflfSUYuZ9/giphy.gif', title: 'Beast Mode' },
  ],
  'mind blown shocked': [
    { id: '25', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', title: 'Mind Blown' },
    { id: '26', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', title: 'Shocked' },
    { id: '27', url: 'https://media.giphy.com/media/3o7527pa7qs9kCG78A/giphy.gif', title: 'OMG' },
    { id: '28', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', title: 'Wow' },
  ],
  'fail oops': [
    { id: '29', url: 'https://media.giphy.com/media/3o7527pa7qs9kCG78A/giphy.gif', title: 'Fail' },
    { id: '30', url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif', title: 'Oops' },
    { id: '31', url: 'https://media.giphy.com/media/HwmB7t7krGnao/giphy.gif', title: 'Epic Fail' },
    { id: '32', url: 'https://media.giphy.com/media/l3q2Z6S6n38zjPswo/giphy.gif', title: 'Fail Laugh' },
  ],
  'cool nice': [
    { id: '33', url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', title: 'Cool' },
    { id: '34', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Nice' },
    { id: '35', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', title: 'Smooth' },
    { id: '36', url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', title: 'Thumbs Up' },
  ],
  'funny hilarious': [
    { id: '37', url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', title: 'Funny' },
    { id: '38', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', title: 'LOL' },
    { id: '39', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', title: 'Hilarious' },
    { id: '40', url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', title: 'Laughing' },
  ],
}

/**
 * Get pre-selected GIFs for a reaction category (no API needed!)
 * @param query - Category query string
 * @returns Array of pre-selected GIF objects
 */
export async function searchGifs(query: string): Promise<ReactionGif[]> {
  // Return pre-selected GIFs for the category
  return REACTION_GIFS[query] || []
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
 * Get the GIF URL from a ReactionGif object
 */
export function getGifUrl(gif: ReactionGif): string {
  return gif.url
}
