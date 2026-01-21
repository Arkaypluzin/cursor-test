'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BoardList } from '@/components/boards/BoardList';
import { Header } from '@/components/layout/Header';
import { initTheme } from '@/lib/utils/theme';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    initTheme();
    
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };

    checkUser();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main>
        <BoardList />
      </main>
    </div>
  );
}
