'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Board } from '@/types/database';

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setBoards([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBoards(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch boards');
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();

    // Subscribe to realtime changes
    // RLS policies ensure we only receive changes for user's own boards
    const channel = supabase
      .channel('boards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBoards((prev) => {
              const exists = prev.find((b) => b.id === payload.new.id);
              if (exists) return prev;
              return [payload.new as Board, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setBoards((prev) =>
              prev.map((board) =>
                board.id === payload.new.id ? (payload.new as Board) : board
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBoards((prev) => prev.filter((board) => board.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createBoard = async (title: string, description?: string, color?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: createError } = await supabase
        .from('boards')
        .insert([{ title, description: description || null, color: color || null, user_id: user.id }])
        .select()
        .single();

      if (createError) throw createError;
      
      setBoards((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create board';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const updateBoard = async (id: string, updates: Partial<Board>) => {
    try {
      const { error: updateError } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setBoards((prev) => prev.map(board => 
        board.id === id ? { ...board, ...updates } : board
      ));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update board';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const deleteBoard = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('boards')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setBoards((prev) => prev.filter(board => board.id !== id));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete board';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  return {
    boards,
    loading,
    error,
    createBoard,
    updateBoard,
    deleteBoard,
    refetch: fetchBoards,
  };
}
