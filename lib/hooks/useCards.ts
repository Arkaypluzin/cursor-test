'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardAssignment } from '@/types/database';

export function useCards(listId: string | null) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCards = async () => {
    if (!listId) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('cards')
        .select('*')
        .eq('list_id', listId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setCards(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cards');
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();

    if (!listId) return;

    // Subscribe to realtime changes for cards in this list
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCards((prev) => {
              const exists = prev.find((c) => c.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as Card].sort((a, b) => a.order_index - b.order_index);
            });
          } else if (payload.eventType === 'UPDATE') {
            setCards((prev) =>
              prev
                .map((card) =>
                  card.id === payload.new.id ? (payload.new as Card) : card
                )
                .sort((a, b) => a.order_index - b.order_index)
            );
          } else if (payload.eventType === 'DELETE') {
            setCards((prev) => prev.filter((card) => card.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const createCard = async (title: string, description?: string, startDate?: string, dueDate?: string) => {
    if (!listId) return { data: null, error: 'No list selected' };

    try {
      // Get the max order_index for this list
      const { data: existingCards } = await supabase
        .from('cards')
        .select('order_index')
        .eq('list_id', listId)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingCards && existingCards.length > 0 
        ? existingCards[0].order_index + 1 
        : 0;

      const { data, error: createError } = await supabase
        .from('cards')
        .insert([{ 
          title, 
          description: description || null,
          start_date: startDate || null,
          due_date: dueDate || null,
          completed: false,
          list_id: listId,
          order_index: maxOrder 
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setCards((prev) => [...prev, data].sort((a, b) => a.order_index - b.order_index));
      return { data, error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create card';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    try {
      const { error: updateError } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setCards((prev) => prev.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update card';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCards((prev) => prev.filter(card => card.id !== id));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete card';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const reorderCards = async (newOrder: { id: string; order_index: number }[]) => {
    try {
      const updates = newOrder.map(({ id, order_index }) =>
        supabase
          .from('cards')
          .update({ order_index })
          .eq('id', id)
      );

      await Promise.all(updates);

      setCards((prev) => prev.map(card => {
        const newOrderItem = newOrder.find(item => item.id === card.id);
        return newOrderItem ? { ...card, order_index: newOrderItem.order_index } : card;
      }).sort((a, b) => a.order_index - b.order_index));

      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reorder cards';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const moveCard = async (cardId: string, newListId: string, newOrderIndex: number) => {
    try {
      const { error: moveError } = await supabase
        .from('cards')
        .update({ list_id: newListId, order_index: newOrderIndex })
        .eq('id', cardId);

      if (moveError) throw moveError;

      // Remove from current list (the card will appear in the new list via realtime)
      setCards((prev) => prev.filter(card => card.id !== cardId));
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to move card';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const getCardAssignments = async (cardId: string): Promise<CardAssignment[]> => {
    try {
      const { data, error } = await supabase
        .from('card_assignments')
        .select('*')
        .eq('card_id', cardId);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching card assignments:', err);
      return [];
    }
  };

  const assignUserToCard = async (cardId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('card_assignments')
        .insert([{ card_id: cardId, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to assign user';
      return { data: null, error: errorMsg };
    }
  };

  const unassignUserFromCard = async (cardId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('card_assignments')
        .delete()
        .eq('card_id', cardId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to unassign user';
      return { error: errorMsg };
    }
  };

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    reorderCards,
    moveCard,
    getCardAssignments,
    assignUserToCard,
    unassignUserFromCard,
    refetch: fetchCards,
  };
}
