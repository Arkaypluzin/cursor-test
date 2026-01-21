'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLists } from '@/lib/hooks/useLists';
import { useBoards } from '@/lib/hooks/useBoards';
import { List } from '@/components/lists/List';
import { ListForm } from '@/components/lists/ListForm';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { BoardForm } from '@/components/boards/BoardForm';
import { BoardTableView } from '@/components/boards/BoardTableView';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const { lists, loading: listsLoading, updateList, deleteList, reorderLists, createList } = useLists(boardId);
  const { boards, loading: boardsLoading, updateBoard } = useBoards();
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [isBoardFormOpen, setIsBoardFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const supabase = createClient();

  const board = boards.find(b => b.id === boardId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Realtime subscriptions are now handled directly in the hooks (useLists, useCards)
  // No need for additional subscriptions here

  const handleListDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lists.findIndex((list) => list.id === active.id);
      const newIndex = lists.findIndex((list) => list.id === over.id);

      const newOrder = arrayMove(lists, oldIndex, newIndex);
      const updates = newOrder.map((list, index) => ({
        id: list.id,
        order_index: index,
      }));

      reorderLists(updates);
    }
  };

  const handleCardReorder = (cardId: string, newOrder: number) => {
    // This is handled within the List component
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router, supabase]);

  if (boardsLoading || listsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading board...</div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-red-500">Board not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{board.title}</h1>
            {board.description && (
              <p className="text-gray-600 dark:text-gray-400">{board.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button variant="secondary" onClick={() => setIsBoardFormOpen(true)}>
              Edit Board
            </Button>
            <Button onClick={() => setIsListFormOpen(true)}>Add List</Button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <BoardTableView boardId={boardId} lists={lists} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleListDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
                {lists.map((list) => (
                  <List
                    key={list.id}
                    list={list}
                    onUpdate={updateList}
                    onDelete={deleteList}
                    onCardReorder={handleCardReorder}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}

        {lists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No lists yet. Create your first list!</p>
            <Button onClick={() => setIsListFormOpen(true)}>Create List</Button>
          </div>
        )}
      </div>

      <ListForm
        isOpen={isListFormOpen}
        onClose={() => setIsListFormOpen(false)}
        onCreate={(title) => createList(title)}
      />
      <BoardForm
        isOpen={isBoardFormOpen}
        onClose={() => setIsBoardFormOpen(false)}
        boardId={boardId}
        initialTitle={board.title}
        initialDescription={board.description || ''}
        initialColor={board.color || ''}
        onUpdate={updateBoard}
      />
    </div>
  );
}
