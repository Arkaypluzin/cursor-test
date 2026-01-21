'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { showNotification } from '@/lib/utils/notifications';

interface ListFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<{ data: any; error: string | null }>;
}

export function ListForm({ isOpen, onClose, onCreate }: ListFormProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await onCreate(title);
      if (error) {
        showNotification(error, 'error');
      } else {
        showNotification('List created successfully', 'success');
        setTitle('');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New List"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter list title"
            required
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
