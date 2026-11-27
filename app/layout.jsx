import { Plus_Jakarta_Sans, Outfit, Marcellus_SC } from 'next/font/google';
import './globals.scss';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

// Institution names in the colleges strip: the closest free match to Friz
// Quadrata, the typeface of the Nagarjuna logos.
const marcellus = Marcellus_SC({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marcellus',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ngi.toriiminds.com';
const siteName = 'NGI × ToriiMinds';
const description =
  'ToriiMinds is a comprehensive tech education platform transforming NGI engineering students into industry-ready professionals through structured coding, AI integration, and career-readiness training — from first year through graduation. Explore 5+ flagship programs and 9 specialized tracks.';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NGI × ToriiMinds | Your Gateway to Tech Excellence',
    template: '%s | NGI × ToriiMinds',
  },
  description,
  applicationName: siteName,
  keywords: [
    'ToriiMinds',
    'Nagarjuna Group of Institutions',
    'NGI',
    'tech education',
    'coding programs',
    'AI integration',
    'placement training',
    'career readiness',
    'DSA',
    'MERN stack',
    'Generative AI',
    'ServiceNow',
    'AWS Cloud',
    'DevOps',
    'Bamboo Coder',
    'SkillUp Coder',
    'AI Ready Engineer',
    'Moon Coder',
    'Owl Coder',
    'engineering students',
  ],
  authors: [{ name: 'ToriiMinds' }],
  creator: 'ToriiMinds',
  publisher: 'ToriiMinds',
  category: 'education',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName,
    title: 'NGI × ToriiMinds | Your Gateway to Tech Excellence',
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NGI × ToriiMinds — Your Gateway to Tech Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NGI × ToriiMinds | Your Gateway to Tech Excellence',
    description,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  themeColor: '#E2544C',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable} ${marcellus.variable}`}>
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}

