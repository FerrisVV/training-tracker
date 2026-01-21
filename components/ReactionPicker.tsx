'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  ImageList,
  ImageListItem,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { searchGifs, REACTION_CATEGORIES, getGifUrl, ReactionGif } from '@/lib/tenor'

interface ReactionPickerProps {
  open: boolean
  onClose: () => void
  onSelectReaction: (category: string, emoji: string, gifUrl: string, gifId: string) => void
}

export default function ReactionPicker({ open, onClose, onSelectReaction }: ReactionPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [gifs, setGifs] = useState<ReactionGif[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCategory) {
      loadGifs(selectedCategory)
    }
  }, [selectedCategory])

  const loadGifs = async (query: string) => {
    setLoading(true)
    const results = await searchGifs(query)
    setGifs(results)
    setLoading(false)
  }

  const handleCategorySelect = (category: typeof REACTION_CATEGORIES[number]) => {
    setSelectedCategory(category.query)
  }

  const handleGifSelect = (gif: ReactionGif) => {
    const category = REACTION_CATEGORIES.find(c => c.query === selectedCategory)
    if (category) {
      const gifUrl = getGifUrl(gif)
      onSelectReaction(category.label, category.emoji, gifUrl, gif.id)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedCategory(null)
    setGifs([])
    onClose()
  }

  const handleBack = () => {
    setSelectedCategory(null)
    setGifs([])
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedCategory && (
            <IconButton size="small" onClick={handleBack}>
              ←
            </IconButton>
          )}
          <Typography variant="h6" fontWeight="bold">
            {selectedCategory ? 'Choose a GIF' : 'Add Reaction'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {!selectedCategory ? (
          // Category Selection
          <Stack spacing={1.5}>
            {REACTION_CATEGORIES.map((category) => (
              <Button
                key={category.label}
                variant="outlined"
                onClick={() => handleCategorySelect(category)}
                sx={{
                  py: 1.5,
                  borderRadius: '16px',
                  justifyContent: 'flex-start',
                  fontSize: '1rem',
                  textTransform: 'none',
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" component="span">
                    {category.emoji}
                  </Typography>
                  <Typography variant="body1" fontWeight="500">
                    {category.label}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Stack>
        ) : loading ? (
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
            {gifs.length === 0 && (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No GIFs found. Try another category.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
