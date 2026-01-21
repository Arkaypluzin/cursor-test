'use client';

import { useState, useEffect } from 'react';
import { Card as CardType } from '@/types/database';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import { format } from 'date-fns';
import { datetimeLocalToISO, isoToDatetimeLocal } from '@/lib/utils/dateUtils';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CardType>) => Promise<{ error: string | null }>;
}

const COLOR_LABELS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
];

export function CardModal({ isOpen, onClose, card, onDelete, onUpdate }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [startDate, setStartDate] = useState(isoToDatetimeLocal(card.start_date));
  const [dueDate, setDueDate] = useState(isoToDatetimeLocal(card.due_date));
  const [colorLabel, setColorLabel] = useState(card.color_label || '');
  const [completed, setCompleted] = useState(!!card.completed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(card.title);
      setDescription(card.description || '');
      setStartDate(isoToDatetimeLocal(card.start_date));
      setDueDate(isoToDatetimeLocal(card.due_date));
      setColorLabel(card.color_label || '');
      setCompleted(!!card.completed);
    }
  }, [isOpen, card]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await onUpdate(card.id, {
        title,
        description: description || null,
        start_date: datetimeLocalToISO(startDate),
        due_date: datetimeLocalToISO(dueDate),
        color_label: colorLabel || null,
        completed,
        completed_at: completed ? (card.completed_at || new Date().toISOString()) : null,
      });
      if (error) {
        showNotification(error, 'error');
      } else {
        showNotification('Card updated successfully', 'success');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this card?')) {
      onDelete(card.id);
      onClose();
    }
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Card Details"
      footer={
        <>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            id="completed"
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
          />
          <label htmlFor="completed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Task completed (validated)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
            rows={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Due Date
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-trello-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          {card.due_date && (
            <p className={`mt-1 text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {format(new Date(card.due_date), 'PPpp')}
              {isOverdue && ' (Overdue)'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color Label
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setColorLabel('')}
              className={`px-3 py-1 rounded text-sm border ${
                !colorLabel
                  ? 'bg-gray-200 dark:bg-gray-600 border-gray-400'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
            >
              None
            </button>
            {COLOR_LABELS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setColorLabel(color.value)}
                className={`w-8 h-8 rounded border-2 ${
                  colorLabel === color.value
                    ? 'border-gray-800 dark:border-gray-200 scale-110'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
