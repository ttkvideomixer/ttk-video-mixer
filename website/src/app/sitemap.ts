import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const routes = ['/', '/login', '/criar-conta', '/download', '/termos', '/privacidade', '/suporte', '/changelog']

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.5
  }))
}
