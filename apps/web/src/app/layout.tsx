import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { CartProvider } from '@/components/cart-context';
import { CartDrawer } from '@/components/cart-drawer';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { getCategories } from '@/lib/api';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <CartProvider>
          <Navbar categories={categories} />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
