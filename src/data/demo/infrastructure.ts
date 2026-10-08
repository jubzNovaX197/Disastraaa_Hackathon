/**
 * DEMO DATA — Critical Infrastructure
 *
 * ⚠️  SIMULATED DATA ONLY. Not real government data. For prototype demonstration.
 */

import type { Infrastructure } from '@/data/types';

export const demoInfrastructure: Infrastructure[] = [
  // Hospitals
  {
    id: 'inf-scb-cuttack',
    name: 'SCB Medical College Hospital',
    type: 'HOSPITAL',
    coordinates: [85.8978, 20.4715],
    address: 'Manglabag, Cuttack, Odisha 753007',
    contactPhone: '+91-671-2304001',
    isOperational: true,
    capacity: '1,800 beds',
  },
  {
    id: 'inf-puri-dhh',
    name: 'Puri District HQ Hospital',
    type: 'HOSPITAL',
    coordinates: [85.8200, 19.8195],
    address: 'Grand Road, Puri, Odisha 752001',
    contactPhone: '+91-6752-222301',
    isOperational: true,
    capacity: '300 beds',
  },
  {
    id: 'inf-king-george-vizag',
    name: 'King George Hospital',
    type: 'HOSPITAL',
    coordinates: [83.2966, 17.7210],
    address: 'Maharanipeta, Visakhapatnam, AP 530002',
    contactPhone: '+91-891-2566000',
    isOperational: true,
    capacity: '1,200 beds',
  },
  {
    id: 'inf-aiims-bhubaneswar',
    name: 'AIIMS Bhubaneswar',
    type: 'HOSPITAL',
    coordinates: [85.7758, 20.2641],
    address: 'Sijua, Bhubaneswar, Odisha 751019',
    contactPhone: '+91-674-2476789',
    isOperational: true,
    capacity: '960 beds',
  },
  // Emergency Operations
  {
    id: 'inf-seoc-bbsr',
    name: 'State Emergency Operations Centre',
    type: 'EMERGENCY_OPERATIONS_CENTER',
    coordinates: [85.8245, 20.2756],
    address: 'Rajiv Gandhi Bhawan, Bhubaneswar 751001',
    contactPhone: '+91-674-2534177',
    isOperational: true,
  },
  {
    id: 'inf-deoc-puri',
    name: 'Puri District EOC',
    type: 'EMERGENCY_OPERATIONS_CENTER',
    coordinates: [85.8321, 19.8178],
    address: 'Collectorate, Puri, Odisha 752001',
    contactPhone: '+91-6752-222001',
    isOperational: true,
  },
  // Helipads
  {
    id: 'inf-helipad-puri',
    name: 'Puri Emergency Helipad',
    type: 'HELIPAD',
    coordinates: [85.8150, 19.8230],
    address: 'Puri Beach Road, Puri',
    isOperational: true,
    capacity: '2 medium helicopters',
  },
  {
    id: 'inf-helipad-cuttack',
    name: 'Cuttack NDRF Helipad',
    type: 'HELIPAD',
    coordinates: [85.8612, 20.4445],
    address: 'NDRF 4th Battalion, Cuttack',
    isOperational: true,
    capacity: '3 helicopters',
  },
  // Police
  {
    id: 'inf-police-puri',
    name: 'Puri SP Office — Disaster Cell',
    type: 'POLICE_STATION',
    coordinates: [85.8289, 19.8142],
    address: 'SP Office, Puri, Odisha 752001',
    contactPhone: '+91-6752-222100',
    isOperational: true,
  },
];
