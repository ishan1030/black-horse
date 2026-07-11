import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanCaption(caption: string | undefined): string {
    const text = (caption ?? '').trim();
    if (text.length > 500) {
      throw new BadRequestException('Caption must be 500 characters or fewer');
    }
    return text;
  }

  createGalleryPost(filename: string, caption: string | undefined, source: string) {
    return this.prisma.galleryPost.create({
      data: {
        imageUrl: `/uploads/${filename}`,
        caption: this.cleanCaption(caption),
        source,
      },
    });
  }

  async addProductImage(productId: string, filename: string, alt: string | undefined) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const last = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
    });
    return this.prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/${filename}`,
        alt: this.cleanCaption(alt) || product.name,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  listGallery(take = 12) {
    return this.prisma.galleryPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
