'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, List } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { showNotification } from '@/lib/utils/notifications';
import { format } from 'date-fns';

type Row = Card & { list_title?: string };

export function BoardTableView({ boardId, lists }: { boardId: string; lists: List[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'todo' | 'done'>('all');
  const [sort, setSort] = useState<'due_asc' | 'due_desc' | 'created_desc'>('created_desc');

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
        if (status === 'todo' && r.completed) return false;
        if (status === 'done' && !r.completed) return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.list_title || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return sort === 'due_asc' ? aDue - bDue : bDue - aDue;
      });
  }, [rows, query, status, sort]);

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
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All</option>
            <option value="todo">To do</option>
            <option value="done">Done</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="created_desc">Newest</option>
            <option value="due_asc">Due date (asc)</option>
            <option value="due_desc">Due date (desc)</option>
          </select>
        </div>
        <Button variant="secondary" onClick={fetchAllCards}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/30">
            <tr className="text-left text-gray-600 dark:text-gray-300">
              <th className="px-4 py-3">Done</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">List</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Color</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={!!r.completed} onChange={() => toggleCompleted(r)} />
                </td>
                <td className="px-4 py-3">
                  <div className={`font-medium ${r.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {r.title}
                  </div>
                  {r.description && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{r.description}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.list_title || '—'}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {r.start_date ? format(new Date(r.start_date), 'PP') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {r.due_date ? format(new Date(r.due_date), 'PP') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: r.color_label || 'transparent' }}
                      title={r.color_label || 'None'}
                      onClick={() => setColor(r, null)}
                    />
                    <div className="flex gap-1">
                      {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#6b7280'].map((c) => (
                        <button
                          key={c}
                          className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(r, c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

