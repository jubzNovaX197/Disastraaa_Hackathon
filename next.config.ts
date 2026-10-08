import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/map',
        permanent: false,
      },
    ];
  },
  // MapLibre GL JS is browser-only; it is dynamically imported inside
  // a useEffect so it never runs on the server. This webpack fallback
  // prevents build errors if any transitive dependency references
  // Node-only built-ins on the client bundle.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
