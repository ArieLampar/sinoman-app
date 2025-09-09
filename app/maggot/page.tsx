'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Leaf, 
  Plus,
  Calendar,
  Thermometer,
  Droplets,
  TrendingUp,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// Mock data for maggot batches
const mockBatches = [
  {
    id: '1',
    batchNumber: 'MG-2025-001',
    startDate: '2025-01-01',
    expectedHarvest: '2025-01-15',
    status: 'active',
    organicWaste: 45.2,
    estimatedYield: 9.0,
    currentTemp: 28,
    humidity: 65,
    daysRemaining: 6,
    progress: 60,
    notes: 'Pertumbuhan normal, suhu stabil'
  },
  {
    id: '2',
    batchNumber: 'MG-2024-012',
    startDate: '2024-12-15',
    harvestDate: '2024-12-30',
    status: 'harvested',
    organicWaste: 52.8,
    actualYield: 10.8,
    revenue: 540000,
    conversionRate: 20.5,
    notes: 'Panen berhasil, kualitas premium'
  },
  {
    id: '3',
    batchNumber: 'MG-2025-002', 
    startDate: '2025-01-05',
    expectedHarvest: '2025-01-20',
    status: 'preparing',
    organicWaste: 38.5,
    estimatedYield: 7.7,
    notes: 'Persiapan substrat, menunggu telur'
  }
]

