import type { Site } from '~/types/facility'

export const mockSites: Site[] = [
  {
    id: '1',
    name: 'Camden Lock',
    address: '2 Chalk Farm Rd, London NW1',
    status: 'operational',
    occupancyPercent: 91,
    totalUnits: 184,
    vacantUnits: 17,
    revenue: 27600,
    integrations: ['Stripe', 'Signable', 'Sensorberg']
  },
  {
    id: '2',
    name: 'Stratford',
    address: '14 Westfield Ave, London E20',
    status: 'operational',
    occupancyPercent: 84,
    totalUnits: 156,
    vacantUnits: 25,
    revenue: 22800,
    integrations: ['Stripe', 'Signable']
  },
  {
    id: '3',
    name: 'Hackney Wick',
    address: '8 White Post Ln, London E9',
    status: 'maintenance',
    occupancyPercent: 78,
    totalUnits: 142,
    vacantUnits: 31,
    revenue: 19400,
    integrations: ['Stripe', 'Sensorberg']
  },
  {
    id: '4',
    name: 'Croydon',
    address: '22 High St, Croydon CR0',
    status: 'operational',
    occupancyPercent: 62,
    totalUnits: 132,
    vacantUnits: 50,
    revenue: 12740,
    integrations: ['Stripe']
  }
]
