import { Middleware } from '@reduxjs/toolkit';
// import { DatabaseService } from '@/services/database'; // Disabled - using Supabase
import { 
  addCommitment, 
  updateCommitment, 
  deleteCommitment,
  setCommitments,
  updateStreak
} from '@/store/slices/commitmentsSlice';
import { 
  addRecord, 
  updateRecord, 
  deleteRecord, 
  toggleRecord,
  setRecords 
} from '@/store/slices/recordsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { StreakCalculator } from '@/utils/streakCalculation';

export const databaseMiddleware: Middleware = (store) => (next) => async (action) => {
  const result = next(action);

  try {
    // Skip middleware for actions that are already handled with immediate saves
    // These actions now save directly to Supabase in their respective handlers
    if (addCommitment.match(action)) {
      // Skip - handled directly in handleAddCommitment
      console.log('⏭️ Skipping middleware for addCommitment (immediate save)');
      return result;
    }

    if (updateCommitment.match(action)) {
      const state = store.getState();
      const commitment = state.commitments.commitments.find(c => c.id === action.payload.id);
      if (commitment) {
        store.dispatch(addToQueue({
          type: 'UPDATE',
          entity: 'commitment',
          entityId: action.payload.id,
          data: commitment
        }));
      }
    }

    if (deleteCommitment.match(action)) {
      store.dispatch(addToQueue({
        type: 'DELETE',
        entity: 'commitment',
        entityId: action.payload,
        data: { id: action.payload }
      }));
    }

    // Handle record actions - Skip those with immediate saves
    if (addRecord.match(action)) {
      // Skip - will be handled when we implement immediate record saves
      console.log('⏭️ Skipping middleware for addRecord (immediate save)');
      return result;
    }

    if (updateRecord.match(action)) {
      const state = store.getState();
      const record = state.records.records.find(r => r.id === action.payload.id);
      if (record) {
        store.dispatch(addToQueue({
          type: 'UPDATE',
          entity: 'record',
          entityId: action.payload.id,
          data: record
        }));
      }
    }

    if (deleteRecord.match(action)) {
      store.dispatch(addToQueue({
        type: 'DELETE',
        entity: 'record',
        entityId: action.payload,
        data: { id: action.payload }
      }));
    }

    if (toggleRecord.match(action)) {
      const state = store.getState();
      const { commitmentId, date } = action.payload;
      
      // Find if record exists after the toggle
      const existingRecord = state.records.records.find(
        r => r.commitmentId === commitmentId && r.date === date
      );

      if (existingRecord) {
        // Record was created
        store.dispatch(addToQueue({
          type: 'CREATE',
          entity: 'record',
          entityId: existingRecord.id,
          data: existingRecord
        }));
      } else {
        // Record was deleted - add to sync queue
        store.dispatch(addToQueue({
          type: 'DELETE',
          entity: 'record',
          entityId: `${commitmentId}_${date}`,
          data: { commitmentId, date }
        }));
      }

      // Update streak calculation
      const updatedState = store.getState();
      const streakData = StreakCalculator.calculateStreakData(
        commitmentId, 
        updatedState.records.records
      );
      
      store.dispatch(updateStreak({
        id: commitmentId,
        streak: streakData.currentStreak
      }));
    }

  } catch (error) {
    console.error('Database middleware error:', error);
  }

  return result;
};

// Helper function to load initial data (disabled - using Supabase)
export const loadInitialDataFromDatabase = async (dispatch: any) => {
  try {
    // TODO: Load data from Supabase when connected
    console.log('Database loading disabled - using Supabase');
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
};