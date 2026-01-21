'use client';

import { useBoards } from '@/lib/hooks/useBoards';
import { BoardCard } from './BoardCard';
import { BoardForm } from './BoardForm';
import { Button } from '../ui/Button';
import { useState } from 'react';

export function BoardList() {
  const { boards, loading, error, deleteBoard, createBoard } = useBoards();
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading boards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Boards</h1>
        <Button onClick={() => setIsFormOpen(true)}>Create Board</Button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No boards yet. Create your first board!</p>
          <Button onClick={() => setIsFormOpen(true)}>Create Board</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} onDelete={deleteBoard} />
          ))}
        </div>
      )}

      <BoardForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreate={createBoard}
      />
    </div>
  );
}
