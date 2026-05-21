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
};

export default withSerwist(nextConfig);

