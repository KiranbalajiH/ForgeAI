"use client";

import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import Cookies from "js-cookie";

import { AuthContextType, User } from "@/types/auth";

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedToken = Cookies.get("token");

    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    Cookies.set("token", newToken);

    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    Cookies.remove("token");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}