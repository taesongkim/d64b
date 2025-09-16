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
  const { data, error } = await supabase
    .from('commitments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return { data, error };
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
  const { data: record, error } = await supabase
    .from('commitment_records')
    .insert([data])
    .select()
    .single();

  return { data: record, error };
}

export async function getCommitmentRecords(commitmentId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('commitment_records')
    .select('*')
    .eq('commitment_id', commitmentId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .order('completed_at', { ascending: true });

  return { data, error };
}

export async function deleteCommitmentRecord(id: string) {
  const { error } = await supabase
    .from('commitment_records')
    .delete()
    .eq('id', id);

  return { error };
}

// Dashboard Data
export async function getDashboardData(userId: string) {
  const { data: commitments, error: commitmentsError } = await getUserCommitments(userId);
  
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

  const recordsPromises = commitments.map(commitment => 
    getCommitmentRecords(commitment.id, startDate, endDate)
  );

  const recordsResults = await Promise.all(recordsPromises);
  
  const dashboardData = commitments.map((commitment, index) => ({
    ...commitment,
    records: recordsResults[index]?.data || [],
  }));

  return { data: dashboardData, error: null };
}