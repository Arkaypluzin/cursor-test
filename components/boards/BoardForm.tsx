'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import { Board } from '@/types/database';

const BOARD_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray', value: '#6b7280' },
];

interface BoardFormProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialColor?: string;
  onCreate?: (title: string, description?: string, color?: string) => Promise<{ data: Board | null; error: string | null }>;
  onUpdate?: (id: string, updates: Partial<Board>) => Promise<{ error: string | null }>;
}

export function BoardForm({ 
  isOpen, 
  onClose, 
  boardId,
  initialTitle = '',
  initialDescription = '',
  initialColor = ''
  ,
  onCreate,
  onUpdate
}: BoardFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [color, setColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (boardId) {
        if (!onUpdate) {
          showNotification('Update handler not provided', 'error');
          return;
        }
        const { error } = await onUpdate(boardId, { title, description: description || null, color: color || null });
        if (error) {
          showNotification(error, 'error');
        } else {
          showNotification('Board updated successfully', 'success');
          onClose();
        }
      } else {
        if (!onCreate) {
          showNotification('Create handler not provided', 'error');
          return;
        }
        const { error } = await onCreate(title, description, color);
        if (error) {
          showNotification(error, 'error');
        } else {
          showNotification('Board created successfully', 'success');
          setTitle('');
          setDescription('');
          setColor('');
          onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={boardId ? 'Edit Board' : 'Create New Board'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : boardId ? 'Update' : 'Create'}
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
            placeholder="Enter board title"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter board description"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Board color
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setColor('')}
              className={`px-3 py-1 rounded text-sm border ${
                !color
                  ? 'bg-gray-200 dark:bg-gray-600 border-gray-400'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
            >
              None
            </button>
            {BOARD_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded border-2 ${
                  color === c.value
                    ? 'border-gray-800 dark:border-gray-200 scale-110'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
