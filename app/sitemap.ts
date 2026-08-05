import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://djrakademi.net'

  const routes = [
    '',
    '/products',
    '/coaching',
    '/kado',
    '/about',
    '/support',
    '/terms',
    '/privacy',
  ]

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : (route === '/products' || route === '/coaching' ? 0.9 : 0.7),
  }))

  return staticEntries
}
