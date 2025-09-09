'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuditLog } from '@/types/database.types'

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'create' | 'update' | 'delete'>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0]
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [filter, dateRange])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.ilike('action', `%${filter}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setLogs(data || [])
      setCurrentPage(1)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionBadge = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800'
    }

    const actionLower = action.toLowerCase()
    let color = colors.create // default

    for (const [key, value] of Object.entries(colors)) {
      if (actionLower.includes(key)) {
        color = value
        break
      }
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {action}
      </span>
    )
  }

  const getTableBadge = (tableName: string) => {
    const colors = {
      members: 'bg-blue-50 text-blue-700',
      savings_transactions: 'bg-green-50 text-green-700',
      orders: 'bg-orange-50 text-orange-700',
      products: 'bg-purple-50 text-purple-700',
      waste_transactions: 'bg-teal-50 text-teal-700',
      settings: 'bg-gray-50 text-gray-700'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded ${colors[tableName as keyof typeof colors] || colors.settings}`}>
        {tableName}
      </span>
    )
  }

  // Paginate results
  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Audit</h1>
          <p className="text-gray-600 mt-1">
            Riwayat aktivitas sistem dan perubahan data
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Total: {logs.length} log
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Aksi
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tabel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Record ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.user_type === 'admin' ? '👨‍💼' : '👤'} {log.user_type}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {log.user_id?.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTableBadge(log.table_name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {log.record_id?.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, logs.length)} dari {logs.length} log
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">Tidak ada log audit yang ditemukan</p>
            <p className="text-gray-400 text-sm">
              Coba ubah filter atau rentang tanggal
            </p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Informasi Log Audit
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Log audit mencatat semua aktivitas sistem termasuk perubahan data, login/logout, dan aksi administratif. 
                Log disimpan selama 90 hari untuk keperluan keamanan dan audit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}