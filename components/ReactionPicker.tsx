'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  ImageList,
  ImageListItem,
  Chip,
  InputAdornment,
} from '@mui/material'
import { 
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { searchGifs, getTrendingGifs, SUGGESTED_SEARCHES, getGifUrl, ReactionGif } from '@/lib/tenor'

interface ReactionPickerProps {
  open: boolean
  onClose: () => void
  onSelectReaction: (category: string, emoji: string, gifUrl: string, gifId: string) => void
}

export default function ReactionPicker({ open, onClose, onSelectReaction }: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gifs, setGifs] = useState<ReactionGif[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && gifs.length === 0) {
      loadTrendingGifs()
    }
  }, [open])

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        loadGifs(searchQuery)
      }, 500) // Debounce search
      return () => clearTimeout(timeoutId)
    } else if (open) {
      loadTrendingGifs()
    }
  }, [searchQuery, open])

  const loadTrendingGifs = async () => {
    setLoading(true)
    const results = await getTrendingGifs(20)
    setGifs(results)
    setLoading(false)
  }

  const loadGifs = async (query: string) => {
    setLoading(true)
    const results = await searchGifs(query, 20)
    setGifs(results)
    setLoading(false)
  }

  const handleGifSelect = (gif: ReactionGif) => {
    const gifUrl = getGifUrl(gif)
    onSelectReaction(searchQuery || 'reaction', '🎉', gifUrl, gif.id)
    handleClose()
  }

  const handleClose = () => {
    setSearchQuery('')
    setGifs([])
    onClose()
  }

  const handleSuggestedSearch = (term: string) => {
    setSearchQuery(term)
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableScrollLock
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '80vh',
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
      }}>
        <Typography variant="h6" fontWeight="bold">
          Add Reaction GIF
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search for GIFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: '16px',
            },
          }}
          autoFocus
        />

        {/* Suggested Searches */}
        {!searchQuery && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Suggested:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {SUGGESTED_SEARCHES.map((term) => (
                <Chip
                  key={term}
                  label={term}
                  onClick={() => handleSuggestedSearch(term)}
                  size="small"
                  sx={{
                    borderRadius: '12px',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {loading ? (
          // Loading State
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          // GIF Grid
          <Box>
            <ImageList cols={2} gap={12} sx={{ my: 0 }}>
              {gifs.map((gif) => (
                <ImageListItem 
                  key={gif.id}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                  }}
                  onClick={() => handleGifSelect(gif)}
                >
                  <img
                    src={getGifUrl(gif)}
                    alt={gif.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '16px',
                    }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
            {gifs.length === 0 && !loading && (
              <Typography color="text.secondary" textAlign="center" py={4}>
                {searchQuery ? 'No GIFs found. Try another search.' : 'Start typing to search for GIFs'}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
