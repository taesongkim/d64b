import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

type CommitmentInsert = Database['public']['Tables']['commitments']['Insert'];
type CommitmentUpdate = Database['public']['Tables']['commitments']['Update'];
type CommitmentRecordInsert = Database['public']['Tables']['commitment_records']['Insert'];

// Commitments CRUD
export async function createCommitment(data: CommitmentInsert) {
  const { data: commitment, error } = await supabase
    .from('commitments')
    .insert([data])
    .select()
    .single();

  return { data: commitment, error };
}

export async function getUserCommitments(userId: string) {
  console.log('🔍 getUserCommitments called for userId:', userId);

  const { data, error } = await supabase
    .from('commitments')
    .select('*, archived, deleted_at, show_values, order_rank, last_active_rank')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('order_rank', { ascending: true })
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true });

  console.log('🔍 getUserCommitments result:', {
    dataCount: data?.length || 0,
    error: error?.message || 'No error',
    firstCommitment: data?.[0]?.id || 'None'
  });

  return { commitments: data, error };
}

export async function getAllUserCommitments(userId: string) {
  console.log('🔍 getAllUserCommitments called for userId:', userId);

  const { data, error } = await supabase
    .from('commitments')
    .select('*, archived, deleted_at, show_values, order_rank, last_active_rank')
    .eq('user_id', userId)
    .order('order_rank', { ascending: true })
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true });

  console.log('🔍 getAllUserCommitments result:', {
    dataCount: data?.length || 0,
    error: error?.message || 'No error',
    firstCommitment: data?.[0]?.id || 'None'
  });

  return { commitments: data, error };
}

