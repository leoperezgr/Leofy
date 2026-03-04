import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type AppDateContextType = {
  getAppDate: () => Date;
  dateOverride: Date | null;
  setDateOverride: (d: Date | null) => void;
  isOverrideActive: boolean;
};

const AppDateContext = createContext<AppDateContextType>({
  getAppDate: () => new Date(),
  dateOverride: null,
  setDateOverride: () => {},
  isOverrideActive: false,
});

const APP_DATE_OVERRIDE_KEY = 'leofy_app_date_override';

function loadPersistedDateOverride() {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(APP_DATE_OVERRIDE_KEY);
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function AppDateProvider({ children }: { children: ReactNode }) {
  const [dateOverride, setDateOverrideState] = useState<Date | null>(() => loadPersistedDateOverride());

  const setDateOverride = useCallback((nextDate: Date | null) => {
    setDateOverrideState(nextDate);

    if (typeof window === 'undefined') return;

    if (nextDate) {
      window.localStorage.setItem(APP_DATE_OVERRIDE_KEY, nextDate.toISOString());
      return;
    }

    window.localStorage.removeItem(APP_DATE_OVERRIDE_KEY);
  }, []);

  const getAppDate = useCallback(() => {
    return dateOverride ? new Date(dateOverride) : new Date();
  }, [dateOverride]);

  return (
    <AppDateContext.Provider
      value={{
        getAppDate,
        dateOverride,
        setDateOverride,
        isOverrideActive: dateOverride !== null,
      }}
    >
      {children}
    </AppDateContext.Provider>
  );
}

export function useAppDate() {
  return useContext(AppDateContext);
}
