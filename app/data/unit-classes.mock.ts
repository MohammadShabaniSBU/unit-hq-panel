import type { UnitClass } from '~/types/facility'

export const mockUnitClasses: UnitClass[] = [
  {
    id: '1',
    name: 'Small',
    minM2: 3,
    maxM2: 5,
    totalUnits: 48,
    occupiedUnits: 42,
    minPrice: 72,
    maxPrice: 96,
    billingLabel: '/month · Rolling',
    features: ['Ground floor', 'Drive-up', '24/7 access']
  },
  {
    id: '2',
    name: 'Medium',
    minM2: 6,
    maxM2: 10,
    totalUnits: 64,
    occupiedUnits: 58,
    minPrice: 148,
    maxPrice: 176,
    billingLabel: 'Monthly / 12-mo',
    features: ['Floors 1–2', 'Lift access', '24/7 access']
  },
  {
    id: '3',
    name: 'Large',
    minM2: 12,
    maxM2: 15,
    totalUnits: 36,
    occupiedUnits: 30,
    minPrice: 198,
    maxPrice: 228,
    billingLabel: 'Monthly / 12-mo',
    features: ['Floors 2–4', 'Lift access', '24/7 access']
  },
  {
    id: '4',
    name: 'XL',
    minM2: 18,
    maxM2: 25,
    totalUnits: 20,
    occupiedUnits: 16,
    minPrice: 288,
    maxPrice: 348,
    billingLabel: 'Monthly / 12-mo',
    features: ['Ground floor', 'Drive-up', '24/7 access']
  },
  {
    id: '5',
    name: 'Climate control',
    minM2: 6,
    maxM2: 12,
    totalUnits: 12,
    occupiedUnits: 10,
    minPrice: 176,
    maxPrice: 218,
    billingLabel: '/month · Rolling',
    features: ['Temp-controlled', 'Humidity sensor', '24/7 access']
  },
  {
    id: '6',
    name: 'Container',
    minM2: 10,
    maxM2: 20,
    totalUnits: 4,
    occupiedUnits: 3,
    minPrice: 120,
    maxPrice: 180,
    billingLabel: '/month · Rolling',
    features: ['Outdoor', 'Drive-up', '24/7 access']
  }
]
