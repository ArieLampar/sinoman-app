'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  XCircle,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useNotifications } from '@/providers/notification-provider'
import type { Notification, NotificationType } from '@/types/database.types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NotificationDropdownProps {
  onClose?: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllRead 
  } = useNotifications()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await deleteNotification(id)
    setDeletingId(null)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    if (notification.action_url && onClose) {
      onClose()
    }
  }

  return (
    <div className="w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={markAllAsRead}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                onClick={deleteAllRead}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Hapus yang sudah dibaca"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mb-2 text-gray-300" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  !notification.is_read && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className={cn(
                        "text-sm",
                        !notification.is_read && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      {notification.action_url && (
                        <Link
                          href={notification.action_url}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          Lihat detail
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: id
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-start gap-1">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Tandai sudah dibaca"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deletingId === notification.id}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Hapus"
                    >
                      {deletingId === notification.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-sm text-primary hover:underline"
          >
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  )
}