function BatchCard({ batch }: { batch: any }) {
  const statusConfig = {
    preparing: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      label: 'Persiapan'
    },
    active: {
      color: 'bg-blue-100 text-blue-800', 
      icon: TrendingUp,
      label: 'Aktif'
    },
    harvested: {
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      label: 'Dipanen'
    }
  }

  const config = statusConfig[batch.status as keyof typeof statusConfig]
  const StatusIcon = config.icon

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{batch.batchNumber}</h3>
            <p className="text-sm text-gray-500">
              Mulai: {new Date(batch.startDate).toLocaleDateString('id-ID')}
            </p>
          </div>
          <Badge className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Sampah Organik</p>
              <p className="text-lg font-semibold">{batch.organicWaste} kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">
                {batch.status === 'harvested' ? 'Hasil Panen' : 'Estimasi Hasil'}
              </p>
              <p className="text-lg font-semibold text-green-600">
                {batch.actualYield || batch.estimatedYield} kg
              </p>
            </div>
          </div>

          {batch.status === 'active' && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{batch.daysRemaining} hari tersisa</span>
                </div>
                <Progress value={batch.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-xs text-gray-500">Suhu</p>
                    <p className="text-sm font-medium">{batch.currentTemp}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Kelembaban</p>
                    <p className="text-sm font-medium">{batch.humidity}%</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {batch.status === 'harvested' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Konversi Rate</p>
                <p className="text-sm font-semibold">{batch.conversionRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pendapatan</p>
                <p className="text-sm font-semibold text-green-600">
                  Rp {batch.revenue?.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )}

          {batch.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600">{batch.notes}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {batch.status === 'active' && (
              <>
                <Button size="sm" variant="outline" className="flex-1">
                  <Thermometer className="w-4 h-4 mr-1" />
                  Update Data
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-green-50">
                  <Package className="w-4 h-4 mr-1" />
                  Panen
                </Button>
              </>
            )}
            {batch.status === 'preparing' && (
              <Button size="sm" variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-1" />
                Mulai Batch
              </Button>
            )}
            {batch.status === 'harvested' && (
              <Button size="sm" variant="outline" className="w-full">
                <DollarSign className="w-4 h-4 mr-1" />
                Detail Panen
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewBatchDialog() {
  const [formData, setFormData] = useState({
    organicWaste: '',
    expectedYield: '',
    notes: ''
  })

  const calculateEstimate = () => {
    const waste = parseFloat(formData.organicWaste)
    if (waste > 0) {
      // Typical conversion rate is 15-25%
      const estimate = waste * 0.2
      setFormData({...formData, expectedYield: estimate.toFixed(1)})
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Batch Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            Buat Batch Maggot Baru
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="organicWaste">Sampah Organik (kg)</Label>
            <div className="flex gap-2">
              <Input
                id="organicWaste"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.organicWaste}
                onChange={(e) => setFormData({...formData, organicWaste: e.target.value})}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={calculateEstimate}
                disabled={!formData.organicWaste}
              >
                Hitung
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedYield">Estimasi Hasil (kg)</Label>
            <Input
              id="expectedYield"
              type="number"
              step="0.1"
              placeholder="0.0"
              value={formData.expectedYield}
              onChange={(e) => setFormData({...formData, expectedYield: e.target.value})}
            />
            <p className="text-xs text-gray-500">
              Konversi normal: 15-25% dari berat sampah organik
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan untuk batch ini..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Buat Batch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function MaggotPage() {
  const [activeTab, setActiveTab] = useState('active')

  const filteredBatches = mockBatches.filter(batch => {
    if (activeTab === 'active') return batch.status === 'active' || batch.status === 'preparing'
    if (activeTab === 'completed') return batch.status === 'harvested'
    return true
  })

  const totalStats = {
    activeBatches: mockBatches.filter(b => b.status === 'active').length,
    totalWaste: mockBatches.reduce((sum, b) => sum + b.organicWaste, 0),
    totalRevenue: mockBatches
      .filter(b => b.status === 'harvested')
      .reduce((sum, b) => sum + (b.revenue || 0), 0),
    avgConversion: mockBatches
      .filter(b => b.status === 'harvested')
      .reduce((sum, b, _, arr) => sum + (b.conversionRate || 0) / arr.length, 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Leaf className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Maggot Farming
                </h1>
                <p className="text-gray-500">
                  Kelola budidaya maggot dari sampah organik
                </p>
              </div>
            </div>
            <NewBatchDialog />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Batch Aktif</p>
                  <p className="text-2xl font-bold">{totalStats.activeBatches}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sampah</p>
                  <p className="text-2xl font-bold">{totalStats.totalWaste.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendapatan</p>
                  <p className="text-2xl font-bold">
                    {(totalStats.totalRevenue / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-muted-foreground">IDR</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Konversi Rate</p>
                  <p className="text-2xl font-bold">{totalStats.avgConversion.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">%</p>
                </div>
                <Thermometer className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'active' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Batch Aktif ({mockBatches.filter(b => b.status === 'active' || b.status === 'preparing').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'completed' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Selesai ({mockBatches.filter(b => b.status === 'harvested').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Semua ({mockBatches.length})
          </button>
        </div>

        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>

        {filteredBatches.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tidak ada batch ditemukan
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'active' 
                  ? 'Belum ada batch aktif saat ini' 
                  : 'Belum ada batch yang selesai'
                }
              </p>
              {activeTab === 'active' && <NewBatchDialog />}
            </CardContent>
          </Card>
        )}

        {/* Tips Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Tips Maggot Farming
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">🌡️ Suhu Optimal</h4>
              <p className="text-gray-600">Jaga suhu 25-30°C untuk pertumbuhan optimal maggot</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">💧 Kelembaban</h4>
              <p className="text-gray-600">Kelembaban 60-70% mendukung perkembangan yang baik</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">⏱️ Siklus Panen</h4>
              <p className="text-gray-600">Panen dilakukan setiap 14-21 hari setelah telur menetas</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🥬 Jenis Sampah</h4>
              <p className="text-gray-600">Sisa makanan, sayuran busuk, dan limbah organik lembut</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">⚖️ Rasio Konversi</h4>
              <p className="text-gray-600">1 kg sampah organik = 150-250g maggot segar</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">💰 Nilai Ekonomi</h4>
              <p className="text-gray-600">Maggot segar: Rp 50.000/kg, kering: Rp 80.000/kg</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}