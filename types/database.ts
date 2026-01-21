export interface Board {
  id: string;
  title: string;
  description: string | null;
  color?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  board_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  start_date?: string | null;
  due_date: string | null;
  completed?: boolean;
  completed_at?: string | null;
  order_index: number;
  color_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardAssignment {
  id: string;
  card_id: string;
  user_id: string;
  created_at: string;
}

export interface CardWithAssignments extends Card {
  assignments?: CardAssignment[];
}

export interface ListWithCards extends List {
  cards?: Card[];
}

export interface BoardWithLists extends Board {
  lists?: ListWithCards[];
}
