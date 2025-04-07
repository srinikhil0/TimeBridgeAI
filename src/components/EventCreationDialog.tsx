import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { EventDetails, EventVisibility } from '../services/calendar/types';
import { eventCreator } from '../services/calendar/eventCreator';

interface EventCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
}

const EventCreationDialog: React.FC<EventCreationDialogProps> = ({
  open,
  onClose,
  onEventCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [endDateTime, setEndDateTime] = useState<Date>(new Date());
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [useGoogleMeet, setUseGoogleMeet] = useState(false);
  const [guests, setGuests] = useState<string[]>([]);
  const [newGuest, setNewGuest] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('default');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const eventDetails: EventDetails = {
        title,
        description,
        startDateTime,
        endDateTime,
        isAllDay,
        location,
        useGoogleMeet,
        guests: guests.map(email => ({ email })),
        visibility,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const result = await eventCreator.createEvent(eventDetails);

      if (result.success) {
        onEventCreated?.();
        onClose();
        resetForm();
      } else {
        setError(result.error || 'Failed to create event');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDateTime(new Date());
    setEndDateTime(new Date());
    setIsAllDay(false);
    setLocation('');
    setUseGoogleMeet(false);
    setGuests([]);
    setNewGuest('');
    setVisibility('default');
    setError(null);
  };

  const handleAddGuest = () => {
    if (newGuest && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newGuest)) {
      setGuests(prev => [...new Set([...prev, newGuest])]);
      setNewGuest('');
    }
  };

  const handleRemoveGuest = (guest: string) => {
    setGuests(prev => prev.filter(g => g !== guest));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={3}>
              {error && <Alert severity="error">{error}</Alert>}
              
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                  />
                }
                label="All Day Event"
              />

              <DateTimePicker
                label="Start Date & Time"
                value={startDateTime}
                onChange={(date) => date && setStartDateTime(date)}
                disabled={isSubmitting}
              />

              <DateTimePicker
                label="End Date & Time"
                value={endDateTime}
                onChange={(date) => date && setEndDateTime(date)}
                disabled={isSubmitting}
                minDateTime={startDateTime}
              />

              <TextField
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={useGoogleMeet}
                    onChange={(e) => setUseGoogleMeet(e.target.checked)}
                  />
                }
                label="Add Google Meet"
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Add Guest Email"
                  value={newGuest}
                  onChange={(e) => setNewGuest(e.target.value)}
                  fullWidth
                  type="email"
                />
                <Button onClick={handleAddGuest} disabled={!newGuest}>
                  Add
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {guests.map((guest) => (
                  <Chip
                    key={guest}
                    label={guest}
                    onDelete={() => handleRemoveGuest(guest)}
                    sx={{ margin: 0.5 }}
                  />
                ))}
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Visibility</InputLabel>
                <Select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as EventVisibility)}
                  label="Visibility"
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !title}
            >
              Create Event
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EventCreationDialog; 