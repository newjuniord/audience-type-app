import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly, NetworkFirst, CacheFirst, StaleWhileRevalidate } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare const self: ServiceWorkerGlobalScope &
    typeof globalThis & {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    };

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {}
}

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
    runtimeCaching: [
        // API routes — Network Only (pas de cache pour les données dynamiques)
        {
            matcher: /^\/api\//,
            handler: new NetworkOnly(),
        },
        // Pages Next.js — Network First avec fallback cache
        {
            matcher: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: new NetworkFirst({
                cacheName: "pages-cache",
                networkTimeoutSeconds: 3,
                plugins: [
                    {
                        cacheWillUpdate: async ({ response }: { response: Response }) => {
                            return response.status === 200 ? response : null;
                        },
                    },
                ],
            }),
        },
        // Images Firebase Storage & CDN — Cache First
        {
            matcher: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: new CacheFirst({
                cacheName: "firebase-images",
                plugins: [],
            }),
        },
        // Google Fonts — Cache First (très stable, change rarement)
        {
            matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: new CacheFirst({
                cacheName: "google-fonts",
            }),
        },
        // Assets statiques (images, icônes locales) — Cache First
        {
            matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/,
            handler: new CacheFirst({
                cacheName: "static-assets",
            }),
        },
        // Défaut Serwist (JS, CSS, etc.)
        ...defaultCache,
    ],
});

serwist.addEventListeners();
