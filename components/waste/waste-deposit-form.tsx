'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { submitWasteDeposit } from '@/lib/waste/actions'

const wasteItemSchema = z.object({
  category_id: z.string().min(1, 'Pilih kategori sampah'),
  weight_kg: z.number().min(0.1, 'Berat minimal 0.1 kg'),
  condition_quality: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
})

const depositSchema = z.object({
  items: z.array(wasteItemSchema).min(1, 'Minimal satu item sampah'),
  collection_point_id: z.string().optional(),
  notes: z.string().optional(),
})

type DepositFormData = z.infer<typeof depositSchema>

interface WasteDepositFormProps {
  memberId: string
  categories: Array<{
    id: string
    category_name: string
    sub_category: string
    buying_price_per_kg: number
    minimum_weight_kg: number
    is_active: boolean
  }>
}

const conditionLabels = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk'
}

const conditionMultipliers = {
  excellent: 1.2,
  good: 1.0,
  fair: 0.8,
  poor: 0.6
}

export default function WasteDepositForm({ memberId, categories }: WasteDepositFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      items: [{ category_id: '', weight_kg: 0, condition_quality: 'good' }],
      notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')

  const calculateItemValue = (categoryId: string, weight: number, condition: keyof typeof conditionMultipliers) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return 0
    
    return category.buying_price_per_kg * weight * conditionMultipliers[condition]
  }

  const calculateTotalValue = () => {
    return watchedItems.reduce((total, item) => {
      if (item.category_id && item.weight_kg) {
        return total + calculateItemValue(item.category_id, item.weight_kg, item.condition_quality)
      }
      return total
    }, 0)
  }

  const calculateTotalWeight = () => {
    return watchedItems.reduce((total, item) => {
      return total + (item.weight_kg || 0)
    }, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const onSubmit = handleSubmit((data) => {
    setError(null)
    setSuccess(false)

    // Validate minimum weights
    const invalidItems = data.items.filter((item) => {
      const category = categories.find(c => c.id === item.category_id)
      return category && item.weight_kg < category.minimum_weight_kg
    })

    if (invalidItems.length > 0) {
      setError('Beberapa item tidak memenuhi berat minimum')
      return
    }

    startTransition(async () => {
      try {
        const result = await submitWasteDeposit(memberId, data)
        
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(true)
          reset()
          setTimeout(() => {
            router.refresh()
            setSuccess(false)
          }, 2000)
        }
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="text-sm">Setor sampah berhasil dicatat! Saldo akan diperbarui.</p>
        </div>
      )}

      {/* Waste Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Item Sampah</h3>
          <button
            type="button"
            onClick={() => append({ category_id: '', weight_kg: 0, condition_quality: 'good' })}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            + Tambah Item
          </button>
        </div>

        {fields.map((field, index) => {
          const selectedCategory = categories.find(c => c.id === watchedItems[index]?.category_id)
          
          return (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori Sampah *
                  </label>
                  <select
                    {...register(`items.${index}.category_id`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.filter(c => c.is_active).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.category_name} - {category.sub_category}
                      </option>
                    ))}
                  </select>
                  {errors.items?.[index]?.category_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.items[index]?.category_id?.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Berat (kg) *
                  </label>
                  <input
                    {...register(`items.${index}.weight_kg`, { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.0"
                  />
                  {selectedCategory && (
                    <p className="mt-1 text-xs text-gray-500">
                      Min: {selectedCategory.minimum_weight_kg} kg
                    </p>
                  )}
                  {errors.items?.[index]?.weight_kg && (
                    <p className="mt-1 text-sm text-red-600">{errors.items[index]?.weight_kg?.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kondisi
                  </label>
                  <select
                    {...register(`items.${index}.condition_quality`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Value Display */}
              {selectedCategory && watchedItems[index]?.weight_kg > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Harga per kg:</span>
                    <span className="font-medium">{formatCurrency(selectedCategory.buying_price_per_kg)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kondisi ({conditionLabels[watchedItems[index].condition_quality]}):</span>
                    <span className="font-medium">×{conditionMultipliers[watchedItems[index].condition_quality]}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-emerald-600 pt-1 border-t mt-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateItemValue(watchedItems[index].category_id, watchedItems[index].weight_kg, watchedItems[index].condition_quality))}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Catatan (opsional)
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Tambahkan catatan jika diperlukan..."
        />
      </div>

      {/* Summary */}
      {watchedItems.some(item => item.category_id && item.weight_kg > 0) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-medium text-emerald-800 mb-2">Ringkasan Setoran</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-700">Total Berat:</span>
              <span className="font-medium text-emerald-800">{calculateTotalWeight().toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Total Nilai:</span>
              <span className="font-medium text-emerald-800">{formatCurrency(calculateTotalValue())}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-emerald-300">
              <span className="text-emerald-700">Admin Fee (2%):</span>
              <span className="font-medium text-emerald-800">{formatCurrency(calculateTotalValue() * 0.02)}</span>
            </div>
            <div className="flex justify-between font-semibold text-emerald-900">
              <span>Diterima ke Saldo:</span>
              <span>{formatCurrency(calculateTotalValue() * 0.98)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={isPending}
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isPending || watchedItems.length === 0}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memproses...
            </span>
          ) : (
            'Setor Sampah'
          )}
        </button>
      </div>
    </form>
  )
}