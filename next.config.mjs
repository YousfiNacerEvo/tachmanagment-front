/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactiver Turbopack pour éviter les problèmes de polices
  experimental: {
    turbo: false,
  },
  
  // Optimisation des polices
  optimizeFonts: true,
  
  // Configuration des polices
  fonts: {
    google: {
      preload: true,
      display: 'swap',
    },
  },
};

export default nextConfig;
