'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Notification } from '@/types/database.types'
import { notificationService } from '@/lib/notifications/service'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteAllRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  const loadNotifications = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(userId),
        notificationService.getUnreadCount(userId)
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    try {
      await notificationService.markAllAsRead(user.id)
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [user])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [notifications])

  const deleteAllRead = useCallback(async () => {
    if (!user) return
    try {
      await notificationService.deleteAllRead(user.id)
      setNotifications(prev => prev.filter(n => !n.is_read))
    } catch (error) {
      console.error('Error deleting read notifications:', error)
    }
  }, [user])

  const refreshNotifications = useCallback(async () => {
    if (user) {
      await loadNotifications(user.id)
    }
  }, [user, loadNotifications])

  // Initialize user and load notifications
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await loadNotifications(user.id)
      }
    }
    initUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadNotifications(session.user.id)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, loadNotifications])

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return

    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      // On new notification
      (notification) => {
        setNotifications(prev => [notification, ...prev])
        if (!notification.is_read) {
          setUnreadCount(prev => prev + 1)
        }
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          })
        }

        // Play notification sound
        const audio = new Audio('/notification-sound.mp3')
        audio.play().catch(() => {})
      },
      // On notification update
      (notification) => {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? notification : n)
        )
        // Update unread count if notification was marked as read
        if (notification.is_read) {
          const wasUnread = notifications.find(n => n.id === notification.id && !n.is_read)
          if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      },
      // On notification delete
      (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        if (!payload.old.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [user, notifications])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refreshNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}