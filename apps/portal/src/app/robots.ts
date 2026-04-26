import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://admin.dollysclosetph.com'

  return {
    rules: {
      userAgent: '*',
      disallow: ['/'], // Block everything
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
