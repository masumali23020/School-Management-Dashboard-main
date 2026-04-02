/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'images.pexels.com',
          },
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
          },
          {
            protocol: "https", // এখানে আপনার http ছিল, তাই এরর দিচ্ছিল
            hostname: "images.unsplash.com",
          },
          // ডেভেলপমেন্টে অনেক সময় http লাগে তাই এটিও রাখতে পারেন
          {
            protocol: "http",
            hostname: "res.cloudinary.com",
          },
        ],
      },
      experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
      },
};

export default nextConfig;