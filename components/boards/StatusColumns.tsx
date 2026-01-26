'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, List } from '@/types/database';
import { Card as CardComponent } from '../cards/Card';
import { CardForm } from '../cards/CardForm';
import { Button } from '../ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type TaskStatus = 'not_started' | 'in_progress' | 'completed';

interface StatusColumn {
  id: TaskStatus;
  title: string;
  color: string;
}

const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'not_started', title: 'Pas commencé', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'in_progress', title: 'En cours', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'completed', title: 'Terminé', color: 'bg-green-100 dark:bg-green-900' },
];

function getTaskStatus(card: Card): TaskStatus {
  if (card.completed) return 'completed';
  
  const now = new Date();
  const startDate = card.start_date ? new Date(card.start_date) : null;
  const dueDate = card.due_date ? new Date(card.due_date) : null;
  
  if (!startDate && !dueDate) return 'not_started';
  if (startDate && startDate <= now) return 'in_progress';
  if (dueDate && dueDate < now) return 'in_progress';
  
  return 'not_started';
}

function StatusColumn({ 
  column, 
  cards, 
  onCardUpdate, 
  onCardDelete 
}: { 
  column: StatusColumn; 
  cards: Card[];
  onCardUpdate: (id: string, updates: Partial<Card>) => Promise<{ error: string | null }>;
  onCardDelete: (id: string) => Promise<{ error: string | null }>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${column.color} rounded-lg p-4 min-w-[300px] flex flex-col max-h-[calc(100vh-200px)] ${
        isOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
          {column.title}
        </h3>
        <span className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-1 text-sm font-medium">
          {cards.length}
        </span>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cards.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              Glissez une tâche ici
            </div>
          ) : (
              cards.map((card) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  onDelete={(id) => {
                    onCardDelete(id);
                  }}
                  onUpdate={onCardUpdate}
                />
              ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function StatusColumns({ boardId, lists }: { boardId: string; lists: List[] }) {
  const supabase = createClient();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      const listIds = lists.map((l) => l.id);
      if (listIds.length === 0) {
        setAllCards([]);
        return;
      }

      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .in('list_id', listIds)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setAllCards(cards || []);
    } catch (err: any) {
      showNotification(err.message || 'Failed to fetch cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCards();
  }, [boardId, lists.map((l) => l.id).join(',')]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (lists.length === 0) return;

    const listIds = lists.map((l) => l.id);
    const channels: any[] = [];

    listIds.forEach((listId) => {
      const channel = supabase
        .channel(`cards-changes-${listId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cards',
            filter: `list_id=eq.${listId}`,
          },
          () => {
            fetchAllCards();
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists.map((l) => l.id).join(',')]);

  const cardsByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Card[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
    };

    allCards.forEach((card) => {
      const status = getTaskStatus(card);
      grouped[status].push(card);
    });

    // Sort each group by order_index
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.order_index - b.order_index);
    });

    return grouped;
  }, [allCards]);

  const handleCardUpdate = async (id: string, updates: Partial<Card>) => {
    try {
      const { error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setAllCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
      );

      return { error: null };
    } catch (err: any) {
      showNotification(err.message || 'Failed to update card', 'error');
      return { error: err.message };
    }
  };

  const handleCardDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) throw error;

      setAllCards((prev) => prev.filter((card) => card.id !== id));
      return { error: null };
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete card', 'error');
      return { error: err.message };
    }
  };

  const handleCardCreate = async (title: string, description?: string, startDate?: string, dueDate?: string) => {
    if (!selectedListId) return { data: null, error: 'No list selected' };

    try {
      const { data: existingCards } = await supabase
        .from('cards')
        .select('order_index')
        .eq('list_id', selectedListId)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingCards && existingCards.length > 0 
        ? existingCards[0].order_index + 1 
        : 0;

      // Determine initial status based on dates
      let completed = false;
      const now = new Date();
      if (startDate && new Date(startDate) <= now) {
        // If start date is in the past, mark as in_progress
      }

      const { data, error } = await supabase
        .from('cards')
        .insert([{
          title,
          description: description || null,
          start_date: startDate || null,
          due_date: dueDate || null,
          completed,
          list_id: selectedListId,
          order_index: maxOrder,
        }])
        .select()
        .single();

      if (error) throw error;

      setAllCards((prev) => [...prev, data].sort((a, b) => a.order_index - b.order_index));
      return { data, error: null };
    } catch (err: any) {
      showNotification(err.message || 'Failed to create card', 'error');
      return { data: null, error: err.message };
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const cardId = active.id as string;
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;

    // Check if dragging to a status column
    const targetColumn = STATUS_COLUMNS.find((col) => col.id === over.id);
    if (targetColumn) {
      const currentStatus = getTaskStatus(card);
      if (currentStatus === targetColumn.id) return;

      // Update card based on target status
      const now = new Date();
      let updates: Partial<Card> = {};

      if (targetColumn.id === 'completed') {
        updates = {
          completed: true,
          completed_at: new Date().toISOString(),
        };
      } else if (targetColumn.id === 'in_progress') {
        updates = {
          completed: false,
          completed_at: null,
          start_date: card.start_date || now.toISOString(),
        };
      } else if (targetColumn.id === 'not_started') {
        updates = {
          completed: false,
          completed_at: null,
          start_date: null,
        };
      }

      await handleCardUpdate(cardId, updates);
      return;
    }

    // Check if dragging to another card (reordering)
    const targetCard = allCards.find((c) => c.id === over.id);
    if (targetCard) {
      const sourceColumn = STATUS_COLUMNS.find((col) =>
        cardsByStatus[col.id].some((c) => c.id === cardId)
      );
      const targetColumn = STATUS_COLUMNS.find((col) =>
        cardsByStatus[col.id].some((c) => c.id === over.id)
      );

      if (sourceColumn && targetColumn) {
        if (sourceColumn.id === targetColumn.id) {
          // Reordering within same column
          const columnCards = cardsByStatus[sourceColumn.id];
          const oldIndex = columnCards.findIndex((c) => c.id === cardId);
          const newIndex = columnCards.findIndex((c) => c.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(columnCards, oldIndex, newIndex);
            const updates = newOrder.map((card, index) => ({
              id: card.id,
              order_index: index,
            }));

            await Promise.all(
              updates.map(({ id, order_index }) =>
                handleCardUpdate(id, { order_index })
              )
            );
          }
        } else {
          // Moving to different column - update status first, then reorder
          const now = new Date();
          let statusUpdates: Partial<Card> = {};

          if (targetColumn.id === 'completed') {
            statusUpdates = {
              completed: true,
              completed_at: new Date().toISOString(),
            };
          } else if (targetColumn.id === 'in_progress') {
            statusUpdates = {
              completed: false,
              completed_at: null,
              start_date: card.start_date || now.toISOString(),
            };
          } else if (targetColumn.id === 'not_started') {
            statusUpdates = {
              completed: false,
              completed_at: null,
              start_date: null,
            };
          }

          await handleCardUpdate(cardId, statusUpdates);
          
          // Then reorder in target column
          const targetColumnCards = [...cardsByStatus[targetColumn.id], { ...card, ...statusUpdates }];
          const newIndex = targetColumnCards.findIndex((c) => c.id === over.id);
          if (newIndex !== -1) {
            const newOrder = arrayMove(targetColumnCards, targetColumnCards.length - 1, newIndex);
            const updates = newOrder.map((c, index) => ({
              id: c.id,
              order_index: index,
            }));

            await Promise.all(
              updates.map(({ id, order_index }) =>
                handleCardUpdate(id, { order_index })
              )
            );
          }
        }
      }
    }
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-400">Chargement des tâches...</div>;
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((column) => (
            <StatusColumn
              key={column.id}
              column={column}
              cards={cardsByStatus[column.id]}
              onCardUpdate={handleCardUpdate}
              onCardDelete={handleCardDelete}
            />
          ))}
        </div>
      </DndContext>

      <div className="mt-4 flex gap-2 flex-wrap">
        {lists.map((list) => (
          <Button
            key={list.id}
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedListId(list.id);
              setSelectedStatus(null);
              setIsCardFormOpen(true);
            }}
          >
            + Ajouter une tâche dans "{list.title}"
          </Button>
        ))}
      </div>

      <CardForm
        isOpen={isCardFormOpen}
        onClose={() => {
          setIsCardFormOpen(false);
          setSelectedListId(null);
        }}
        onCreate={handleCardCreate}
      />
    </div>
  );
}
