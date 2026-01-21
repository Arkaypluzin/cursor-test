-- Trello-style App Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Realtime for tables (optional, can be done via Supabase dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE boards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE lists;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE card_assignments;

-- ============================================
-- TABLES
-- ============================================

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Board color (hex like '#3b82f6')
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Lists table
CREATE TABLE IF NOT EXISTS lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER NOT NULL DEFAULT 0,
    color_label TEXT, -- For bonus feature: color labels (e.g., 'red', 'blue', 'green', 'yellow')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Card assignments table (bonus feature: assign users to cards)
CREATE TABLE IF NOT EXISTS card_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(card_id, user_id) -- Prevent duplicate assignments
);

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_board_id ON lists(board_id);
CREATE INDEX IF NOT EXISTS idx_lists_order ON lists(board_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);
CREATE INDEX IF NOT EXISTS idx_cards_order ON cards(list_id, order_index);
CREATE INDEX IF NOT EXISTS idx_card_assignments_card_id ON card_assignments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assignments_user_id ON card_assignments(user_id);

-- ============================================
-- FUNCTIONS for auto-updating updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at
    BEFORE UPDATE ON lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignments ENABLE ROW LEVEL SECURITY;

-- Boards policies
-- Users can view their own boards
CREATE POLICY "Users can view their own boards"
    ON boards FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own boards
CREATE POLICY "Users can create their own boards"
    ON boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own boards
CREATE POLICY "Users can update their own boards"
    ON boards FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own boards
CREATE POLICY "Users can delete their own boards"
    ON boards FOR DELETE
    USING (auth.uid() = user_id);

-- Lists policies
-- Users can view lists in their boards
CREATE POLICY "Users can view lists in their boards"
    ON lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can create lists in their boards
CREATE POLICY "Users can create lists in their boards"
    ON lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can update lists in their boards
CREATE POLICY "Users can update lists in their boards"
    ON lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can delete lists in their boards
CREATE POLICY "Users can delete lists in their boards"
    ON lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

-- Cards policies
-- Users can view cards in their boards
CREATE POLICY "Users can view cards in their boards"
    ON cards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lists
            JOIN boards ON boards.id = lists.board_id
            WHERE lists.id = cards.list_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can create cards in their boards
CREATE POLICY "Users can create cards in their boards"
    ON cards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lists
            JOIN boards ON boards.id = lists.board_id
            WHERE lists.id = cards.list_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can update cards in their boards
CREATE POLICY "Users can update cards in their boards"
    ON cards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM lists
            JOIN boards ON boards.id = lists.board_id
            WHERE lists.id = cards.list_id
            AND boards.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lists
            JOIN boards ON boards.id = lists.board_id
            WHERE lists.id = cards.list_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can delete cards in their boards
CREATE POLICY "Users can delete cards in their boards"
    ON cards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM lists
            JOIN boards ON boards.id = lists.board_id
            WHERE lists.id = cards.list_id
            AND boards.user_id = auth.uid()
        )
    );

-- Card assignments policies
-- Users can view assignments for cards in their boards
CREATE POLICY "Users can view card assignments in their boards"
    ON card_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cards
            JOIN lists ON lists.id = cards.list_id
            JOIN boards ON boards.id = lists.board_id
            WHERE cards.id = card_assignments.card_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can create assignments for cards in their boards
CREATE POLICY "Users can create card assignments in their boards"
    ON card_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards
            JOIN lists ON lists.id = cards.list_id
            JOIN boards ON boards.id = lists.board_id
            WHERE cards.id = card_assignments.card_id
            AND boards.user_id = auth.uid()
        )
    );

-- Users can delete assignments for cards in their boards
CREATE POLICY "Users can delete card assignments in their boards"
    ON card_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM cards
            JOIN lists ON lists.id = cards.list_id
            JOIN boards ON boards.id = lists.board_id
            WHERE cards.id = card_assignments.card_id
            AND boards.user_id = auth.uid()
        )
    );

-- ============================================
-- ENABLE REALTIME (Run these separately if needed)
-- ============================================

-- Enable Realtime for tables (can also be done via Supabase Dashboard)
-- Go to Database > Replication in Supabase Dashboard and enable for each table
-- Or run these commands:

-- ALTER PUBLICATION supabase_realtime ADD TABLE boards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE lists;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE card_assignments;