export async function updateCommitment(id: string, updates: CommitmentUpdate) {
  const { data, error } = await supabase
    .from('commitments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// Update only the order rank for reordering operations
export async function updateOrderRank(id: string, order_rank: string, options?: { onlyIfBlank?: boolean }) {
  let query = supabase
    .from('commitments')
    .update({ order_rank })
    .eq('id', id);

  // Add condition to only update if order_rank is blank when onlyIfBlank is true
  if (options?.onlyIfBlank) {
    query = query.or('order_rank.is.null,order_rank.eq.');
  }

  const { data, error } = await query
    .select()
    .single();

  return { data, error };
}

export async function deleteCommitment(id: string) {
  const { data, error } = await supabase
    .from('commitments')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  // Trigger auto-delete for layout items if commitment deletion succeeded
  if (data && !error) {
    try {
      // Get remaining active commitments for this user
      const { data: remainingCommitments } = await supabase
        .from('commitments')
        .select('id, order_rank')
        .eq('user_id', data.user_id)
        .eq('is_active', true)
        .neq('id', id); // Exclude the just-deleted commitment

      if (remainingCommitments) {
        // Import and call auto-delete function
        const { autoDeleteInvalidLayoutItems } = await import('./layoutItems');
        await autoDeleteInvalidLayoutItems(data.user_id, remainingCommitments);
      }
    } catch (layoutError) {
      console.error('Failed to auto-delete layout items after commitment deletion:', layoutError);
      // Don't fail the commitment deletion if layout cleanup fails
    }
  }

  return { data, error };
}

/**
 * Safely restore a commitment with rank conflict detection
 * @param id - Commitment ID to restore
 * @param userId - User ID (for rank conflict checking)
 * @param lastActiveRank - The rank to restore to (from last_active_rank)
 * @returns Updated commitment with safe rank
 */
export async function restoreCommitmentSafely(id: string, userId: string, lastActiveRank: string): Promise<{ data: any; error: any }> {
  try {
    // Get all current active items to check for rank conflicts
    const { getAllActiveItemsWithRanks } = await import('@/services/layoutItems');
    const { findSafeRank } = await import('@/utils/rank');

    const allActiveItems = await getAllActiveItemsWithRanks(userId);
    const safeRank = findSafeRank(lastActiveRank, allActiveItems);

    if (__DEV__ && safeRank !== lastActiveRank) {
      console.log(`🔧 [RESTORE] Commitment ${id} rank adjusted from '${lastActiveRank}' to '${safeRank}' to avoid conflict`);
    }

    // Restore commitment with safe rank
    const { data, error } = await supabase
      .from('commitments')
      .update({
        archived: false,
        is_active: true,
        order_rank: safeRank
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Failed to restore commitment safely:', error);
    return { data: null, error };
  }
}

// Archive/Delete operations
export async function setArchived(id: string, archived: boolean, options?: { is_active?: boolean }) {
  const updates: any = {
    archived
  };

  // When archiving, set is_active to false by default (unless explicitly overridden)
  // When unarchiving (archived: false), set is_active to true by default
  if (options?.is_active !== undefined) {
    updates.is_active = options.is_active;
  } else {
    updates.is_active = !archived; // archived = true -> is_active = false, and vice versa
  }

  const { data, error } = await supabase
    .from('commitments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  // Trigger auto-delete for layout items when archiving (making inactive)
  if (data && !error && archived && !updates.is_active) {
    try {
      // Get remaining active commitments for this user
      const { data: remainingCommitments } = await supabase
        .from('commitments')
        .select('id, order_rank')
        .eq('user_id', data.user_id)
        .eq('is_active', true)
        .neq('id', id); // Exclude the just-archived commitment

      if (remainingCommitments) {
        // Import and call auto-delete function
        const { autoDeleteInvalidLayoutItems } = await import('./layoutItems');
        await autoDeleteInvalidLayoutItems(data.user_id, remainingCommitments);
      }
    } catch (layoutError) {
      console.error('Failed to auto-delete layout items after commitment archiving:', layoutError);
      // Don't fail the commitment archiving if layout cleanup fails
    }
  }

  return { data, error };
}

export async function setDeletedAt(id: string, deletedAt: string | null, options?: { is_active?: boolean }) {
  const updates: any = { deleted_at: deletedAt };

  // When soft deleting (setting timestamp), set is_active to false by default
  // When restoring (setting null), set is_active to true by default
  if (options?.is_active !== undefined) {
    updates.is_active = options.is_active;
  } else {
    updates.is_active = deletedAt === null; // deleted_at = null -> is_active = true, and vice versa
  }

  const { data, error } = await supabase
    .from('commitments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  // Trigger auto-delete for layout items when soft deleting (making inactive)
  if (data && !error && deletedAt !== null && !updates.is_active) {
    try {
      // Get remaining active commitments for this user
      const { data: remainingCommitments } = await supabase
        .from('commitments')
        .select('id, order_rank')
        .eq('user_id', data.user_id)
        .eq('is_active', true)
        .neq('id', id); // Exclude the just-deleted commitment

      if (remainingCommitments) {
        // Import and call auto-delete function
        const { autoDeleteInvalidLayoutItems } = await import('./layoutItems');
        await autoDeleteInvalidLayoutItems(data.user_id, remainingCommitments);
      }
    } catch (layoutError) {
      console.error('Failed to auto-delete layout items after commitment soft deletion:', layoutError);
      // Don't fail the commitment deletion if layout cleanup fails
    }
  }

  return { data, error };
}

export async function permanentDelete(id: string) {
  // Get commitment info before deletion for auto-delete process
  const { data: commitmentToDelete } = await supabase
    .from('commitments')
    .select('user_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', id);

  // Trigger auto-delete for layout items if permanent deletion succeeded
  if (!error && commitmentToDelete) {
    try {
      // Get remaining commitments for this user (all active commitments)
      const { data: remainingCommitments } = await supabase
        .from('commitments')
        .select('id, order_rank')
        .eq('user_id', commitmentToDelete.user_id)
        .eq('is_active', true); // All remaining active commitments

      if (remainingCommitments) {
        // Import and call auto-delete function
        const { autoDeleteInvalidLayoutItems } = await import('./layoutItems');
        await autoDeleteInvalidLayoutItems(commitmentToDelete.user_id, remainingCommitments);
      }
    } catch (layoutError) {
      console.error('Failed to auto-delete layout items after permanent commitment deletion:', layoutError);
      // Don't fail the commitment deletion if layout cleanup fails
    }
  }

  return { error };
}

// Commitment Records CRUD
export async function createCommitmentRecord(data: CommitmentRecordInsert) {
  console.log('💾 createCommitmentRecord called:', { 
    commitment_id: data.commitment_id?.substring(0, 8) + '...', 
    completed_at: data.completed_at,
    status: data.status 
  });

  const { data: record, error } = await supabase
    .from('commitment_records')
    .insert([data])
    .select()
    .single();

  console.log('💾 createCommitmentRecord result:', { 
    success: !!record, 
    error: error?.message || 'No error' 
  });

  return { data: record, error };
}

// Upsert commitment record (insert or update if exists)
export async function upsertCommitmentRecord(data: CommitmentRecordInsert) {
  const { data: record, error } = await supabase
    .from('commitment_records')
    .upsert([data], {
      onConflict: 'commitment_id,completed_at',
      ignoreDuplicates: false
    })
    .select()
    .single();

  return { data: record, error };
}

export async function getCommitmentRecords(commitmentId: string, startDate: string, endDate: string) {
  console.log('📊 getCommitmentRecords called:', { commitmentId, startDate, endDate });
  
  const { data, error } = await supabase
    .from('commitment_records')
    .select('*')
    .eq('commitment_id', commitmentId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .order('completed_at', { ascending: true });

  console.log('📊 getCommitmentRecords result:', { 
    commitmentId: commitmentId.substring(0, 8) + '...', 
    recordCount: data?.length || 0, 
    error: error?.message || 'No error' 
  });

  return { data, error };
}

export async function deleteCommitmentRecord(id: string) {
  const { error } = await supabase
    .from('commitment_records')
    .delete()
    .eq('id', id);

  return { error };
}

// Delete commitment record by commitment_id and date
export async function deleteCommitmentRecordByDate(commitmentId: string, completedAt: string) {
  console.log('🗑️ deleteCommitmentRecordByDate called:', { 
    commitment_id: commitmentId.substring(0, 8) + '...', 
    completed_at: completedAt 
  });

  const { error } = await supabase
    .from('commitment_records')
    .delete()
    .eq('commitment_id', commitmentId)
    .eq('completed_at', completedAt);

  console.log('🗑️ deleteCommitmentRecordByDate result:', { 
    error: error?.message || 'No error' 
  });

  return { error };
}

// Dashboard Data
export async function getDashboardData(userId: string) {
  const { commitments, error: commitmentsError } = await getUserCommitments(userId);
  
  if (commitmentsError) {
    return { data: null, error: commitmentsError };
  }

  // Get records for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  if (!commitments) {
    return { data: [], error: null };
  }

  const recordsPromises = commitments.map((commitment: any) => 
    getCommitmentRecords(commitment.id, startDate, endDate)
  );

  const recordsResults = await Promise.all(recordsPromises);
  
  const dashboardData = commitments.map((commitment: any, index: number) => ({
    ...commitment,
    records: recordsResults[index]?.data || [],
  }));

  return { data: dashboardData, error: null };
}

// Get all records for a user
export async function getAllUserRecords(userId: string) {
  console.log('💾 [DB] getAllUserRecords called for user:', userId);

  const { data, error } = await supabase
    .from('commitment_records')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  console.log('💾 [DB] getAllUserRecords result:', {
    success: !!data,
    recordCount: data?.length || 0,
    error: error?.message || 'No error'
  });

  return { data, error };
}

// One-time seeding for existing commitments without order_rank
export async function seedOrderRanksIfNeeded(userId: string) {
  if (!__DEV__) return { success: true, seeded: 0 }; // Only run in development

  console.log('🌱 Checking if order rank seeding is needed for user:', userId);

  // Check if any commitments have empty order_rank
  const { data: commitmentsNeedingRanks, error: checkError } = await supabase
    .from('commitments')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('order_rank', '');

  if (checkError) {
    console.error('❌ Error checking for commitments needing ranks:', checkError);
    return { success: false, seeded: 0 };
  }

  if (!commitmentsNeedingRanks || commitmentsNeedingRanks.length === 0) {
    console.log('✅ All commitments already have order ranks');
    return { success: true, seeded: 0 };
  }

  console.log('🌱 Found', commitmentsNeedingRanks.length, 'commitments needing order ranks');

  // Import rank utilities
  const { rankAfter } = await import('@/utils/rank');

  // Sort by creation date and assign sequential ranks
  const sortedCommitments = commitmentsNeedingRanks.sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  let lastRank = '';
  const updates = [];

  for (const commitment of sortedCommitments) {
    const newRank = rankAfter(lastRank);
    updates.push({
      id: commitment.id,
      order_rank: newRank
    });
    lastRank = newRank;
  }

  // Batch update all commitments
  try {
    for (const update of updates) {
      await updateOrderRank(update.id, update.order_rank);
    }

    console.log('✅ Successfully seeded', updates.length, 'commitment order ranks');
    return { success: true, seeded: updates.length };
  } catch (error) {
    console.error('❌ Error seeding order ranks:', error);
    return { success: false, seeded: 0 };
  }
}