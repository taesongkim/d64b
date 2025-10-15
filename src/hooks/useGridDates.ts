import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getTodayISO,
  toLocalISODate,
  parseLocalISODate,
} from '@/utils/timeUtils';

export type ViewMode = 'daily' | 'weekly';

interface UseGridDatesProps {
  viewMode: ViewMode;
  earliestDate?: string;
  minRecordDate?: string | null;
}

export const useGridDates = ({
  viewMode,
  earliestDate,
  minRecordDate,
}: UseGridDatesProps) => {
  const [dates, setDates] = useState<string[]>([]);
  const FUTURE_BUFFER_DAYS = 60;

  const buildInitialDates = useCallback(() => {
    const list: string[] = [];
    const today = new Date();

    const startISO = earliestDate || minRecordDate || toLocalISODate(today);
    const start = parseLocalISODate(startISO);
    const end = new Date(today);
    end.setDate(end.getDate() + FUTURE_BUFFER_DAYS);

    const cursor = new Date(start);
    while (cursor <= end) {
      list.push(toLocalISODate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return list;
  }, [earliestDate, minRecordDate]);

  useEffect(() => {
    setDates(buildInitialDates());
  }, [buildInitialDates, viewMode]);

  const todayISO = getTodayISO();
  const todayIndex = useMemo(() => {
    if (!dates || dates.length === 0) return 0;
    const idx = dates.indexOf(todayISO);
    return idx >= 0 ? idx : 0;
  }, [dates, todayISO]);

  const appendFutureDates = useCallback(() => {
    if (dates.length === 0) return;
    const last = parseLocalISODate(dates[dates.length - 1]);
    const newDates: string[] = [];
    for (let i = 1; i <= FUTURE_BUFFER_DAYS; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() + i);
      newDates.push(toLocalISODate(d));
    }
    setDates(prev => [...prev, ...newDates]);
  }, [dates]);

  return {
    dates,
    todayIndex,
    appendFutureDates,
  };
};