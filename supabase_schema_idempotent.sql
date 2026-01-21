-- ============================================
-- Trello-style App Database Schema for Supabase
-- Idempotent version (safe to run multiple times)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADD MISSING COLUMNS (if tables already exist)
-- ============================================

-- Add color column to boards if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'boards' AND column_name = 'color'
    ) THEN
        ALTER TABLE boards ADD COLUMN color TEXT;
    END IF;
END $$;

-- Add missing columns to cards if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE cards ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'completed'
    ) THEN
        ALTER TABLE cards ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cards' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE cards ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    color TEXT,
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
    color_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Card assignments table
CREATE TABLE IF NOT EXISTS card_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(card_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_board_id ON lists(board_id);
CREATE INDEX IF NOT EXISTS idx_lists_order ON lists(board_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);
CREATE INDEX IF NOT EXISTS idx_cards_order ON cards(list_id, order_index);
CREATE INDEX IF NOT EXISTS idx_card_assignments_card_id ON card_assignments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assignments_user_id ON card_assignments(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set completed_at when completed changes
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = TRUE AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
        NEW.completed_at = TIMEZONE('utc', NOW());
    ELSIF NEW.completed = FALSE AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS (idempotent)
-- ============================================

DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
CREATE TRIGGER update_lists_updated_at
    BEFORE UPDATE ON lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_cards_completed_at ON cards;
CREATE TRIGGER set_cards_completed_at
    BEFORE UPDATE OF completed ON cards
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create them
DROP POLICY IF EXISTS "Users can view their own boards" ON boards;
CREATE POLICY "Users can view their own boards"
    ON boards FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own boards" ON boards;
CREATE POLICY "Users can create their own boards"
    ON boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
CREATE POLICY "Users can update their own boards"
    ON boards FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;
CREATE POLICY "Users can delete their own boards"
    ON boards FOR DELETE
    USING (auth.uid() = user_id);

-- Lists policies
DROP POLICY IF EXISTS "Users can view lists in their boards" ON lists;
CREATE POLICY "Users can view lists in their boards"
    ON lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create lists in their boards" ON lists;
CREATE POLICY "Users can create lists in their boards"
    ON lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards
            WHERE boards.id = lists.board_id
            AND boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update lists in their boards" ON lists;
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

DROP POLICY IF EXISTS "Users can delete lists in their boards" ON lists;
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
DROP POLICY IF EXISTS "Users can view cards in their boards" ON cards;
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

DROP POLICY IF EXISTS "Users can create cards in their boards" ON cards;
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

DROP POLICY IF EXISTS "Users can update cards in their boards" ON cards;
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

DROP POLICY IF EXISTS "Users can delete cards in their boards" ON cards;
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
DROP POLICY IF EXISTS "Users can view card assignments in their boards" ON card_assignments;
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

DROP POLICY IF EXISTS "Users can create card assignments in their boards" ON card_assignments;
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

DROP POLICY IF EXISTS "Users can delete card assignments in their boards" ON card_assignments;
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
-- ENABLE REALTIME (optional - uncomment if needed)
-- ============================================

-- ALTER PUBLICATION supabase_realtime ADD TABLE boards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE lists;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE card_assignments;
