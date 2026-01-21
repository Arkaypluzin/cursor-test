'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { List } from '@/types/database';

export function useLists(boardId: string | null) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLists = async () => {
    if (!boardId) {
      setLists([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setLists(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lists');
      console.error('Error fetching lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();

    if (!boardId) return;

    // Subscribe to realtime changes for lists in this board
    const channel = supabase
      .channel(`lists-changes-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLists((prev) => {
              const exists = prev.find((l) => l.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as List].sort((a, b) => a.order_index - b.order_index);
            });
          } else if (payload.eventType === 'UPDATE') {
            setLists((prev) =>
              prev
                .map((list) =>
                  list.id === payload.new.id ? (payload.new as List) : list
                )
                .sort((a, b) => a.order_index - b.order_index)
            );
          } else if (payload.eventType === 'DELETE') {
            setLists((prev) => prev.filter((list) => list.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const createList = async (title: string) => {
    if (!boardId) return { data: null, error: 'No board selected' };

    try {
      // Get the max order_index for this board
      const { data: existingLists } = await supabase
        .from('lists')
        .select('order_index')
        .eq('board_id', boardId)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingLists && existingLists.length > 0 
        ? existingLists[0].order_index + 1 
        : 0;

      const { data, error: createError } = await supabase
        .from('lists')
        .insert([{ 
          title, 
          board_id: boardId,
          order_index: maxOrder 
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setLists((prev) => [...prev, data].sort((a, b) => a.order_index - b.order_index));
      return { data, error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create list';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const updateList = async (id: string, updates: Partial<List>) => {
    try {
      const { error: updateError } = await supabase
        .from('lists')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setLists((prev) => prev.map(list => 
        list.id === id ? { ...list, ...updates } : list
      ));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update list';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const deleteList = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('lists')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setLists((prev) => prev.filter(list => list.id !== id));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete list';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const reorderLists = async (newOrder: { id: string; order_index: number }[]) => {
    try {
      // Update all lists in a transaction-like manner
      const updates = newOrder.map(({ id, order_index }) =>
        supabase
          .from('lists')
          .update({ order_index })
          .eq('id', id)
      );

      await Promise.all(updates);

      // Update local state
      setLists((prev) => prev.map(list => {
        const newOrderItem = newOrder.find(item => item.id === list.id);
        return newOrderItem ? { ...list, order_index: newOrderItem.order_index } : list;
      }).sort((a, b) => a.order_index - b.order_index));

      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reorder lists';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  return {
    lists,
    loading,
    error,
    createList,
    updateList,
    deleteList,
    reorderLists,
    refetch: fetchLists,
  };
}
