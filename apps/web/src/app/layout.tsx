import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { CartProvider } from '@/components/cart-context';
import { CartDrawer } from '@/components/cart-drawer';
import { Footer } from '@/components/footer';
import { AnnouncementBar, Navbar } from '@/components/navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: {
    default: 'Black Horse Shoe — Premium footwear, crafted in Nepal',
    template: '%s — Black Horse Shoe',
  },
  description:
    'Timeless silhouettes built from full-grain leather and hand-finished by master craftsmen in Kathmandu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <CartProvider>
          <AnnouncementBar />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
