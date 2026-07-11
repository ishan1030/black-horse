export interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stockQty: number;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  categoryName: string;
  categorySlug: string;
  isNew: boolean;
  variants: Variant[];
  images: ProductImage[];
}

export interface GalleryPost {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface CartItem {
  variantId: string;
  productSlug: string;
  name: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
}
