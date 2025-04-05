import { Box, TextField, IconButton, Tooltip, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import ImageIcon from '@mui/icons-material/Image';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

const ChatInput = ({ value, onChange, onSend }: ChatInputProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend();
  };

  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      {/* Feature Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 2,
        }}
      >
      </Box>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder="Message TimeBridgeAI..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default',
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: 'divider',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
          InputProps={{
            endAdornment: (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
                <Tooltip title="Voice input">
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <MicIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Add image">
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <ImageIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          }}
        />
        <IconButton
          type="submit"
          disabled={!value.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'background.paper',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'text.disabled',
            },
            height: 56,
            width: 56,
          }}
        >
          <SendIcon />
        </IconButton>
      </form>
    </Box>
  );
};

export default ChatInput; 