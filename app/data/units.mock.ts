import type { Unit, UnitTabCounts } from '~/types/facility'

export const unitTabCounts: UnitTabCounts = {
  all: 184,
  occupied: 145,
  vacant: 17,
  reserved: 4,
  maintenance: 3
}

export const mockUnits: Unit[] = [
  {
    id: '1',
    name: 'A-001',
    floor: 'G',
    sizeM2: 5,
    type: 'Standard',
    tenantName: 'Marcus Webb',
    status: 'occupied',
    moveInDate: '2024-02-01',
    rentPerMonth: 96
  },
  {
    id: '2',
    name: 'A-002',
    floor: 'G',
    sizeM2: 5,
    type: 'Standard',
    tenantName: 'Sarah Chen',
    status: 'occupied',
    moveInDate: '2024-01-15',
    rentPerMonth: 96
  },
  {
    id: '3',
    name: 'A-077',
    floor: 'G',
    sizeM2: 5,
    type: 'Standard',
    status: 'vacant',
    rentPerMonth: 96
  },
  {
    id: '4',
    name: 'B-104',
    floor: '1',
    sizeM2: 10,
    type: 'XL',
    tenantName: 'Greenfield Logistics',
    status: 'occupied',
    moveInDate: '2023-11-20',
    rentPerMonth: 140
  },
  {
    id: '5',
    name: 'B-105',
    floor: '1',
    sizeM2: 10,
    type: 'XL',
    status: 'reserved',
    rentPerMonth: 140
  },
  {
    id: '6',
    name: 'C-201',
    floor: '2',
    sizeM2: 15,
    type: 'Large',
    tenantName: 'Tom Bradley',
    status: 'occupied',
    moveInDate: '2024-03-10',
    rentPerMonth: 168
  },
  {
    id: '7',
    name: 'C-202',
    floor: '2',
    sizeM2: 15,
    type: 'Large',
    status: 'maintenance',
    rentPerMonth: 168
  },
  {
    id: '8',
    name: 'D-301',
    floor: '3',
    sizeM2: 25,
    type: 'Climate',
    tenantName: 'Artisan Wines Ltd',
    status: 'occupied',
    moveInDate: '2023-08-05',
    rentPerMonth: 648
  },
  {
    id: '9',
    name: 'D-302',
    floor: '3',
    sizeM2: 25,
    type: 'Climate',
    status: 'vacant',
    rentPerMonth: 648
  },
  {
    id: '10',
    name: 'E-401',
    floor: '4',
    sizeM2: 8,
    type: 'Standard',
    tenantName: 'Priya Sharma',
    status: 'occupied',
    moveInDate: '2024-04-22',
    rentPerMonth: 112
  },
  {
    id: '11',
    name: 'E-402',
    floor: '4',
    sizeM2: 8,
    type: 'Standard',
    status: 'vacant',
    rentPerMonth: 112
  },
  {
    id: '12',
    name: 'F-501',
    floor: '5',
    sizeM2: 12,
    type: 'Large',
    tenantName: 'Northbridge Co.',
    status: 'occupied',
    moveInDate: '2023-12-01',
    rentPerMonth: 176
  },
  {
    id: '13',
    name: 'F-502',
    floor: '5',
    sizeM2: 12,
    type: 'Large',
    status: 'reserved',
    rentPerMonth: 176
  },
  {
    id: '14',
    name: 'G-601',
    floor: '6',
    sizeM2: 20,
    type: 'XL',
    tenantName: 'Studio Nine',
    status: 'occupied',
    moveInDate: '2024-01-08',
    rentPerMonth: 248
  },
  {
    id: '15',
    name: 'G-602',
    floor: '6',
    sizeM2: 20,
    type: 'XL',
    status: 'maintenance',
    rentPerMonth: 248
  }
]
