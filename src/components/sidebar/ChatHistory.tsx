import { Box, List, ListItem, ListItemButton, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MessageIcon from '@mui/icons-material/Message';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  category?: 'recent' | 'gems';
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  selectedChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const ChatHistory = ({ sessions, selectedChat, onChatSelect, onNewChat }: ChatHistoryProps) => {
  const recentChats = sessions.filter(chat => !chat.category || chat.category === 'recent');
  const gemChats = sessions.filter(chat => chat.category === 'gems');

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      {/* New Chat Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          startIcon={<AddIcon />}
          onClick={onNewChat}
          variant="outlined"
          sx={{
            color: 'text.primary',
            borderColor: 'divider',
            justifyContent: 'flex-start',
            px: 2,
            py: 1,
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
            },
          }}
        >
          New chat
        </Button>
      </Box>

      {/* Recent Chats */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            Recent
            <ExpandMoreIcon fontSize="small" />
          </Typography>
        </Box>
        <List sx={{ pt: 0 }}>
          {recentChats.map((chat) => (
            <ListItem key={chat.id} disablePadding>
              <ListItemButton
                selected={selectedChat === chat.id}
                onClick={() => onChatSelect(chat.id)}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <MessageIcon sx={{ 
                    color: 'text.secondary',
                    fontSize: 20,
                    mt: 0.3
                  }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      sx={{ 
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'text.primary',
                        mb: 0.5
                      }}
                    >
                      {chat.title}
                    </Typography>
                    <Typography 
                      sx={{ 
                        fontSize: '13px',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chat.preview}
                    </Typography>
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Gems Section */}
        {gemChats.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1, mt: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                Gems
                <ExpandMoreIcon fontSize="small" />
              </Typography>
            </Box>
            <List sx={{ pt: 0 }}>
              {gemChats.map((chat) => (
                <ListItem key={chat.id} disablePadding>
                  <ListItemButton
                    selected={selectedChat === chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'background.paper',
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                      <MessageIcon sx={{ 
                        color: 'text.secondary',
                        fontSize: 20,
                        mt: 0.3
                      }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          sx={{ 
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'text.primary',
                            mb: 0.5
                          }}
                        >
                          {chat.title}
                        </Typography>
                        <Typography 
                          sx={{ 
                            fontSize: '13px',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {chat.preview}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChatHistory; 