/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["socket.io", "socket.io-client"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Externalize socket.io for server-side
    if (isServer) {
      config.externals.push("socket.io", "socket.io-client");
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
