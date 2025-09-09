'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SystemSetting {
  id: string
  setting_key: string
  setting_value: Record<string, unknown> | string | number | boolean
  description: string
  is_public: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'notifications' | 'security'>('general')
  
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('setting_key')

      if (error) throw error

      setSettings(data || [])
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (settingKey: string, newValue: Record<string, unknown> | string | number | boolean) => {
    try {
      setSaving(settingKey)
      
      const { error } = await supabase
        .from('settings')
        .upsert({
          setting_key: settingKey,
          setting_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey)

      if (error) throw error

      // Update local state
      setSettings(settings.map(setting => 
        setting.setting_key === settingKey 
          ? { ...setting, setting_value: newValue }
          : setting
      ))

      alert('Pengaturan berhasil disimpan')
    } catch (error) {
      console.error('Error updating setting:', error)
      alert('Gagal menyimpan pengaturan')
    } finally {
      setSaving(null)
    }
  }

  const getSetting = (key: string, defaultValue: Record<string, unknown> | string | number | boolean | null = null) => {
    const setting = settings.find(s => s.setting_key === key)
    return setting?.setting_value ?? defaultValue
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Koperasi</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Koperasi
            </label>
            <input
              type="text"
              defaultValue={getSetting('coop_name', 'Koperasi Sinoman')}
              onBlur={(e) => updateSetting('coop_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alamat
            </label>
            <textarea
              defaultValue={getSetting('coop_address', '')}
              onBlur={(e) => updateSetting('coop_address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Telepon
              </label>
              <input
                type="tel"
                defaultValue={getSetting('coop_phone', '')}
                onBlur={(e) => updateSetting('coop_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                defaultValue={getSetting('coop_email', '')}
                onBlur={(e) => updateSetting('coop_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Sistem</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Mode Maintenance
              </label>
              <p className="text-xs text-gray-500">
                Aktifkan untuk menonaktifkan akses sementara
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('maintenance_mode', false)}
              onChange={(e) => updateSetting('maintenance_mode', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Registrasi Anggota Baru
              </label>
              <p className="text-xs text-gray-500">
                Izinkan pendaftaran anggota baru
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('allow_registration', true)}
              onChange={(e) => updateSetting('allow_registration', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderFinancialSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Simpanan</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimal Simpanan Pokok
              </label>
              <input
                type="number"
                defaultValue={getSetting('min_pokok_savings', 25000)}
                onBlur={(e) => updateSetting('min_pokok_savings', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimal Simpanan Wajib
              </label>
              <input
                type="number"
                defaultValue={getSetting('min_wajib_savings', 10000)}
                onBlur={(e) => updateSetting('min_wajib_savings', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimal Simpanan Sukarela
              </label>
              <input
                type="number"
                defaultValue={getSetting('min_sukarela_savings', 5000)}
                onBlur={(e) => updateSetting('min_sukarela_savings', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batas Penarikan Harian (IDR)
              </label>
              <input
                type="number"
                defaultValue={getSetting('daily_withdrawal_limit', 2000000)}
                onBlur={(e) => updateSetting('daily_withdrawal_limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Biaya Admin Transfer (%)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={getSetting('transfer_admin_fee', 0.5)}
                onBlur={(e) => updateSetting('transfer_admin_fee', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan E-Commerce</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Aktifkan E-Commerce
              </label>
              <p className="text-xs text-gray-500">
                Izinkan anggota berbelanja produk
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('enable_ecommerce', true)}
              onChange={(e) => updateSetting('enable_ecommerce', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diskon Member (%)
            </label>
            <input
              type="number"
              step="0.1"
              defaultValue={getSetting('member_discount', 10)}
              onBlur={(e) => updateSetting('member_discount', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifikasi Email</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Notifikasi Transaksi Baru
              </label>
              <p className="text-xs text-gray-500">
                Email admin saat ada transaksi baru
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('email_new_transaction', true)}
              onChange={(e) => updateSetting('email_new_transaction', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Notifikasi Anggota Baru
              </label>
              <p className="text-xs text-gray-500">
                Email admin saat ada pendaftaran anggota baru
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('email_new_member', true)}
              onChange={(e) => updateSetting('email_new_member', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Laporan Harian
              </label>
              <p className="text-xs text-gray-500">
                Email laporan aktivitas harian
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('email_daily_report', false)}
              onChange={(e) => updateSetting('email_daily_report', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifikasi Push</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Aktifkan Push Notification
              </label>
              <p className="text-xs text-gray-500">
                Kirim notifikasi push ke aplikasi mobile
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('enable_push_notification', false)}
              onChange={(e) => updateSetting('enable_push_notification', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Keamanan Login</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maksimal Percobaan Login
            </label>
            <input
              type="number"
              defaultValue={getSetting('max_login_attempts', 5)}
              onBlur={(e) => updateSetting('max_login_attempts', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durasi Lockout (menit)
            </label>
            <input
              type="number"
              defaultValue={getSetting('lockout_duration', 30)}
              onBlur={(e) => updateSetting('lockout_duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Wajib Verifikasi Admin
              </label>
              <p className="text-xs text-gray-500">
                Transaksi harus diverifikasi admin
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('require_admin_verification', true)}
              onChange={(e) => updateSetting('require_admin_verification', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Recovery</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto Backup Database
              </label>
              <p className="text-xs text-gray-500">
                Backup otomatis database harian
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked={getSetting('auto_backup', true)}
              onChange={(e) => updateSetting('auto_backup', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Backup yang Disimpan
            </label>
            <input
              type="number"
              defaultValue={getSetting('backup_retention', 30)}
              onBlur={(e) => updateSetting('backup_retention', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-gray-600 mt-1">
          Kelola konfigurasi sistem dan pengaturan koperasi
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Umum
          </button>
          
          <button
            onClick={() => setActiveTab('financial')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'financial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Keuangan
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notifikasi
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Keamanan
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && renderGeneralSettings()}
      {activeTab === 'financial' && renderFinancialSettings()}
      {activeTab === 'notifications' && renderNotificationSettings()}
      {activeTab === 'security' && renderSecuritySettings()}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Menyimpan pengaturan...
        </div>
      )}
    </div>
  )
}