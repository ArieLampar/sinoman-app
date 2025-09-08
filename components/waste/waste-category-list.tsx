'use client'

interface WasteCategoryListProps {
  categories: Array<{
    id: string
    category_name: string
    sub_category: string
    buying_price_per_kg: number
    minimum_weight_kg: number
    is_active: boolean
  }>
}

export default function WasteCategoryList({ categories }: WasteCategoryListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    
    if (name.includes('plastik')) {
      return (
        <div className="bg-blue-100 rounded-lg p-2">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    if (name.includes('kertas') || name.includes('kardus')) {
      return (
        <div className="bg-amber-100 rounded-lg p-2">
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2v8h12V6H4z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    if (name.includes('logam') || name.includes('besi') || name.includes('aluminium')) {
      return (
        <div className="bg-gray-100 rounded-lg p-2">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2L3 7v11h14V7l-7-5zM8.5 15.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    if (name.includes('kaca') || name.includes('botol')) {
      return (
        <div className="bg-green-100 rounded-lg p-2">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    // Default icon for organic/other waste
    return (
      <div className="bg-green-100 rounded-lg p-2">
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM15.95 9.636c-3.118-3.118-8.182-3.118-11.3 0a1 1 0 01-1.414-1.414c3.898-3.898 10.23-3.898 14.128 0a1 1 0 01-1.414 1.414zM14.12 11.464c-1.94-1.94-5.09-1.94-7.031 0a1 1 0 11-1.414-1.414c2.72-2.72 7.138-2.72 9.859 0a1 1 0 01-1.414 1.414zM12.293 13.293a1 1 0 011.414 1.414l-1 1a1 1 0 01-1.414-1.414l1-1z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  const getPriceColor = (price: number) => {
    if (price >= 5000) return 'text-green-600'
    if (price >= 2000) return 'text-amber-600'
    return 'text-gray-600'
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Kategori Sampah</h3>
          <p className="text-gray-600">Kategori sampah akan ditampilkan setelah dikonfigurasi oleh admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Daftar Harga Sampah</h2>
        <p className="text-sm text-gray-600">Harga berlaku per hari ini dan dapat berubah sewaktu-waktu</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.filter(cat => cat.is_active).map(category => (
            <div 
              key={category.id} 
              className="border rounded-lg p-4 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {getCategoryIcon(category.category_name)}
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {category.category_name}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    {category.sub_category}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Harga/kg:</span>
                      <span className={`text-sm font-bold ${getPriceColor(category.buying_price_per_kg)}`}>
                        {formatCurrency(category.buying_price_per_kg)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Min. berat:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {category.minimum_weight_kg} kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Price indicator */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {category.buying_price_per_kg >= 5000 && (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">Harga Tinggi</span>
                      </>
                    )}
                    {category.buying_price_per_kg >= 2000 && category.buying_price_per_kg < 5000 && (
                      <>
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-xs text-amber-600 font-medium">Harga Sedang</span>
                      </>
                    )}
                    {category.buying_price_per_kg < 2000 && (
                      <>
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 font-medium">Harga Standar</span>
                      </>
                    )}
                  </div>
                  
                  <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    Info
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Informasi Penting</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• Harga dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya</li>
                <li>• Kondisi sampah mempengaruhi harga final (Sangat Baik +20%, Baik 100%, Cukup -20%, Buruk -40%)</li>
                <li>• Admin fee 2% akan dipotong dari total nilai</li>
                <li>• Sampah harus bersih dan terpisah sesuai kategori</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}