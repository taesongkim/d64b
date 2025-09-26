const marks: Record<string, number> = {};

export const mark = (label: string): void => {
  if (__DEV__) {
    marks[label] = Date.now();
  }
};

export const since = (label: string): number => {
  if (__DEV__) {
    return Date.now() - (marks[label] ?? Date.now());
  }
  return 0;
};