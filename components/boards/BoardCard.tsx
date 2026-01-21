'use client';

import Link from 'next/link';
import { Board } from '@/types/database';
import { Button } from '../ui/Button';

interface BoardCardProps {
  board: Board;
  onDelete: (id: string) => void;
}

export function BoardCard({ board, onDelete }: BoardCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board?')) {
      onDelete(board.id);
    }
  };

  return (
    <Link href={`/boards/${board.id}`}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer h-48 flex flex-col"
        style={{
          borderTop: board.color ? `6px solid ${board.color}` : undefined,
        }}
      >
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {board.title}
          </h3>
          {board.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
              {board.description}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(board.created_at).toLocaleDateString()}
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className="ml-auto"
          >
            Delete
          </Button>
        </div>
      </div>
    </Link>
  );
}
