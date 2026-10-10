/**
 * Navigation configuration.
 *
 * All nav links and dashboard sidebar groups are defined here.
 * Components consume these arrays — no nav structure is hard-coded
 * inside layout components.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name — resolved to component inside layout components */
  icon?: string;
  description?: string;
  badge?: string;
  isExternal?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Top-level public navigation links */
export const publicNavLinks: NavItem[] = [
  { label: 'Live Map',     href: '/map',     description: 'Live disaster intelligence map' },
  { label: 'Alerts',       href: '/alerts',  description: 'Active warnings and alerts' },
  { label: 'Safe Transit', href: '/travel',  description: 'Route safety assessment' },
  { label: 'Shelters',     href: '/shelters',description: 'Emergency shelter network' },
  { label: 'Reports',      href: '/reports', description: 'Citizen disaster reports' },
  { label: 'About',        href: '/about',   description: 'About the platform' },
];

import { ROLES, type Role } from '@/types/roles';

/** Dashboard sidebar navigation — default groups */
export const dashboardNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Command Center',    href: '/dashboard',  icon: 'LayoutDashboard' },
      { label: 'Situation Analytics', href: '/analytics', icon: 'BarChart2' },
      { label: 'Incident Management', href: '/incidents', icon: 'AlertTriangle' },
      { label: 'Evacuation',           href: '/evacuation', icon: 'Shield'        },
      { label: 'Response Operations',  href: '/operations', icon: 'Truck'         },
      { label: 'Response Simulator',  href: '/simulator', icon: 'Sliders' },
      { label: 'Live Situation Map', href: '/map', icon: 'Map' },
      { label: 'Alerts',    href: '/alerts',      icon: 'Bell' },
    ],
  },
  {
    label: 'Field',
    items: [
      { label: 'Reports',   href: '/reports/manage', icon: 'FileText' },
      { label: 'Shelters',  href: '/shelters',        icon: 'Home' },
      { label: 'Resources', href: '/resources',       icon: 'Package' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Intelligence Assistant', href: '/assistant', icon: 'Bot' },
      { label: 'Risk Analysis',     href: '/state',       icon: 'Activity' },
      { label: 'Historical',        href: '/historical',  icon: 'Clock' },
      { label: 'Planning',          href: '/planning',    icon: 'Calendar' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: 'Settings' },
    ],
  },
];

