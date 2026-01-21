'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import { Card } from '@/types/database';
import { datetimeLocalToISO } from '@/lib/utils/dateUtils';

interface CardFormProps {
  isOpen: boolean;
  onClose: () => void;
  cardId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialStartDate?: string;
  initialDueDate?: string;
  onCreate?: (title: string, description?: string, startDate?: string, dueDate?: string) => Promise<{ data: Card | null; error: string | null }>;
  onUpdate?: (id: string, updates: Partial<Card>) => Promise<{ error: string | null }>;
}

export function CardForm({
  isOpen,
  onClose,
  cardId,
  initialTitle = '',
  initialDescription = '',
  initialStartDate = '',
  initialDueDate = '',
  onCreate,
  onUpdate,
}: CardFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (cardId) {
        if (!onUpdate) {
          showNotification('Update handler not provided', 'error');
          return;
        }
        const { error } = await onUpdate(cardId, {
          title,
          description: description || null,
          start_date: datetimeLocalToISO(startDate),
          due_date: datetimeLocalToISO(dueDate),
        });
        if (error) {
          showNotification(error, 'error');
        } else {
          showNotification('Card updated successfully', 'success');
          onClose();
        }
      } else {
        if (!onCreate) {
          showNotification('Create handler not provided', 'error');
          return;
        }
        const { error } = await onCreate(
          title, 
          description, 
          datetimeLocalToISO(startDate) || undefined,
          datetimeLocalToISO(dueDate) || undefined
        );
        if (error) {
          showNotification(error, 'error');
        } else {
          showNotification('Card created successfully', 'success');
          setTitle('');
          setDescription('');
          setStartDate('');
          setDueDate('');
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
      title={cardId ? 'Edit Card' : 'Create New Card'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : cardId ? 'Update' : 'Create'}
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
            placeholder="Enter card title"
            required
            autoFocus
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
            placeholder="Enter card description"
            rows={4}
          />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            id="startDate"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Due Date
          </label>
          <input
            id="dueDate"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </form>
    </Modal>
  );
}
