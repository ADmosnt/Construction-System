// src/renderer/src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/database'
import type { AuthUser } from '../types'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isFirstUse: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  completeSetup: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isFirstUse, setIsFirstUse] = useState(false)
  const [loading, setLoading] = useState(true)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Verificar estado inicial
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const result = await db.auth.checkSetup()
        setIsFirstUse(result.needsSetup)
      } catch (error) {
        console.error('Error checking setup:', error)
      } finally {
        setLoading(false)
      }
    }
    checkSetup()
  }, [])

  // Resetear timer de inactividad
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    if (user) {
      inactivityTimer.current = setTimeout(() => {
        setUser(null)
      }, INACTIVITY_TIMEOUT_MS)
    }
  }, [user])

  // Escuchar eventos de actividad del usuario
  useEffect(() => {
    if (!user) {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
        inactivityTimer.current = null
      }
      return
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

    // Throttle para no ejecutar en cada pixel de movimiento
    let lastReset = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastReset > 30000) { // Resetear maximo cada 30s
        lastReset = now
        resetInactivityTimer()
      }
    }

    events.forEach(event => window.addEventListener(event, handleActivity))
    resetInactivityTimer() // Iniciar el primer timer

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [user, resetInactivityTimer])

  const login = async (username: string, password: string) => {
    const authUser = await db.auth.login(username, password)
    setUser(authUser)
  }

  const logout = () => {
    setUser(null)
  }

  const completeSetup = (authUser: AuthUser) => {
    setIsFirstUse(false)
    setUser(authUser)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isFirstUse,
      loading,
      login,
      logout,
      completeSetup
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