/** Return role-tailored navigation groups */
export function getDashboardNavGroupsForRole(role: Role = ROLES.STATE_AUTHORITY): NavGroup[] {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return [
        {
          label: 'Platform Core',
          items: [
            { label: 'Platform Governance', href: '/governance', icon: 'ShieldAlert', badge: 'L5' },
            { label: 'Command Center',      href: '/dashboard',  icon: 'LayoutDashboard' },
            { label: 'Situation Analytics', href: '/analytics',  icon: 'BarChart2' },
            { label: 'Incident Management', href: '/incidents',  icon: 'AlertTriangle' },
            { label: 'Response Operations', href: '/operations', icon: 'Truck' },
            { label: 'Response Simulator',  href: '/simulator',  icon: 'Sliders' },
            { label: 'Evacuation',          href: '/evacuation', icon: 'Shield' },
            { label: 'Personnel',           href: '/personnel',  icon: 'ShieldCheck' },
            { label: 'Live Situation Map',  href: '/map',        icon: 'Map' },
          ],
        },
        {
          label: 'Field & Logistics',
          items: [
            { label: 'Citizen Reports', href: '/reports/manage', icon: 'FileText' },
            { label: 'Shelters',        href: '/shelters',        icon: 'Home' },
            { label: 'Resources',       href: '/resources',       icon: 'Package' },
          ],
        },
        {
          label: 'Intelligence & Audit',
          items: [
            { label: 'Intelligence Assistant', href: '/assistant',  icon: 'Bot' },
            { label: 'State Risk Profiles',    href: '/state',      icon: 'Activity' },
            { label: 'Historical Registry',    href: '/historical', icon: 'Clock' },
            { label: 'Strategic Planning',     href: '/planning',   icon: 'Calendar' },
          ],
        },
        {
          label: 'System',
          items: [
            { label: 'System Settings', href: '/settings', icon: 'Settings' },
          ],
        },
      ];

    case ROLES.NATIONAL_AUTHORITY:
      return [
        {
          label: 'National Command',
          items: [
            { label: 'National Situation',   href: '/analytics',  icon: 'BarChart2', badge: 'NDMA' },
            { label: 'Multi-State Command',  href: '/dashboard',  icon: 'LayoutDashboard' },
            { label: 'Incident Escalations', href: '/incidents',  icon: 'AlertTriangle' },
            { label: 'Response Simulator',   href: '/simulator',  icon: 'Sliders' },
            { label: 'Personnel',            href: '/personnel',  icon: 'ShieldCheck' },
            { label: 'Live Situation Map',   href: '/map',        icon: 'Map' },
            { label: 'National Warnings',    href: '/alerts',     icon: 'Bell' },
          ],
        },
        {
          label: 'Intelligence & Synthesis',
          items: [
            { label: 'Intelligence Assistant', href: '/assistant',  icon: 'Bot' },
            { label: 'State Risk Profiles',    href: '/state',      icon: 'Activity' },
            { label: 'National Contingency',   href: '/planning',   icon: 'Calendar' },
            { label: 'Historical Archives',    href: '/historical', icon: 'Clock' },
          ],
        },
        {
          label: 'System',
          items: [
            { label: 'Settings', href: '/settings', icon: 'Settings' },
          ],
        },
      ];

    case ROLES.DISTRICT_AUTHORITY:
      return [
        {
          label: 'District Command',
          items: [
            { label: 'District Operations', href: '/dashboard',  icon: 'LayoutDashboard', badge: 'DEOC' },
            { label: 'Incident Management', href: '/incidents',  icon: 'AlertTriangle' },
            { label: 'Tactical Response',   href: '/operations', icon: 'Truck' },
            { label: 'Evacuation Zones',    href: '/evacuation', icon: 'Shield' },
            { label: 'Personnel',           href: '/personnel',  icon: 'ShieldCheck' },
            { label: 'Live Situation Map', href: '/map',        icon: 'Map' },
            { label: 'District Alerts',     href: '/alerts',     icon: 'Bell' },
          ],
        },
        {
          label: 'Field Coordination',
          items: [
            { label: 'Cyclone Shelters', href: '/shelters',        icon: 'Home' },
            { label: 'Relief Resources', href: '/resources',       icon: 'Package' },
            { label: 'Citizen Reports',  href: '/reports/manage', icon: 'FileText' },
          ],
        },
        {
          label: 'Intelligence',
          items: [
            { label: 'Intelligence Assistant', href: '/assistant',  icon: 'Bot' },
            { label: 'Historical Trends',      href: '/historical', icon: 'Clock' },
          ],
        },
      ];

    case ROLES.FIELD_OPERATOR:
    case ROLES.OPERATIONS:
      return [
        {
          label: 'Tactical Response',
          items: [
            { label: 'Field Operations',    href: '/operations', icon: 'Truck', badge: 'NDRF' },
            { label: 'Assigned Incidents',  href: '/incidents',  icon: 'AlertTriangle' },
            { label: 'Citizen Reports',     href: '/reports/manage', icon: 'FileText' },
            { label: 'Live Situation Map', href: '/map',        icon: 'Map' },
          ],
        },
        {
          label: 'Field Logistics',
          items: [
            { label: 'Shelter Status',      href: '/shelters',   icon: 'Home' },
            { label: 'Equipment & Supplies', href: '/resources', icon: 'Package' },
            { label: 'Weather Warnings',    href: '/alerts',     icon: 'Bell' },
          ],
        },
      ];

    case ROLES.CITIZEN:
    case ROLES.REGISTERED_USER:
      return [
        {
          label: 'Citizen Services',
          items: [
            { label: 'Live Situation Map', href: '/map',      icon: 'Map' },
            { label: 'Active Alerts',       href: '/alerts',   icon: 'Bell' },
            { label: 'Safe Transit',        href: '/travel',   icon: 'Truck' },
            { label: 'Emergency Shelters',  href: '/shelters', icon: 'Home' },
            { label: 'Citizen Reports',     href: '/reports',  icon: 'FileText' },
          ],
        },
      ];

    case ROLES.STATE_AUTHORITY:
    default:
      return [
        {
          label: 'State Command',
          items: [
            { label: 'Command Center',      href: '/dashboard',  icon: 'LayoutDashboard', badge: 'SEOC' },
            { label: 'Situation Analytics', href: '/analytics',  icon: 'BarChart2' },
            { label: 'Incident Management', href: '/incidents',  icon: 'AlertTriangle' },
            { label: 'Evacuation',          href: '/evacuation', icon: 'Shield' },
            { label: 'Response Operations', href: '/operations', icon: 'Truck' },
            { label: 'Response Simulator',  href: '/simulator',  icon: 'Sliders' },
            { label: 'Personnel',           href: '/personnel',  icon: 'ShieldCheck' },
            { label: 'Live Situation Map', href: '/map',        icon: 'Map' },
            { label: 'State Alerts',        href: '/alerts',     icon: 'Bell' },
          ],
        },
        {
          label: 'Field & Logistics',
          items: [
            { label: 'Reports',   href: '/reports/manage', icon: 'FileText' },
            { label: 'Shelters',  href: '/shelters',        icon: 'Home' },
            { label: 'Resources', href: '/resources',       icon: 'Package' },
          ],
        },
        {
          label: 'Intelligence',
          items: [
            { label: 'Intelligence Assistant', href: '/assistant',  icon: 'Bot' },
            { label: 'Risk Analysis',          href: '/state',      icon: 'Activity' },
            { label: 'Historical',             href: '/historical', icon: 'Clock' },
            { label: 'Planning',               href: '/planning',   icon: 'Calendar' },
          ],
        },
        {
          label: 'System',
          items: [
            { label: 'Settings', href: '/settings', icon: 'Settings' },
          ],
        },
      ];
  }
}

