export const STREAK_STORAGE_KEY = "devpathlles.streak.v1";

export interface StreakState {
  currentDays: number;
  bestDays: number;
  lastActivityDate: string | null;
  activityDates: string[];
  demoDate: string | null;
}

export interface StreakUpdate {
  state: StreakState;
  increased: boolean;
  reset: boolean;
  celebrationIndex: number | null;
}

export function createInitialStreakState(): StreakState {
  return {
    currentDays: 0,
    bestDays: 0,
    lastActivityDate: null,
    activityDates: [],
    demoDate: null,
  };
}

export function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToUtcTime(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function shiftDateKey(dateKey: string, days: number): string {
  const shifted = new Date(dateKeyToUtcTime(dateKey) + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseStreakState(value: string | null): StreakState {
  if (!value) return createInitialStreakState();

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return createInitialStreakState();

    const candidate = parsed as Partial<StreakState>;
    const activityDates = Array.isArray(candidate.activityDates) ? candidate.activityDates.filter(isDateKey) : [];
    return {
      currentDays: typeof candidate.currentDays === "number" && candidate.currentDays >= 0 ? candidate.currentDays : 0,
      bestDays: typeof candidate.bestDays === "number" && candidate.bestDays >= 0 ? candidate.bestDays : 0,
      lastActivityDate: isDateKey(candidate.lastActivityDate) ? candidate.lastActivityDate : null,
      activityDates: [...new Set(activityDates)].slice(-35),
      demoDate: isDateKey(candidate.demoDate) ? candidate.demoDate : null,
    };
  } catch (cause) {
    console.error("No se pudo leer la racha guardada", cause);
    return createInitialStreakState();
  }
}

export function recordStreakActivity(state: StreakState, activityDate: string, celebrationIndex: number): StreakUpdate {
  if (state.lastActivityDate === activityDate) {
    return { state, increased: false, reset: false, celebrationIndex: null };
  }

  const elapsedDays = state.lastActivityDate ? (dateKeyToUtcTime(activityDate) - dateKeyToUtcTime(state.lastActivityDate)) / 86_400_000 : null;
  const continuesStreak = elapsedDays === 1;
  const currentDays = continuesStreak ? state.currentDays + 1 : 1;
  const reset = state.currentDays > 0 && elapsedDays !== null && elapsedDays > 1;
  const activityDates = [...new Set([...state.activityDates, activityDate])].sort().slice(-35);
  const nextState: StreakState = {
    ...state,
    currentDays,
    bestDays: Math.max(state.bestDays, currentDays),
    lastActivityDate: activityDate,
    activityDates,
  };

  return { state: nextState, increased: true, reset, celebrationIndex };
}
