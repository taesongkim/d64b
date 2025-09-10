import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RecordStatus = 'completed' | 'skipped' | 'failed' | 'none';

export interface DayRecord {
  id: string;
  userId: string;
  commitmentId: string;
  date: string;
  status: RecordStatus;
  value?: number;
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
    setRecordStatus: (state, action: PayloadAction<{ commitmentId: string; date: string; status: RecordStatus }>) => {
      const { commitmentId, date, status } = action.payload;
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
        existingRecord.updatedAt = new Date().toISOString();
      } else {
        // Create new record
        const newRecord: DayRecord = {
          id: `temp_${Date.now()}`,
          userId: 'current_user',
          commitmentId,
          date,
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.records.push(newRecord);
      }
    },
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