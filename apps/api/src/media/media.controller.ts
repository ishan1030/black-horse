import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MediaService } from './media.service';
import { imageMulterOptions } from './media.storage';

@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly audit: AuditService,
  ) {}

  /** Photo + caption → storefront "From the workshop" gallery. */
  @Post('gallery')
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  async uploadGallery(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('caption') caption: string | undefined,
    @Body('source') source: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('An image file is required');
    const post = await this.media.createGalleryPost(
      file.filename,
      caption,
      source?.slice(0, 40) || 'admin',
    );
    this.audit.log({
      userId: user.id,
      action: 'media.gallery_post',
      entity: 'GalleryPost',
      entityId: post.id,
      after: { imageUrl: post.imageUrl, caption: post.caption },
    });
    return post;
  }

  /** Photo + alt text → product page gallery. */
  @Post('products/:id/images')
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  async uploadProductImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('alt') alt: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('An image file is required');
    const image = await this.media.addProductImage(productId, file.filename, alt);
    this.audit.log({
      userId: user.id,
      action: 'media.product_image',
      entity: 'ProductImage',
      entityId: image.id,
      after: { productId, url: image.url, alt: image.alt },
    });
    return image;
  }

  @Public()
  @Get('gallery')
  listGallery() {
    return this.media.listGallery();
  }
}
