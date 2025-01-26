import { Dialog } from '@/components/ui/Dialog';

interface ConsentDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConsentDialog({ isOpen, onConfirm, onCancel }: ConsentDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-4">
        <h3 className="text-lg font-medium leading-6 text-white">
          Calendar Access Permission
        </h3>
        <p className="text-sm text-gray-300">
          TimeBridgeAI needs access to your Google Calendar to:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
          <li>View your calendar events</li>
          <li>Create and modify events on your behalf</li>
          <li>Help you manage your schedule efficiently</li>
        </ul>
        <p className="text-sm text-gray-300">
          We only access your calendar data when needed and never share it with third parties.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 
                     hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-primary 
                     text-white rounded-lg hover:bg-primary/90 
                     transition-colors"
          >
            Allow Access
          </button>
        </div>
      </div>
    </Dialog>
  );
} 