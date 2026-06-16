import type { Contact, ContactTabCounts } from '~/types/contact'

export const contactTabCounts: ContactTabCounts = {
  all: 1284,
  lead: 58,
  reserved: 24,
  active: 1186,
  overdue: 17
}

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Marcus Webb',
    email: 'marcus.webb@email.com',
    phone: '+44 7700 900123',
    type: 'individual',
    status: 'active',
    site: 'Camden Lock',
    lastActivity: { at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp' },
    deals: 2,
    balance: 140,
    owner: { name: 'Jamie Lowe', initials: 'JL' }
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+44 7700 900456',
    type: 'individual',
    status: 'reserved',
    site: 'Stratford',
    lastActivity: { at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), channel: 'email' },
    deals: 1,
    balance: 0,
    owner: { name: 'Priya Sharma', initials: 'PS' }
  },
  {
    id: '3',
    name: 'David Okonkwo',
    email: 'david.okonkwo@acme.co.uk',
    phone: '+44 7700 900789',
    type: 'business',
    status: 'active',
    site: 'Hackney Wick',
    lastActivity: { at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), channel: 'phone' },
    deals: 4,
    balance: 320,
    owner: { name: 'Jamie Lowe', initials: 'JL' }
  },
  {
    id: '4',
    name: 'Emma Richardson',
    email: 'emma.r@email.com',
    phone: '+44 7700 901012',
    type: 'individual',
    status: 'overdue',
    site: 'Camden Lock',
    lastActivity: { at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email' },
    deals: 1,
    balance: 85,
    owner: { name: 'Tom Hughes', initials: 'TH' }
  },
  {
    id: '5',
    name: 'James Patel',
    email: 'james.patel@email.com',
    type: 'individual',
    status: 'lead',
    site: 'Bristol Harbour',
    lastActivity: { at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp' },
    deals: 0,
    balance: 0,
    owner: { name: 'Priya Sharma', initials: 'PS' }
  },
  {
    id: '6',
    name: 'Northgate Storage Ltd',
    email: 'accounts@northgate.co.uk',
    phone: '+44 20 7946 0958',
    type: 'business',
    status: 'active',
    site: 'Leeds Dock',
    lastActivity: { at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), channel: 'phone' },
    deals: 6,
    balance: 1240,
    owner: { name: 'Jamie Lowe', initials: 'JL' }
  },
  {
    id: '7',
    name: 'Olivia Turner',
    email: 'olivia.turner@email.com',
    phone: '+44 7700 902345',
    type: 'individual',
    status: 'reserved',
    site: 'Manchester Yard',
    lastActivity: { at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email' },
    deals: 1,
    balance: 50,
    owner: { name: 'Tom Hughes', initials: 'TH' }
  },
  {
    id: '8',
    name: 'Michael Brooks',
    email: 'm.brooks@email.com',
    type: 'individual',
    status: 'overdue',
    site: 'Stratford',
    lastActivity: { at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), channel: 'phone' },
    deals: 2,
    balance: 210,
    owner: { name: 'Priya Sharma', initials: 'PS' }
  },
  {
    id: '9',
    name: 'Helen Walsh',
    email: 'helen.walsh@email.com',
    phone: '+44 7700 903678',
    type: 'individual',
    status: 'active',
    site: 'Hackney Wick',
    lastActivity: { at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), channel: 'whatsapp' },
    deals: 3,
    balance: 95,
    owner: { name: 'Tom Hughes', initials: 'TH' }
  }
]
