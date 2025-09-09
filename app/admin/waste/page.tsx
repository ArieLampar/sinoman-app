'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Recycle, 
  Leaf, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

// Mock data - will be replaced with real API calls
const mockStats = {
  totalCollections: 245,
  totalValue: 15420000,
  activeBatches: 8,
  totalMembers: 89,
  co2Savings: 1240,
  wasteProcessed: 2580
}

const mockCollections = [
  {
    id: '1',
    memberName: 'Ibu Sari',
    date: '2025-01-09',
    items: [
      { type: 'Plastik Botol', weight: 2.5, value: 7500 },
      { type: 'Kardus', weight: 1.8, value: 5400 }
    ],
    totalValue: 12900,
    status: 'pending'
  },
  {
    id: '2', 
    memberName: 'Pak Budi',
    date: '2025-01-08',
    items: [
      { type: 'Kaleng', weight: 1.2, value: 8400 }
    ],
    totalValue: 8400,
    status: 'paid'
  }
]

const mockBatches = [
  {
    id: '1',
    batchNumber: 'MG-2025-001',
    startDate: '2025-01-01',
    organicWaste: 45.2,
    expectedYield: 9.0,
    status: 'active',
    daysRemaining: 12
  },
  {
    id: '2',
    batchNumber: 'MG-2024-012', 
    startDate: '2024-12-15',
    organicWaste: 52.8,
    actualYield: 10.8,
    status: 'harvested',
    revenue: 540000
  }
]

function StatCard({ title, value, unit, icon: Icon, trend }: {
  title: string
  value: number
  unit: string
  icon: any
  trend?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {value.toLocaleString('id-ID')}
              </p>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {trend && (
              <p className="text-xs text-green-600 mt-1">{trend}</p>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function CollectionCard({ collection }: { collection: any }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800'
  }

  const statusIcons = {
    pending: Clock,
    paid: CheckCircle,
    processing: Package
  }

  const StatusIcon = statusIcons[collection.status as keyof typeof statusIcons]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold">{collection.memberName}</h4>
            <p className="text-sm text-muted-foreground">{collection.date}</p>
          </div>
          <Badge className={statusColors[collection.status as keyof typeof statusColors]}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-3">
          {collection.items.map((item: any, index: number) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.type}: {item.weight}kg</span>
              <span>Rp {item.value.toLocaleString('id-ID')}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-medium">Total:</span>
          <span className="font-bold text-green-600">
            Rp {collection.totalValue.toLocaleString('id-ID')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function MaggotBatchCard({ batch }: { batch: any }) {
  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    harvested: 'bg-green-100 text-green-800',
    preparing: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold">{batch.batchNumber}</h4>
            <p className="text-sm text-muted-foreground">
              Mulai: {new Date(batch.startDate).toLocaleDateString('id-ID')}
            </p>
          </div>
          <Badge className={statusColors[batch.status as keyof typeof statusColors]}>
            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sampah Organik:</span>
            <span>{batch.organicWaste} kg</span>
          </div>
          
          {batch.status === 'active' && (
            <>
              <div className="flex justify-between text-sm">
                <span>Perkiraan Hasil:</span>
                <span>{batch.expectedYield} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sisa Hari:</span>
                <span className="text-blue-600">{batch.daysRemaining} hari</span>
              </div>
            </>
          )}
          
          {batch.status === 'harvested' && (
            <>
              <div className="flex justify-between text-sm">
                <span>Hasil Panen:</span>
                <span className="text-green-600">{batch.actualYield} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pendapatan:</span>
                <span className="text-green-600 font-medium">
                  Rp {batch.revenue.toLocaleString('id-ID')}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function WasteAdminPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Recycle className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Bank Sampah
              </h1>
              <p className="text-gray-500">
                Kelola sampah, pantau maggot farming, dan lacak dampak lingkungan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="collections">Setoran</TabsTrigger>
            <TabsTrigger value="maggot">Maggot Farming</TabsTrigger>
            <TabsTrigger value="analytics">Analitik</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Setoran"
                value={mockStats.totalCollections}
                unit="kali"
                icon={Package}
                trend="+12% dari bulan lalu"
              />
              <StatCard
                title="Nilai Setoran"
                value={mockStats.totalValue}
                unit="IDR"
                icon={DollarSign}
                trend="+8% dari bulan lalu"
              />
              <StatCard
                title="Batch Aktif"
                value={mockStats.activeBatches}
                unit="batch"
                icon={Leaf}
              />
              <StatCard
                title="Anggota Aktif"
                value={mockStats.totalMembers}
                unit="orang"
                icon={Users}
                trend="+5 anggota baru"
              />
              <StatCard
                title="Penghematan CO₂"
                value={mockStats.co2Savings}
                unit="kg"
                icon={TrendingUp}
                trend="+15% dari target"
              />
              <StatCard
                title="Sampah Diproses"
                value={mockStats.wasteProcessed}
                unit="kg"
                icon={Recycle}
                trend="+22% efisiensi"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Setoran Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCollections.slice(0, 3).map(collection => (
                      <CollectionCard key={collection.id} collection={collection} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Maggot Farming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockBatches.slice(0, 3).map(batch => (
                      <MaggotBatchCard key={batch.id} batch={batch} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manajemen Setoran</h2>
              <Button className="bg-green-600 hover:bg-green-700">
                + Setoran Baru
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockCollections.map(collection => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="maggot" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Maggot Farming</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                + Batch Baru
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockBatches.map(batch => (
                <MaggotBatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">Analitik & Laporan</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dampak Lingkungan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>CO₂ yang Dihemat:</span>
                      <span className="font-bold text-green-600">
                        {mockStats.co2Savings} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sampah Didaur Ulang:</span>
                      <span className="font-bold">{mockStats.wasteProcessed} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tingkat Partisipasi:</span>
                      <span className="font-bold text-blue-600">78%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performa Ekonomi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Nilai Setoran:</span>
                      <span className="font-bold text-green-600">
                        Rp {mockStats.totalValue.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata per Setoran:</span>
                      <span className="font-bold">
                        Rp {Math.round(mockStats.totalValue / mockStats.totalCollections).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pendapatan Maggot:</span>
                      <span className="font-bold text-blue-600">
                        Rp 2.450.000
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}