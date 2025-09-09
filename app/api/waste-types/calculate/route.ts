import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const body = await request.json()
    const { tenant_id, items } = body

    if (!tenant_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'tenant_id and items array are required' },
        { status: 400 }
      )
    }

    // Validate items structure
    for (const item of items) {
      if (!item.waste_type_id || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item must have waste_type_id and positive quantity' },
          { status: 400 }
        )
      }
    }

    // Get waste type IDs
    const wasteTypeIds = items.map(item => item.waste_type_id)

    // Fetch waste types with pricing
    const { data: wasteTypes, error: wasteError } = await supabase
      .from('waste_types')
      .select('*')
      .eq('tenant_id', tenant_id)
      .in('id', wasteTypeIds)

    if (wasteError) {
      console.error('Error fetching waste types:', wasteError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch waste types' },
        { status: 500 }
      )
    }

    // Get bonus settings
    const { data: settings, error: settingsError } = await supabase
      .from('waste_bank_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenant_id)
      .in('setting_key', ['bonus_percentage_organic', 'minimum_deposit_amount'])

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, any>) || {}

    const organicBonus = parseFloat(settingsMap.bonus_percentage_organic) || 0
    const minimumDeposit = parseFloat(settingsMap.minimum_deposit_amount) || 0

    // Calculate pricing for each item
    const calculatedItems = items.map(item => {
      const wasteType = wasteTypes?.find(wt => wt.id === item.waste_type_id)
      
      if (!wasteType) {
        return {
          ...item,
          error: 'Waste type not found',
          subtotal: 0,
          base_price: 0,
          bonus_amount: 0
        }
      }

      // Quality adjustments
      const qualityMultiplier = getQualityMultiplier(item.quality_grade || 'standard')
      const contaminationMultiplier = getContaminationMultiplier(item.contamination_level || 'clean')
      
      // Base calculation
      const basePrice = wasteType.price_per_unit * item.quantity
      const qualityAdjustedPrice = basePrice * qualityMultiplier * contaminationMultiplier
      
      // Organic bonus
      let bonusAmount = 0
      if (wasteType.is_organic && organicBonus > 0) {
        bonusAmount = qualityAdjustedPrice * (organicBonus / 100)
      }

      const subtotal = qualityAdjustedPrice + bonusAmount

      return {
        waste_type_id: item.waste_type_id,
        waste_type_name: wasteType.name,
        waste_type_category: wasteType.category,
        quantity: item.quantity,
        unit: wasteType.unit,
        quality_grade: item.quality_grade || 'standard',
        contamination_level: item.contamination_level || 'clean',
        base_price: basePrice,
        quality_multiplier: qualityMultiplier,
        contamination_multiplier: contaminationMultiplier,
        unit_price: wasteType.price_per_unit,
        adjusted_unit_price: wasteType.price_per_unit * qualityMultiplier * contaminationMultiplier,
        bonus_amount: bonusAmount,
        subtotal: subtotal,
        is_organic: wasteType.is_organic,
        suitable_for_maggot: wasteType.suitable_for_maggot,
        environmental_impact_score: wasteType.environmental_impact_score || 0
      }
    })

    // Calculate totals
    const totalWeight = calculatedItems.reduce((sum, item) => {
      return sum + (item.unit === 'kg' ? item.quantity : 0)
    }, 0)

    const totalValue = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalBonus = calculatedItems.reduce((sum, item) => sum + item.bonus_amount, 0)
    const totalBaseValue = calculatedItems.reduce((sum, item) => sum + item.base_price, 0)

    const organicWeight = calculatedItems
      .filter(item => item.is_organic)
      .reduce((sum, item) => sum + (item.unit === 'kg' ? item.quantity : 0), 0)

    const potentialMaggotWeight = calculatedItems
      .filter(item => item.suitable_for_maggot)
      .reduce((sum, item) => sum + (item.unit === 'kg' ? item.quantity : 0), 0)

    // Environmental impact calculation
    const totalEnvironmentalScore = calculatedItems.reduce((sum, item) => {
      return sum + (item.environmental_impact_score * item.quantity)
    }, 0)

    // Estimate CO2 savings (rough calculation)
    const estimatedCO2Saved = totalWeight * 2.3 // kg CO2 per kg waste diverted

    // Check if meets minimum deposit
    const meetsMinimum = totalValue >= minimumDeposit

    return NextResponse.json({
      success: true,
      data: {
        items: calculatedItems,
        summary: {
          total_items: calculatedItems.length,
          total_weight_kg: totalWeight,
          total_value: totalValue,
          total_base_value: totalBaseValue,
          total_bonus: totalBonus,
          organic_weight_kg: organicWeight,
          potential_maggot_weight_kg: potentialMaggotWeight,
          environmental_impact_score: totalEnvironmentalScore,
          estimated_co2_saved_kg: estimatedCO2Saved,
          meets_minimum_deposit: meetsMinimum,
          minimum_deposit_amount: minimumDeposit
        },
        breakdown: {
          by_category: groupByCategory(calculatedItems),
          by_organic: {
            organic_items: calculatedItems.filter(item => item.is_organic),
            non_organic_items: calculatedItems.filter(item => !item.is_organic)
          },
          quality_distribution: getQualityDistribution(calculatedItems)
        }
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getQualityMultiplier(grade: string): number {
  const multipliers = {
    premium: 1.2,
    standard: 1.0,
    low: 0.8
  }
  return multipliers[grade as keyof typeof multipliers] || 1.0
}

function getContaminationMultiplier(level: string): number {
  const multipliers = {
    clean: 1.0,
    minor: 0.95,
    moderate: 0.85,
    high: 0.7
  }
  return multipliers[level as keyof typeof multipliers] || 1.0
}

function groupByCategory(items: any[]): Record<string, any> {
  return items.reduce((acc, item) => {
    const category = item.waste_type_category
    if (!acc[category]) {
      acc[category] = {
        items: [],
        total_weight: 0,
        total_value: 0,
        count: 0
      }
    }
    
    acc[category].items.push(item)
    acc[category].total_weight += (item.unit === 'kg' ? item.quantity : 0)
    acc[category].total_value += item.subtotal
    acc[category].count += 1
    
    return acc
  }, {})
}

function getQualityDistribution(items: any[]): Record<string, number> {
  return items.reduce((acc, item) => {
    const grade = item.quality_grade
    acc[grade] = (acc[grade] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}