import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import { queryClient } from './query'
import type { Role, User } from './types'

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  name: string
  email: string
  phone?: string
  cedula: string
  community?: string
  occupation?: string
  password: string
  acceptPrivacy: boolean
  acceptEquifax: boolean
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  homeForRole: (role?: Role) => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    const { data } = await api.post<User>('/auth/login', input)
    queryClient.clear()
    setUser(data)
    return data
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await api.post<User>('/auth/register', input)
    queryClient.clear()
    setUser(data)
    return data
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    queryClient.clear()
    setUser(null)
  }, [])

  const homeForRole = useCallback((role?: Role) => {
    if (!role) return '/'
    return role === 'CLIENT' ? '/app' : '/admin'
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, homeForRole }),
    [user, loading, login, register, logout, refresh, homeForRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  }
  return context
}
