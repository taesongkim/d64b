import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export type RecordStatus = 'completed' | 'skipped' | 'failed' | 'none';

export interface DayRecord {
  id: string;
  userId: string;
  commitmentId: string;
  date: string;
  status: RecordStatus;
  value?: any; // Can be number, array, object, etc. for different commitment types
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RecordsState {
  records: DayRecord[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RecordsState = {
  records: [],
  isLoading: false,
  error: null,
};

// Thunk to load all user records from database
export const loadAllRecordsThunk = createAsyncThunk(
  'records/loadAllRecords',
  async (userId: string, { rejectWithValue }) => {
    try {
      console.log('💾 [Records] Loading all records for user:', userId);
      const { getAllUserRecords } = await import('@/services/commitments');
      const result = await getAllUserRecords(userId);

      if (result.error) {
        console.error('💾 [Records] Failed to load records:', result.error.message);
        return rejectWithValue(result.error.message);
      }

      // Convert database records to app format
      const records: DayRecord[] = (result.data || []).map(record => {
        console.log('💾 [Records] Converting DB record:', {
          id: record.id,
          value: record.value,
          valueType: typeof record.value,
          status: record.status
        });

        return {
          id: record.id,
          userId: record.user_id || '',
          commitmentId: record.commitment_id,
          date: record.completed_at.split('T')[0], // Extract date part
          status: record.status === 'complete' ? 'completed' as const : record.status,
          value: record.value,
          notes: record.notes,
          createdAt: record.created_at,
          updatedAt: record.updated_at || '',
        };
      });

      console.log('💾 [Records] Loaded', records.length, 'records');
      return records;
    } catch (error) {
      console.error('💾 [Records] Error loading records:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load records');
    }
  }
);

const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setRecords: (state, action: PayloadAction<DayRecord[]>) => {
      state.records = action.payload;
    },
    addRecord: (state, action: PayloadAction<DayRecord>) => {
      const existingIndex = state.records.findIndex(
        r => r.commitmentId === action.payload.commitmentId && r.date === action.payload.date
      );
      if (existingIndex !== -1) {
        state.records[existingIndex] = action.payload;
      } else {
        state.records.push(action.payload);
      }
    },
    updateRecord: (state, action: PayloadAction<{ id: string; updates: Partial<DayRecord> }>) => {
      const { id, updates } = action.payload;
      const index = state.records.findIndex(r => r.id === id);
      if (index !== -1) {
        state.records[index] = { ...state.records[index], ...updates };
      }
    },
    deleteRecord: (state, action: PayloadAction<string>) => {
      state.records = state.records.filter(r => r.id !== action.payload);
    },
    toggleRecord: (state, action: PayloadAction<{ commitmentId: string; date: string }>) => {
      const { commitmentId, date } = action.payload;
      const existingRecord = state.records.find(
        r => r.commitmentId === commitmentId && r.date === date
      );
      
      if (existingRecord) {
        state.records = state.records.filter(
          r => !(r.commitmentId === commitmentId && r.date === date)
        );
      } else {
        const newRecord: DayRecord = {
          id: `temp_${Date.now()}`,
          userId: 'current_user',
          commitmentId,
          date,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.records.push(newRecord);
      }
    },
    setRecordStatus: (state, action: PayloadAction<{ commitmentId: string; date: string; status: RecordStatus; value?: any }>) => {
      const { commitmentId, date, status, value } = action.payload;
      const existingRecord = state.records.find(
        r => r.commitmentId === commitmentId && r.date === date
      );
      
      if (status === 'none') {
        // Remove record if status is 'none'
        state.records = state.records.filter(
          r => !(r.commitmentId === commitmentId && r.date === date)
        );
      } else if (existingRecord) {
        // Update existing record
        existingRecord.status = status;
        existingRecord.value = value;
        existingRecord.updatedAt = new Date().toISOString();
      } else {
        // Create new record
        const newRecord: DayRecord = {
          id: `temp_${Date.now()}`,
          userId: 'current_user',
          commitmentId,
          date,
          status,
          value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.records.push(newRecord);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllRecordsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadAllRecordsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload;
        state.error = null;
      })
      .addCase(loadAllRecordsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setLoading,
  setError,
  setRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  toggleRecord,
  setRecordStatus,
} = recordsSlice.actions;

export default recordsSlice.reducer;