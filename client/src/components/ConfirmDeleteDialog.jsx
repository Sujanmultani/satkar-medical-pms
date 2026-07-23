import React from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDeleteDialog({ isOpen, onClose, onConfirm, title, message, isLoading }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Confirm Deletion'}
      description="This action cannot be undone."
    >
      <div className="flex items-start gap-4 p-2 bg-red-50/50 rounded-xl border border-red-100">
        <div className="p-2 rounded-lg bg-red-100 text-error shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed font-medium">
          {message || 'Are you sure you want to delete this item? All associated batch data will also be permanently removed.'}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
