import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    // Désactiver en dehors de la production (dev + test)
    disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
    // Déclaration explicite Turbopack (silences warning même en mode webpack)
    turbopack: {},
    transpilePackages: ['react-pdf', 'pdfjs-dist'],
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
    async redirects() {
        return [
            {
                source: '/consultation',
                destination: '/coaching',
                permanent: true,
            },
            {
                source: '/services',
                destination: '/about#services',
                permanent: true,
            },
            {
                source: '/login',
                destination: '/',
                permanent: true,
            },
        ];
    },
};

export default withSerwist(nextConfig);
