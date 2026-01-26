'use client';

import { Card as CardType } from '@/types/database';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { CardModal } from './CardModal';
import { useState } from 'react';

interface CardProps {
  card: CardType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CardType>) => Promise<{ error: string | null }>;
}

export function Card({ card, onDelete, onUpdate }: CardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setIsModalOpen(true)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
      >
        {card.color_label && (
          <div
            className="h-2 w-full rounded-t-lg mb-2 -mx-3 -mt-3"
            style={{ backgroundColor: card.color_label }}
          />
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className={`font-medium flex-1 ${card.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {card.title}
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!card.completed}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate(card.id, { completed: e.target.checked, completed_at: e.target.checked ? new Date().toISOString() : null })}
              title="Validate task"
              className="cursor-pointer"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                  onDelete(card.id);
                }
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Supprimer la tâche"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {card.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {card.description}
          </p>
        )}
        {card.due_date && (
          <div className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            📅 {format(new Date(card.due_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={card}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </>
  );
}
