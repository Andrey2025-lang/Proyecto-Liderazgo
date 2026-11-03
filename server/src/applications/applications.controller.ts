import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ApproveApplicationDto } from './dto/approve-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { AssistedApplicationDto } from './dto/assisted-application.dto';

const uploadStorage = diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

@ApiTags('Solicitudes')
@ApiCookieAuth('jyc_token')
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('assisted')
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  createAssisted(@CurrentUser('id') actorId: string, @Body() dto: AssistedApplicationDto) {
    return this.applicationsService.create(dto.clientId, dto, actorId);
  }

  @Post()
  @Roles('CLIENT')
  create(@CurrentUser('id') clientId: string, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(clientId, dto);
  }

  @Get('me')
  @Roles('CLIENT')
  listMine(@CurrentUser('id') clientId: string) {
    return this.applicationsService.listMine(clientId);
  }

  @Get('me/:id')
  @Roles('CLIENT')
  getMine(@CurrentUser('id') clientId: string, @Param('id') id: string) {
    return this.applicationsService.getMine(clientId, id);
  }

  @Patch(':id')
  @Roles('CLIENT')
  updateDraft(
    @CurrentUser('id') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.updateDraft(clientId, id, dto);
  }

  @Post(':id/submit')
  @Roles('CLIENT')
  submit(@CurrentUser('id') clientId: string, @Param('id') id: string) {
    return this.applicationsService.submit(clientId, id);
  }

  @Post(':id/documents')
  @Roles('CLIENT')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser('id') clientId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    if (!file) throw new BadRequestException('Selecciona un archivo.');
    return this.applicationsService.addDocument(clientId, id, file, type);
  }

  @Get(':id/documents/:documentId')
  @Roles('CLIENT', 'ADMIN', 'SUPERVISOR', 'CLERK')
  async download(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const document = await this.applicationsService.getDocument(user, id, documentId);
    res.download(document.path, document.originalName);
  }

  @Delete(':id/documents/:documentId')
  @Roles('CLIENT')
  deleteDocument(
    @CurrentUser('id') clientId: string,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.applicationsService.deleteDocument(clientId, id, documentId);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  listAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.listAll(status, search);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.applicationsService.getOne(user, id);
  }

  @Patch(':id/review')
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  review(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationsService.review(user, id, dto);
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveApplicationDto,
  ) {
    return this.applicationsService.approve(user, id, dto);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  reject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.applicationsService.reject(user, id, dto.reason);
  }
}
