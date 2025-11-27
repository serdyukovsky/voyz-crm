import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { RealtimeGateway } from '@/websocket/realtime.gateway';
import { File } from '@prisma/client';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: RealtimeGateway,
  ) {}

  async create(fileData: {
    fileName: string;
    originalName: string;
    mime: string;
    size: number;
    url: string;
    entityType: string;
    entityId?: string;
    dealId?: string;
    taskId?: string;
    contactId?: string;
    uploadedById: string;
  }): Promise<File> {
    const file = await this.prisma.file.create({
      data: fileData,
    });

    // Emit WebSocket event
    this.websocketGateway.emitFileUploaded(file);

    return file;
  }

  async findByDeal(dealId: string) {
    return this.prisma.file.findMany({
      where: { dealId },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.file.findMany({
      where: { taskId },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByContact(contactId: string) {
    return this.prisma.file.findMany({
      where: { contactId },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    await this.prisma.file.delete({
      where: { id },
    });

    // Emit WebSocket event
    this.websocketGateway.emitFileDeleted(id, {
      dealId: file.dealId,
      taskId: file.taskId,
      contactId: file.contactId,
    });
  }
}





