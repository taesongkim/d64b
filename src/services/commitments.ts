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
    .select('*, archived, deleted_at, show_values')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

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
    .select('*, archived, deleted_at, show_values')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

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

export async function deleteCommitment(id: string) {
  const { data, error } = await supabase
    .from('commitments')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
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

  return { data, error };
}

export async function permanentDelete(id: string) {
  const { error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', id);

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