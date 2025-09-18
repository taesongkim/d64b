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
    .select('*')
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
  console.log('🔄 upsertCommitmentRecord called:', { 
    commitment_id: data.commitment_id?.substring(0, 8) + '...', 
    completed_at: data.completed_at,
    status: data.status 
  });

  const { data: record, error } = await supabase
    .from('commitment_records')
    .upsert([data], { 
      onConflict: 'commitment_id,completed_at',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  console.log('🔄 upsertCommitmentRecord result:', { 
    success: !!record, 
    error: error?.message || 'No error' 
  });

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