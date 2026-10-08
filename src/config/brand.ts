/**
 * Central branding configuration.
 *
 * IMPORTANT: This is the ONLY place the display name, tagline,
 * and brand identity should be defined. Change values here to
 * rebrand the entire application without touching component code.
 */
export const brand = {
  /** Primary display name shown in nav, titles, and metadata */
  name: 'Disastraaa',

  /** Short identifier for compact spaces (badges, tabs) */
  shortName: 'DST',

  /** Tagline used in hero sections and page descriptions */
  tagline: 'Intelligent Disaster Response Platform',

  /** Description for SEO metadata */
  description:
    'AI-powered geospatial disaster intelligence and response platform for India. Multi-hazard detection, real-time risk assessment, and authority command center.',

  /** Keywords for SEO */
  keywords: [
    'disaster management',
    'flood warning',
    'cyclone alert',
    'emergency response',
    'disaster intelligence',
    'India',
  ],

  /** Semantic version — update on each milestone */
  version: '0.1.0-prototype',
} as const;

export type Brand = typeof brand;
