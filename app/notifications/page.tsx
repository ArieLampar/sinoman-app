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
  Loader2,
  Search
} from 'lucide-react'
import { useNotifications } from '@/providers/notification-provider'
import { NotificationType } from '@/types/database.types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllRead 
  } = useNotifications()
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const filteredNotifications = notifications.filter(notification => {
    // Filter by read status
    if (filter === 'unread' && notification.is_read) return false
    if (filter === 'read' && !notification.is_read) return false
    
    // Filter by type
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)))
    }
  }

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteNotification(id)
    }
    setSelectedIds(new Set())
  }

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedIds) {
      const notification = notifications.find(n => n.id === id)
      if (notification && !notification.is_read) {
        await markAsRead(id)
      }
    }
    setSelectedIds(new Set())
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Notifikasi</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola semua notifikasi Anda di satu tempat
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold">{notifications.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Notifikasi</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Belum Dibaca</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {notifications.length - unreadCount}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Sudah Dibaca</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari notifikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Semua</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Semua Tipe</option>
              <option value="info">Info</option>
              <option value="success">Sukses</option>
              <option value="warning">Peringatan</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleMarkSelectedAsRead}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Tandai Dibaca ({selectedIds.size})
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Hapus ({selectedIds.size})
                </button>
              </>
            )}
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={deleteAllRead}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bell className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Tidak ada notifikasi</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Notifikasi baru akan muncul di sini'}
            </p>
          </div>
        ) : (
          <>
            {/* Select All */}
            {filteredNotifications.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredNotifications.length}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                  <span className="text-sm">Pilih semua ({filteredNotifications.length})</span>
                </label>
              </div>
            )}

            {/* Notification Items */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                    !notification.is_read && "bg-blue-50 dark:bg-blue-900/10"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds)
                          if (e.target.checked) {
                            newSelected.add(notification.id)
                          } else {
                            newSelected.delete(notification.id)
                          }
                          setSelectedIds(newSelected)
                        }}
                        className="mt-1 rounded"
                      />
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={cn(
                            "text-base",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          {notification.action_url && (
                            <Link
                              href={notification.action_url}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                            >
                              Lihat detail
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: id
                              })}
                            </span>
                            {notification.category && (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                {notification.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-1 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              title="Tandai sudah dibaca"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}