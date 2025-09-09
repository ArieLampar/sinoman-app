'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Recycle, 
  Plus,
  Trash2,
  Calculator,
  CheckCircle,
  Leaf,
  DollarSign
} from 'lucide-react'

// Mock waste types data
const wasteTypes = [
  {
    id: '1',
    name: 'Plastik Botol',
    category: 'plastic',
    pricePerKg: 3000,
    unit: 'kg',
    isOrganic: false,
    suitableForMaggot: false
  },
  {
    id: '2', 
    name: 'Kardus',
    category: 'paper',
    pricePerKg: 3000,
    unit: 'kg',
    isOrganic: false,
    suitableForMaggot: false
  },
  {
    id: '3',
    name: 'Kaleng Aluminium',
    category: 'metal',
    pricePerKg: 7000,
    unit: 'kg',
    isOrganic: false,
    suitableForMaggot: false
  },
  {
    id: '4',
    name: 'Sampah Dapur',
    category: 'organic',
    pricePerKg: 1500,
    unit: 'kg',
    isOrganic: true,
    suitableForMaggot: true
  }
]

interface DepositItem {
  wasteTypeId: string
  wasteType: any
  quantity: number
  qualityGrade: 'premium' | 'standard' | 'low'
  contamination: 'clean' | 'moderate' | 'contaminated'
  value: number
}

export default function DepositPage() {
  const [items, setItems] = useState<DepositItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    wasteTypeId: '',
    quantity: '',
    qualityGrade: 'standard' as const,
    contamination: 'clean' as const
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addItem = () => {
    if (!currentItem.wasteTypeId || !currentItem.quantity) return

    const wasteType = wasteTypes.find(w => w.id === currentItem.wasteTypeId)
    if (!wasteType) return

    const quantity = parseFloat(currentItem.quantity)
    
    // Calculate value with quality and contamination multipliers
    const qualityMultiplier = {
      premium: 1.2,
      standard: 1.0,
      low: 0.8
    }[currentItem.qualityGrade]

    const contaminationMultiplier = {
      clean: 1.0,
      moderate: 0.9,
      contaminated: 0.7
    }[currentItem.contamination]

    const value = quantity * wasteType.pricePerKg * qualityMultiplier * contaminationMultiplier

    const newItem: DepositItem = {
      wasteTypeId: currentItem.wasteTypeId,
      wasteType,
      quantity,
      qualityGrade: currentItem.qualityGrade,
      contamination: currentItem.contamination,
      value
    }

    setItems([...items, newItem])
    setCurrentItem({
      wasteTypeId: '',
      quantity: '',
      qualityGrade: 'standard',
      contamination: 'clean'
    })
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + item.value, 0)
  }

  const getTotalOrganic = () => {
    return items.filter(item => item.wasteType.isOrganic)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleSubmit = async () => {
    if (items.length === 0) return

    setIsSubmitting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset form
      setItems([])
      alert('Setoran berhasil! Saldo akan ditambahkan ke akun Anda.')
    } catch (error) {
      alert('Terjadi kesalahan saat menyetor. Silakan coba lagi.')
    }
    
    setIsSubmitting(false)
  }

  const qualityOptions = [
    { value: 'premium', label: 'Premium (+20%)', color: 'text-green-600' },
    { value: 'standard', label: 'Standard', color: 'text-blue-600' },
    { value: 'low', label: 'Rendah (-20%)', color: 'text-orange-600' }
  ]

  const contaminationOptions = [
    { value: 'clean', label: 'Bersih', color: 'text-green-600' },
    { value: 'moderate', label: 'Sedang (-10%)', color: 'text-yellow-600' },
    { value: 'contaminated', label: 'Kotor (-30%)', color: 'text-red-600' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Recycle className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Setor Sampah</h1>
              <p className="text-gray-500">
                Daftarkan sampah Anda dan dapatkan poin atau uang tunai
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Tambah Item Sampah
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wasteType">Jenis Sampah</Label>
                    <Select
                      value={currentItem.wasteTypeId}
                      onValueChange={(value) => setCurrentItem({...currentItem, wasteTypeId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis sampah" />
                      </SelectTrigger>
                      <SelectContent>
                        {wasteTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Rp {type.pricePerKg.toLocaleString('id-ID')}/{type.unit}
                              </Badge>
                              {type.isOrganic && <Leaf className="h-3 w-3 text-green-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Berat (kg)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kualitas</Label>
                    <Select
                      value={currentItem.qualityGrade}
                      onValueChange={(value: any) => setCurrentItem({...currentItem, qualityGrade: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tingkat Kebersihan</Label>
                    <Select
                      value={currentItem.contamination}
                      onValueChange={(value: any) => setCurrentItem({...currentItem, contamination: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contaminationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={addItem} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!currentItem.wasteTypeId || !currentItem.quantity}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah ke Daftar
                </Button>
              </CardContent>
            </Card>

            {/* Items List */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Setoran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.wasteType.name}</span>
                          {item.wasteType.isOrganic && (
                            <Badge variant="outline" className="text-green-600">
                              <Leaf className="w-3 h-3 mr-1" />
                              Organik
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.quantity} kg • {item.qualityGrade} • {item.contamination}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-600">
                          Rp {item.value.toLocaleString('id-ID')}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Ringkasan Setoran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Item:</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total Berat:</span>
                    <span className="font-medium">
                      {items.reduce((sum, item) => sum + item.quantity, 0).toFixed(1)} kg
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Sampah Organik:</span>
                    <span className="font-medium text-green-600">
                      {getTotalOrganic().toFixed(1)} kg
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total Nilai:</span>
                    <span className="font-bold text-green-600">
                      Rp {getTotalValue().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={items.length === 0 || isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Setor Sampah
                    </>
                  )}
                </Button>

                {getTotalOrganic() > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Leaf className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="text-xs text-green-700">
                        <strong>Bonus Maggot!</strong> Sampah organik Anda akan diproses 
                        menjadi maggot dan kompos. Dapatkan bonus pendapatan dari hasil panen.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tips Setoran</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p>• Sampah dalam kondisi bersih mendapat nilai lebih tinggi</p>
                <p>• Pisahkan sampah organik untuk program maggot farming</p>
                <p>• Kualitas premium memberikan bonus 20%</p>
                <p>• Hindari mencampur jenis sampah yang berbeda</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}