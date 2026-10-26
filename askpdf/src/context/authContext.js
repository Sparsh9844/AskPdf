import { createContext } from 'react';

/** { user, status: 'authenticated' | 'anonymous', login, register, logout, updateUser, notice } */
export const AuthContext = createContext(null);
