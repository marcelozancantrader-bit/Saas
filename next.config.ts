import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite next/image otimizar URLs do Supabase Storage (signed + public).
    // Necessário pra fotos do diário, logos do org e portfólio público.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
    // AVIF + WebP automaticamente; PNG/JPEG como fallback.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
