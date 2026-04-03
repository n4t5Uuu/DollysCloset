import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://dollys-closet-admin-and-employee-fawn.vercel.app'

  return {
    rules: {
      userAgent: '*',
      disallow: ['/'], // Block everything
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
