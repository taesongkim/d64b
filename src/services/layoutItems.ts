import { supabase } from './supabase';
import type { LayoutItem } from '@/store/slices/layoutItemsSlice';
import { rankBetween } from '@/utils/rank';

// Database row type (matches Supabase schema)
interface LayoutItemRow {
  id: string;
  user_id: string;
  type: 'spacer' | 'divider';
  height?: number;
  style?: string;
  color?: string;
  order_rank: string;
  is_active: boolean;
  archived: boolean;
  deleted_at?: string;
  last_active_rank?: string;
  created_at: string;
  updated_at: string;
}

// Transform database row to app model
function transformRowToLayoutItem(row: LayoutItemRow): LayoutItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    height: row.height,
    style: row.style as 'solid' | 'dashed' | 'dotted' | undefined,
    color: row.color,
    order_rank: row.order_rank,
    isActive: row.is_active,
    archived: row.archived,
    deletedAt: row.deleted_at,
    lastActiveRank: row.last_active_rank,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Transform app model to database row
function transformLayoutItemToRow(item: Partial<LayoutItem> & { userId: string }): Partial<LayoutItemRow> {
  return {
    ...(item.id && { id: item.id }),
    user_id: item.userId,
    ...(item.type && { type: item.type }),
    ...(item.height !== undefined && { height: item.height }),
    ...(item.style && { style: item.style }),
    ...(item.color && { color: item.color }),
    ...(item.order_rank && { order_rank: item.order_rank }),
    ...(item.isActive !== undefined && { is_active: item.isActive }),
    ...(item.archived !== undefined && { archived: item.archived }),
    ...(item.deletedAt !== undefined && { deleted_at: item.deletedAt }),
    ...(item.lastActiveRank !== undefined && { last_active_rank: item.lastActiveRank }),
  };
}

/**
 * Fetch all layout items for a user
 */
export async function getUserLayoutItems(userId: string): Promise<LayoutItem[]> {
  const { data, error } = await supabase
    .from('layout_items')
    .select('*')
    .eq('user_id', userId)
    .order('order_rank', { ascending: true });

  if (error) {
    console.error('Failed to fetch layout items:', error);
    throw error;
  }

  return (data || []).map(transformRowToLayoutItem);
}

/**
 * Create a new layout item
 */
export async function createLayoutItem(
  layoutItem: Omit<LayoutItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LayoutItem> {
  const row = transformLayoutItemToRow(layoutItem);

  const { data, error } = await supabase
    .from('layout_items')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Failed to create layout item:', error);
    throw error;
  }

  return transformRowToLayoutItem(data);
}

/**
 * Update an existing layout item
 */
export async function updateLayoutItem(
  layoutItem: Partial<LayoutItem> & { id: string; userId: string }
): Promise<LayoutItem> {
  const row = transformLayoutItemToRow(layoutItem);

  const { data, error } = await supabase
    .from('layout_items')
    .update(row)
    .eq('id', layoutItem.id)
    .eq('user_id', layoutItem.userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update layout item:', error);
    throw error;
  }

  return transformRowToLayoutItem(data);
}

/**
 * Delete a layout item (hard delete)
 */
export async function deleteLayoutItem(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('layout_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete layout item:', error);
    throw error;
  }
}

/**
 * Soft delete a layout item
 */
export async function softDeleteLayoutItem(id: string, userId: string): Promise<LayoutItem> {
  const row = {
    deleted_at: new Date().toISOString(),
    is_active: false,
  };

  const { data, error } = await supabase
    .from('layout_items')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to soft delete layout item:', error);
    throw error;
  }

  return transformRowToLayoutItem(data);
}

/**
 * Archive a layout item (preserving rank for potential restoration)
 */
export async function archiveLayoutItem(id: string, userId: string): Promise<LayoutItem> {
  // First get current rank
  const { data: currentData, error: fetchError } = await supabase
    .from('layout_items')
    .select('order_rank')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch layout item for archiving:', fetchError);
    throw fetchError;
  }

  const row = {
    archived: true,
    is_active: false,
    last_active_rank: currentData.order_rank,
  };

  const { data, error } = await supabase
    .from('layout_items')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to archive layout item:', error);
    throw error;
  }

  return transformRowToLayoutItem(data);
}

/**
 * Restore an archived layout item
 */
export async function restoreLayoutItem(
  id: string,
  userId: string,
  newRank: string
): Promise<LayoutItem> {
  const row = {
    archived: false,
    is_active: true,
    order_rank: newRank,
    deleted_at: null,
  };

  const { data, error } = await supabase
    .from('layout_items')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to restore layout item:', error);
    throw error;
  }

  return transformRowToLayoutItem(data);
}

/**
 * Batch update layout item ranks (for reordering)
 */
export async function batchUpdateLayoutItemRanks(
  updates: Array<{ id: string; newRank: string }>,
  userId: string
): Promise<LayoutItem[]> {
  const results: LayoutItem[] = [];

  // Execute updates in parallel for performance
  const promises = updates.map(async ({ id, newRank }) => {
    const { data, error } = await supabase
      .from('layout_items')
      .update({
        order_rank: newRank,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update layout item rank for ${id}:`, error);
      throw error;
    }

    return transformRowToLayoutItem(data);
  });

  const updatedItems = await Promise.all(promises);
  return updatedItems;
}

/**
 * Generate a new spacer with default properties
 */
export function createDefaultSpacer(
  userId: string,
  order_rank: string,
  height: number = 32
): Omit<LayoutItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    type: 'spacer',
    height,
    order_rank,
    isActive: true,
    archived: false,
    deletedAt: null,
  };
}