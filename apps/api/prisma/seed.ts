import { MovementType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedVariant {
  sku: string;
  size: string;
  color: string;
  price: number;
  costPrice: number;
  stock: number;
}

interface SeedProduct {
  name: string;
  slug: string;
  category: string;
  material: string;
  description: string;
  isFeatured: boolean;
  variants: SeedVariant[];
}

const CATALOG: SeedProduct[] = [
  {
    name: 'Kathmandu Runner',
    slug: 'kathmandu-runner',
    category: 'sneakers',
    material: 'Leather',
    isFeatured: true,
    description:
      'A low-profile everyday sneaker in full-grain Terai leather, stitched and finished by hand in our Kathmandu workshop. Cushioned insole, natural rubber outsole.',
    variants: [
      { sku: 'KR-BLK-41', size: 'EU 41', color: 'Black', price: 7450, costPrice: 4100, stock: 14 },
      { sku: 'KR-BLK-42', size: 'EU 42', color: 'Black', price: 7450, costPrice: 4100, stock: 2 },
      { sku: 'KR-BLK-43', size: 'EU 43', color: 'Black', price: 7450, costPrice: 4100, stock: 12 },
      { sku: 'KR-WHT-42', size: 'EU 42', color: 'White', price: 7450, costPrice: 4100, stock: 9 },
      { sku: 'KR-WHT-44', size: 'EU 44', color: 'White', price: 7450, costPrice: 4100, stock: 8 },
    ],
  },
  {
    name: 'Everest Oxford',
    slug: 'everest-oxford',
    category: 'formal',
    material: 'Full-grain',
    isFeatured: false,
    description:
      'A classic cap-toe oxford in burnished full-grain leather. Goodyear-welted for decades of resoling.',
    variants: [
      { sku: 'EO-BRN-42', size: 'EU 42', color: 'Brown', price: 9200, costPrice: 5300, stock: 10 },
      { sku: 'EO-BRN-43', size: 'EU 43', color: 'Brown', price: 9200, costPrice: 5300, stock: 5 },
      { sku: 'EO-BLK-42', size: 'EU 42', color: 'Black', price: 9200, costPrice: 5300, stock: 11 },
    ],
  },
  {
    name: 'Mustang Chelsea',
    slug: 'mustang-chelsea',
    category: 'boots',
    material: 'Suede',
    isFeatured: true,
    description:
      'A clean-lined chelsea boot in water-resistant Himalayan suede with elastic side gores.',
    variants: [
      { sku: 'MC-TAN-40', size: 'EU 40', color: 'Tan', price: 10800, costPrice: 6400, stock: 6 },
      { sku: 'MC-TAN-42', size: 'EU 42', color: 'Tan', price: 10800, costPrice: 6400, stock: 9 },
      { sku: 'MC-BLK-43', size: 'EU 43', color: 'Black', price: 10800, costPrice: 6400, stock: 7 },
    ],
  },
  {
    name: 'Himal Court',
    slug: 'himal-court',
    category: 'sneakers',
    material: 'Canvas',
    isFeatured: false,
    description:
      'A minimal court sneaker in heavyweight canvas with a leather heel counter.',
    variants: [
      { sku: 'HC-WHT-41', size: 'EU 41', color: 'White', price: 6900, costPrice: 3600, stock: 3 },
      { sku: 'HC-WHT-42', size: 'EU 42', color: 'White', price: 6900, costPrice: 3600, stock: 16 },
      { sku: 'HC-BLK-42', size: 'EU 42', color: 'Black', price: 6900, costPrice: 3600, stock: 13 },
    ],
  },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'owner@blackhorse.shoes';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD must be set before seeding');
  }

  const owner = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Owner',
      role: 'OWNER',
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  const categories: Record<string, string> = {};
  for (const [i, [slug, name]] of [
    ['sneakers', 'Sneakers'],
    ['formal', 'Formal'],
    ['boots', 'Boots'],
  ].entries()) {
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, sortOrder: i + 1 },
    });
    categories[slug] = cat.id;
  }

  for (const item of CATALOG) {
    const existing = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (existing) continue; // idempotent re-runs

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        material: item.material,
        categoryId: categories[item.category],
        isPublished: true,
        isFeatured: item.isFeatured,
        variants: {
          create: item.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            price: v.price,
            costPrice: v.costPrice,
          })),
        },
      },
      include: { variants: true },
    });

    // Stock arrives the only legal way: through the inventory ledger.
    for (const variant of product.variants) {
      const target = item.variants.find((v) => v.sku === variant.sku)!;
      if (target.stock <= 0) continue;
      await prisma.$transaction([
        prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            previousQty: 0,
            newQty: target.stock,
            delta: target.stock,
            type: MovementType.PURCHASE,
            source: 'seed',
            userId: owner.id,
            note: 'Opening stock',
          },
        }),
        prisma.productVariant.update({
          where: { id: variant.id },
          data: { stockQty: target.stock },
        }),
      ]);
    }
  }

  console.log(`Seeded owner ${owner.email}, ${CATALOG.length} products with opening stock.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
