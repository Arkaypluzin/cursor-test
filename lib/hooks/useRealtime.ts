'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeSubscription(
  table: string,
  filter: string,
  filterValue: string,
  callback: (payload: any) => void
) {
  const supabase = createClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`${table}-changes-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filter}=eq.${filterValue}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, filterValue, callback]);
}
