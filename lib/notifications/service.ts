import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database.types'

export class NotificationService {
  private supabase = createClient()

  async getNotifications(userId: string, limit = 20) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as Notification[]
  }

  async getUnreadCount(userId: string) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  }

  async markAsRead(notificationId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)

    if (error) throw error
  }

  async markAllAsRead(userId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw error
  }

  async deleteNotification(notificationId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  }

  async deleteAllRead(userId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .eq('is_read', true)

    if (error) throw error
  }

  subscribeToNotifications(
    userId: string,
    onInsert: (notification: Notification) => void,
    onUpdate: (notification: Notification) => void,
    onDelete: (payload: { old: Notification }) => void
  ) {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          onInsert(payload.new as Notification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          onUpdate(payload.new as Notification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          onDelete(payload as { old: Notification })
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }
}

export const notificationService = new NotificationService()