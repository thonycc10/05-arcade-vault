"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

type UserContextValue = {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  // Render inicial como invitado para evitar hydration mismatch.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.name === "string") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar desde localStorage tras el primer render
        setUser({ name: parsed.name });
      }
    } catch {
      // localStorage bloqueado o JSON inválido: seguir como invitado
    }
  }, []);

  const login = useCallback((name: string) => {
    const u: User = { name: (name || "PLAYER1").toUpperCase().slice(0, 10) };
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const all: SavedScore[] = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, saveScore }),
    [user, login, logout, saveScore],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser debe usarse dentro de <UserProvider>");
  return ctx;
}
