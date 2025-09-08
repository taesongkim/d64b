import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

type OfflineQueueInsert = Database['public']['Tables']['offline_queue']['Insert'];
type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

class OfflineQueueService {
  private processingQueue = false;

  async addToQueue(
    operation: OperationType,
    tableName: string,
    data: any,
    recordId?: string
  ): Promise<void> {
    try {
      const queueItem: OfflineQueueInsert = {
        operation_type: operation,
        table_name: tableName,
        record_id: recordId || null,
        data: data,
        retry_count: 0,
      };

      const { error } = await supabase
        .from('offline_queue')
        .insert([queueItem]);

      if (error) {
        console.error('Failed to add item to offline queue:', error);
        // Store locally if can't reach database
        this.storeLocallyIfNeeded(queueItem);
      }
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;

    try {
      // Get pending items
      const { data: queueItems, error } = await supabase
        .from('offline_queue')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error || !queueItems) {
        console.error('Failed to fetch queue items:', error);
        return;
      }

      // Process each item
      for (const item of queueItems) {
        await this.processQueueItem(item);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processQueueItem(item: any): Promise<void> {
    try {
      let success = false;

      switch (item.operation_type) {
        case 'INSERT':
          success = await this.processInsert(item);
          break;
        case 'UPDATE':
          success = await this.processUpdate(item);
          break;
        case 'DELETE':
          success = await this.processDelete(item);
          break;
      }

      if (success) {
        // Remove from queue
        await this.removeFromQueue(item.id);
      } else {
        // Update retry count
        await this.updateRetryCount(item.id, item.retry_count + 1);
      }
    } catch (error) {
      console.error('Error processing queue item:', error);
      await this.updateRetryCount(item.id, item.retry_count + 1, error as Error);
    }
  }

  private async processInsert(item: any): Promise<boolean> {
    const { error } = await supabase
      .from(item.table_name)
      .insert([item.data]);

    return !error;
  }

  private async processUpdate(item: any): Promise<boolean> {
    if (!item.record_id) return false;

    const { error } = await supabase
      .from(item.table_name)
      .update(item.data)
      .eq('id', item.record_id);

    return !error;
  }

  private async processDelete(item: any): Promise<boolean> {
    if (!item.record_id) return false;

    const { error } = await supabase
      .from(item.table_name)
      .delete()
      .eq('id', item.record_id);

    return !error;
  }

  private async removeFromQueue(itemId: string): Promise<void> {
    await supabase
      .from('offline_queue')
      .delete()
      .eq('id', itemId);
  }

  private async updateRetryCount(itemId: string, retryCount: number, error?: Error): Promise<void> {
    const maxRetries = 5;
    
    if (retryCount >= maxRetries) {
      // Remove failed item after max retries
      await this.removeFromQueue(itemId);
      return;
    }

    await supabase
      .from('offline_queue')
      .update({
        retry_count: retryCount,
        last_error: error?.message || null,
      })
      .eq('id', itemId);
  }

  private storeLocallyIfNeeded(queueItem: OfflineQueueInsert): void {
    // TODO: Implement local storage fallback when Supabase is unreachable
    console.log('Would store locally:', queueItem);
  }

  // Auto-process queue when connection is restored
  startAutoProcessing(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processQueue();
    }, 30000);

    // Process immediately
    this.processQueue();
  }
}

export const offlineQueue = new OfflineQueueService();