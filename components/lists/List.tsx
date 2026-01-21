'use client';

import { useCards } from '@/lib/hooks/useCards';
import { List as ListType } from '@/types/database';
import { Card } from '../cards/Card';
import { CardForm } from '../cards/CardForm';
import { Button } from '../ui/Button';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ListProps {
  list: ListType;
  onUpdate: (id: string, updates: Partial<ListType>) => void;
  onDelete: (id: string) => void;
  onCardReorder: (cardId: string, newOrder: number) => void;
}

function SortableList({ list, onUpdate, onDelete, onCardReorder, children }: ListProps & { children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 min-w-[280px] flex flex-col max-h-[calc(100vh-200px)]"
    >
      {children}
    </div>
  );
}

export function List({ list, onUpdate, onDelete, onCardReorder }: ListProps) {
  const { cards, loading, createCard, updateCard, deleteCard, reorderCards } = useCards(list.id);
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);

      const newOrder = arrayMove(cards, oldIndex, newIndex);
      const updates = newOrder.map((card, index) => ({
        id: card.id,
        order_index: index,
      }));

      reorderCards(updates);
    }
  };

  const handleTitleBlur = () => {
    if (listTitle.trim() && listTitle !== list.title) {
      onUpdate(list.id, { title: listTitle });
    } else {
      setListTitle(list.title);
    }
    setEditingTitle(false);
  };

  return (
    <SortableList list={list} onUpdate={onUpdate} onDelete={onDelete} onCardReorder={onCardReorder}>
      <div className="flex items-center justify-between mb-4">
        {editingTitle ? (
          <input
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
            className="flex-1 px-2 py-1 font-semibold text-gray-900 dark:text-white bg-transparent border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-trello-blue"
            autoFocus
          />
        ) : (
          <h3
            className="flex-1 font-semibold text-gray-900 dark:text-white cursor-pointer"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
          </h3>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm('Are you sure you want to delete this list?')) {
              onDelete(list.id);
            }
          }}
          className="ml-2"
        >
          ×
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading cards...</div>
            ) : cards.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No cards yet
              </div>
            ) : (
              cards.map((card) => (
                <Card key={card.id} card={card} onDelete={deleteCard} onUpdate={updateCard} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCardFormOpen(true)}
        className="w-full"
      >
        + Add a card
      </Button>

      <CardForm
        isOpen={isCardFormOpen}
        onClose={() => setIsCardFormOpen(false)}
        onCreate={createCard}
      />
    </SortableList>
  );
}
