-- Phase 3: Layout Items Foundation
-- Create layout_items table for spacers and future dividers
-- These items share the same ordering space as commitments using LexoRank

-- Create layout_items table
CREATE TABLE layout_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('spacer', 'divider')),

  -- Spacer-specific properties
  height INTEGER NULL CHECK (height IS NULL OR height > 0), -- Height in pixels for spacers

  -- Divider-specific properties (for Phase 4)
  style TEXT NULL CHECK (style IS NULL OR style IN ('solid', 'dashed', 'dotted')),
  color TEXT NULL, -- Hex color for dividers

  -- Ordering and lifecycle
  order_rank TEXT NOT NULL DEFAULT ''::TEXT, -- LexoRank for stable ordering
  is_active BOOLEAN DEFAULT true,
  archived BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ NULL, -- Soft delete support
  last_active_rank TEXT NULL, -- Stored rank before archival

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_layout_items_updated_at
  BEFORE UPDATE ON layout_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE layout_items ENABLE ROW LEVEL SECURITY;

-- Layout items policies (mirror commitments policies)
CREATE POLICY "Users can view own layout items" ON layout_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layout items" ON layout_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layout items" ON layout_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layout items" ON layout_items
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_layout_items_user_id ON layout_items(user_id);
CREATE INDEX idx_layout_items_active ON layout_items(user_id, is_active);

-- Composite index for efficient ordering (mirrors commitments index)
CREATE INDEX idx_layout_items_user_bucket_rank
  ON layout_items (
    user_id,
    archived,
    (deleted_at IS NULL),
    order_rank ASC,
    updated_at ASC,
    id ASC
  );

-- Add comments for documentation
COMMENT ON TABLE layout_items IS 'Layout items (spacers, dividers) that appear in commitment grid ordering';
COMMENT ON COLUMN layout_items.type IS 'Type of layout item: spacer or divider';
COMMENT ON COLUMN layout_items.height IS 'Height in pixels for spacer items';
COMMENT ON COLUMN layout_items.style IS 'Visual style for divider items (Phase 4)';
COMMENT ON COLUMN layout_items.order_rank IS 'LexoRank for stable ordering with commitments';
COMMENT ON COLUMN layout_items.last_active_rank IS 'Stored rank before archival for restoration';