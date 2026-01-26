'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, List } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import { format } from 'date-fns';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Row = Card & { list_title?: string };
type TaskStatus = 'not_started' | 'in_progress' | 'completed';

function getTaskStatus(card: Card): TaskStatus {
  if (card.completed) return 'completed';
  
  const now = new Date();
  const startDate = card.start_date ? new Date(card.start_date) : null;
  const dueDate = card.due_date ? new Date(card.due_date) : null;
  
  // Si pas de dates, considérer comme "pas commencé"
  if (!startDate && !dueDate) return 'not_started';
  
  // Si date de début passée ou aujourd'hui, c'est "en cours"
  if (startDate && startDate <= now) return 'in_progress';
  
  // Si date d'échéance passée mais pas commencé, c'est "en cours" (en retard)
  if (dueDate && dueDate < now) return 'in_progress';
  
  // Sinon, pas commencé
  return 'not_started';
}

function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'not_started':
      return 'Pas commencé';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminé';
    default:
      return 'Inconnu';
  }
}

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function SortableRow({ row, onToggleCompleted, onSetColor, onDelete }: { 
  row: Row; 
  onToggleCompleted: (card: Row) => void;
  onSetColor: (card: Row, color: string | null) => void;
  onDelete: (card: Row) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskStatus = getTaskStatus(row);
  const isOverdue = row.due_date && new Date(row.due_date) < new Date() && !row.completed;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 dark:hover:bg-gray-900/20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <td className="px-4 py-3" {...attributes} {...listeners}>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 cursor-grab">⋮⋮</span>
          <input
            type="checkbox"
            checked={!!row.completed}
            onChange={() => onToggleCompleted(row)}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Supprimer la tâche"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={`font-medium ${row.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {row.title}
        </div>
        {row.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{row.description}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(taskStatus)}`}>
          {getStatusLabel(taskStatus)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.list_title || '—'}</td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
        {row.start_date ? format(new Date(row.start_date), 'PP') : '—'}
      </td>
      <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
        {row.due_date ? (
          <>
            {format(new Date(row.due_date), 'PP')}
            {isOverdue && <span className="ml-1 text-xs">⚠️</span>}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: row.color_label || 'transparent' }}
            title={row.color_label || 'None'}
            onClick={() => onSetColor(row, null)}
          />
          <div className="flex gap-1">
            {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#6b7280'].map((c) => (
              <button
                key={c}
                className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                onClick={() => onSetColor(row, c)}
                title={c}
              />
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

export function BoardTableView({ boardId, lists }: { boardId: string; lists: List[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [sort, setSort] = useState<'status' | 'due_asc' | 'due_desc' | 'created_desc' | 'title_asc'>('status');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const listTitleById = useMemo(() => {
    const m = new Map<string, string>();
    lists.forEach((l) => m.set(l.id, l.title));
    return m;
  }, [lists]);

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      const { data: listRows, error: listErr } = await supabase
        .from('lists')
        .select('id, title')
        .eq('board_id', boardId);
      if (listErr) throw listErr;

      const listIds = (listRows || []).map((l) => l.id);
      if (listIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: cards, error: cardsErr } = await supabase
        .from('cards')
        .select('*')
        .in('list_id', listIds);
      if (cardsErr) throw cardsErr;

      const mapped = (cards || []).map((c: any) => ({
        ...(c as Card),
        list_title: listTitleById.get(c.list_id) || listRows?.find((l) => l.id === c.list_id)?.title,
      }));
      setRows(mapped);
    } catch (e: any) {
      showNotification(e?.message || 'Failed to load table view', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, lists.map((l) => l.id).join(',')]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        const taskStatus = getTaskStatus(r);
        if (statusFilter !== 'all' && taskStatus !== statusFilter) return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.list_title || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === 'status') {
          const statusOrder = { completed: 0, in_progress: 1, not_started: 2 };
          const aStatus = getTaskStatus(a);
          const bStatus = getTaskStatus(b);
          if (statusOrder[aStatus] !== statusOrder[bStatus]) {
            return statusOrder[aStatus] - statusOrder[bStatus];
          }
          // Si même statut, trier par date d'échéance
          const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
          return aDue - bDue;
        }
        if (sort === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        if (sort === 'created_desc') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return sort === 'due_asc' ? aDue - bDue : bDue - aDue;
      });
  }, [rows, query, statusFilter, sort]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filtered.findIndex((row) => row.id === active.id);
      const newIndex = filtered.findIndex((row) => row.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(filtered, oldIndex, newIndex);
        
        // Mettre à jour l'ordre dans la base de données
        const updates = newOrder.map((row, index) => ({
          id: row.id,
          order_index: index,
        }));

        try {
          await Promise.all(
            updates.map(({ id, order_index }) =>
              supabase.from('cards').update({ order_index }).eq('id', id)
            )
          );
          
          // Mettre à jour l'état local
          setRows((prev) => {
            const updated = [...prev];
            newOrder.forEach((newRow, index) => {
              const existingIndex = updated.findIndex((r) => r.id === newRow.id);
              if (existingIndex !== -1) {
                updated[existingIndex] = { ...updated[existingIndex], order_index: index };
              }
            });
            return updated;
          });
        } catch (error: any) {
          showNotification(error?.message || 'Failed to reorder tasks', 'error');
        }
      }
    }
  };

  const toggleCompleted = async (card: Row) => {
    const next = !card.completed;
    setRows((prev) => prev.map((r) => (r.id === card.id ? { ...r, completed: next } : r)));
    const { error } = await supabase
      .from('cards')
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq('id', card.id);
    if (error) {
      showNotification(error.message, 'error');
      setRows((prev) => prev.map((r) => (r.id === card.id ? { ...r, completed: card.completed } : r)));
    }
  };

  const setColor = async (card: Row, color: string | null) => {
    setRows((prev) => prev.map((r) => (r.id === card.id ? { ...r, color_label: color } : r)));
    const { error } = await supabase.from('cards').update({ color_label: color }).eq('id', card.id);
    if (error) {
      showNotification(error.message, 'error');
      setRows((prev) => prev.map((r) => (r.id === card.id ? { ...r, color_label: card.color_label } : r)));
    }
  };

  const deleteCard = async (card: Row) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    
    setRows((prev) => prev.filter((r) => r.id !== card.id));
    const { error } = await supabase.from('cards').delete().eq('id', card.id);
    if (error) {
      showNotification(error.message, 'error');
      fetchAllCards(); // Reload on error
    } else {
      showNotification('Tâche supprimée avec succès', 'success');
    }
  };

  if (loading) return <div className="text-gray-600 dark:text-gray-400">Loading table…</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="not_started">Pas commencé</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="status">Par statut</option>
            <option value="due_asc">Date d'échéance (croissant)</option>
            <option value="due_desc">Date d'échéance (décroissant)</option>
            <option value="title_asc">Titre (A-Z)</option>
            <option value="created_desc">Plus récent</option>
          </select>
        </div>
        <Button variant="secondary" onClick={fetchAllCards}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/30 sticky top-0 z-10">
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="px-4 py-3 w-24">Action</th>
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Liste</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Couleur</th>
              </tr>
            </thead>
            <SortableContext items={filtered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((r) => (
                  <SortableRow
                    key={r.id}
                    row={r}
                    onToggleCompleted={toggleCompleted}
                    onSetColor={setColor}
                    onDelete={deleteCard}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={7}>
                      Aucune tâche trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

