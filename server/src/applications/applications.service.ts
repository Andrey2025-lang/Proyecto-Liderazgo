import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ApproveApplicationDto } from './dto/approve-application.dto';
import { calculateSchedule } from '../loans/loan-calculator';
import { summarizeLoan } from '../loans/loan.utils';
import { round2 } from '../loans/loan-calculator';
import { SettingsService } from '../settings/settings.service';

type AuthUser = { id: string; role: string };
const PRIVACY_VERSION = '2026-10';
const ACTIVE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'RECOMMENDED',
];

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async create(clientId: string, dto: CreateApplicationDto, actorId = clientId) {
    await this.settings.validateProduct(dto.amountRequested, dto.termWeeks, dto.termInstallments, dto.paymentFrequency);
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client || client.role !== 'CLIENT' || client.status !== 'ACTIVE') throw new BadRequestException('Seleccioná un cliente activo.');
    if (await this.prisma.loan.findFirst({ where: { clientId, status: 'PENDING_DISBURSEMENT' } })) {
      throw new ConflictException('Ya hay un préstamo aprobado pendiente de desembolso.');
    }
    if (dto.renewalOfLoanId) await this.validateRenewal(clientId, dto.renewalOfLoanId, dto.amountRequested);
    await this.validateLoanRequest(clientId, dto.renewalOfLoanId);
    if (actorId === clientId && !dto.saveAsDraft) {
      throw new BadRequestException('Guardá la solicitud como borrador, adjuntá tu cédula y luego enviala.');
    }
    if (!dto.acceptPrivacy || !dto.acceptEquifax) {
      throw new BadRequestException(
        'Debes aceptar la política de privacidad y la autorización de consulta.',
      );
    }

    const active = await this.prisma.loanApplication.findFirst({
      where: {
        clientId,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (active) {
      throw new ConflictException(
        'Ya tienes una solicitud en proceso. Puedes revisarla en tu portal.',
      );
    }

    await this.upsertClientProfile(clientId, dto);

    const status = dto.saveAsDraft ? 'DRAFT' : 'SUBMITTED';
    const application = await this.prisma.loanApplication.create({
      data: {
        clientId,
        amountRequested: dto.amountRequested,
        termWeeks: dto.termWeeks,
        termInstallments: dto.termInstallments,
        paymentFrequency: dto.paymentFrequency,
        purpose: dto.purpose,
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
        renewalOfLoanId: dto.renewalOfLoanId,
      },
    }).catch((error) => {
      if (error.code === 'P2002') throw new ConflictException('Ya tenés una solicitud en proceso. Revisala antes de crear otra.');
      throw error;
    });

    await this.saveConsents(clientId, dto.acceptEquifax);
    await this.notify(
      clientId,
      status === 'SUBMITTED' ? 'Solicitud recibida' : 'Borrador guardado',
      status === 'SUBMITTED'
        ? 'Tu solicitud fue recibida y está pendiente de revisión.'
        : 'Puedes continuar tu solicitud cuando quieras desde tu portal.',
    );
    await this.audit.log(actorId, 'CREATE_APPLICATION', 'LoanApplication', application.id, {
      status,
      amountRequested: dto.amountRequested,
      renewalOfLoanId: dto.renewalOfLoanId,
    });

    return this.getMine(clientId, application.id);
  }

  async updateDraft(clientId: string, id: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.loanApplication.findFirst({
      where: { id, clientId },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (application.status !== 'DRAFT') {
      throw new BadRequestException('Solo puedes editar una solicitud en borrador.');
    }
    if (dto.renewalOfLoanId !== undefined && dto.renewalOfLoanId !== application.renewalOfLoanId) throw new BadRequestException('No se puede cambiar el préstamo de origen.');
    await this.settings.validateProduct(dto.amountRequested ?? application.amountRequested, dto.termWeeks ?? application.termWeeks, dto.termInstallments ?? application.termInstallments, dto.paymentFrequency ?? application.paymentFrequency);
    if (application.renewalOfLoanId) await this.validateRenewal(clientId, application.renewalOfLoanId, dto.amountRequested ?? application.amountRequested);
    await this.validateLoanRequest(clientId, application.renewalOfLoanId);
    if (dto.saveAsDraft === false) await this.requireIdentityDocument(id);

    if (dto.acceptPrivacy === false || dto.acceptEquifax === false) {
      throw new BadRequestException('Debes mantener las autorizaciones aceptadas.');
    }

    await this.upsertClientProfile(clientId, dto);
    const submit = dto.saveAsDraft === false;

    const updated = await this.prisma.loanApplication.updateMany({
      where: { id, clientId, status: 'DRAFT' },
      data: {
        amountRequested: dto.amountRequested ?? undefined,
        termWeeks: dto.termWeeks ?? undefined,
        termInstallments: dto.termInstallments ?? undefined,
        paymentFrequency: dto.paymentFrequency ?? undefined,
        purpose: dto.purpose ?? undefined,
        status: submit ? 'SUBMITTED' : undefined,
        submittedAt: submit ? new Date() : undefined,
      },
    });
    if (!updated.count) throw new ConflictException('La solicitud ya fue enviada. Recargá para ver su estado.');

    if (dto.acceptEquifax) {
      await this.saveConsents(clientId, true);
    }

    if (submit) {
      await this.notify(
        clientId,
        'Solicitud enviada',
        'Tu solicitud fue enviada y está pendiente de revisión.',
      );
    }

    await this.audit.log(
      clientId,
      submit ? 'SUBMIT_APPLICATION' : 'UPDATE_APPLICATION',
      'LoanApplication',
      id,
    );

    return this.getMine(clientId, id);
  }

  async submit(clientId: string, id: string) {
    const application = await this.prisma.loanApplication.findFirst({
      where: { id, clientId },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (application.status !== 'DRAFT') {
      throw new BadRequestException('La solicitud ya fue enviada.');
    }
    await this.settings.validateProduct(application.amountRequested, application.termWeeks, application.termInstallments, application.paymentFrequency);
    if (application.renewalOfLoanId) await this.validateRenewal(clientId, application.renewalOfLoanId, application.amountRequested);
    await this.validateLoanRequest(clientId, application.renewalOfLoanId);
    await this.requireIdentityDocument(id);

    const submitted = await this.prisma.loanApplication.updateMany({
      where: { id, clientId, status: 'DRAFT' },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    if (!submitted.count) throw new ConflictException('La solicitud ya fue enviada. Recargá para ver su estado.');
    await this.notify(
      clientId,
      'Solicitud enviada',
      'Tu solicitud fue enviada y está pendiente de revisión.',
    );
    await this.audit.log(clientId, 'SUBMIT_APPLICATION', 'LoanApplication', id);
    return this.getMine(clientId, id);
  }

  async listMine(clientId: string) {
    const applications = await this.prisma.loanApplication.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: true,
        loan: { include: { installments: { orderBy: { number: 'asc' } } } },
      },
    });
    return applications.map((application) => this.decorate(application));
  }

  async getMine(clientId: string, id: string) {
    const application = await this.prisma.loanApplication.findFirst({
      where: { id, clientId },
      include: {
        documents: true,
        client: {
          include: {
            profile: {
              include: {
                assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
          },
        },
        loan: {
          include: {
            installments: { orderBy: { number: 'asc' } },
            payments: { orderBy: { paidAt: 'desc' } },
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    return this.decorate(application);
  }

  async listAll(status?: string, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { client: { is: { name: { contains: search } } } },
        { client: { is: { email: { contains: search } } } },
        { client: { is: { profile: { is: { cedula: { contains: search } } } } } },
      ];
    }

    const applications = await this.prisma.loanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          include: {
            profile: {
              include: {
                assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
          },
        },
        loan: { include: { installments: { orderBy: { number: 'asc' } } } },
        _count: { select: { documents: true } },
      },
    });
    return applications.map((application) => this.decorate(application));
  }

  async getOne(user: AuthUser, id: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            profile: {
              include: {
                assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
          },
        },
        documents: true,
        reviewedBy: { select: { id: true, name: true } },
        loan: {
          include: {
            installments: { orderBy: { number: 'asc' } },
            payments: { orderBy: { paidAt: 'desc' } },
            assignedCollector: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    return this.decorate(application);
  }

  async review(user: AuthUser, id: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
      throw new BadRequestException('La solicitud ya tiene una decisión final.');
    }

    await this.prisma.loanApplication.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNotes: dto.notes ?? application.reviewNotes,
        reviewedById: user.id,
      },
    });

    await this.notify(
      application.clientId,
      dto.status === 'INFO_REQUESTED' ? 'Información solicitada' : 'Solicitud en revisión',
      dto.notes ||
        (dto.status === 'INFO_REQUESTED'
          ? 'Necesitamos información adicional para continuar con tu solicitud.'
          : 'Tu solicitud está siendo revisada por nuestro equipo.'),
    );
    await this.audit.log(user.id, 'REVIEW_APPLICATION', 'LoanApplication', id, {
      status: dto.status,
    });

    return this.getOne(user, id);
  }

  async approve(user: AuthUser, id: string, dto: ApproveApplicationDto) {
    await this.settings.validateProduct(dto.approvedAmount, dto.termWeeks, dto.termInstallments, dto.paymentFrequency);
    if (user.role !== 'ADMIN') throw new ForbiddenException('Solo administración puede aprobar.');
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            profile: {
              include: {
                assignedCollector: { select: { id: true, name: true } },
              },
            },
          },
        },
        loan: true,
      },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (application.loan) {
      throw new ConflictException('Esta solicitud ya tiene un préstamo asociado.');
    }
    if (!['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(application.status)) {
      throw new BadRequestException('La solicitud no está en una etapa aprobable.');
    }
    await this.validateLoanRequest(application.clientId, application.renewalOfLoanId);
    if (dto.approvedAmount > application.amountRequested) {
      throw new BadRequestException(
        'El monto aprobado no puede ser mayor que el monto solicitado.',
      );
    }

    const firstDueDate = parseBusinessDate(dto.firstDueDate);
    if (firstDueDate <= new Date()) throw new BadRequestException('El primer vencimiento debe ser futuro.');
    if (dto.assignedCollectorId) {
      const collector = await this.prisma.user.findFirst({ where: { id: dto.assignedCollectorId, role: 'COLLECTOR', status: 'ACTIVE' } });
      if (!collector) throw new BadRequestException('Seleccioná un cobrador activo.');
    }
    const schedule = calculateSchedule(
      dto.approvedAmount,
      dto.annualRate,
      dto.termInstallments,
      dto.paymentFrequency,
      firstDueDate,
    );

    const loan = await this.prisma.$transaction(async (tx) => {
      let renewalPayoff = 0;
      if (application.renewalOfLoanId) {
        const source = await tx.loan.findUnique({ where: { id: application.renewalOfLoanId }, include: { installments: true } });
        if (!source || source.clientId !== application.clientId || !['ACTIVE', 'DEFAULTED', 'PAID'].includes(source.status)) throw new BadRequestException('El préstamo de origen ya no está disponible para renovar.');
        renewalPayoff = round2(source.installments.reduce((sum, item) => sum + Math.max(0, item.total - item.paidAmount), 0));
        if (dto.approvedAmount <= renewalPayoff) throw new BadRequestException('El monto aprobado debe superar el saldo anterior para entregar un monto neto positivo.');
      }
      await tx.loanApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAmount: dto.approvedAmount,
          annualRate: dto.annualRate,
          approvedTermWeeks: dto.termWeeks,
          approvedTerm: dto.termInstallments,
          approvedFrequency: dto.paymentFrequency,
          firstDueDate,
          decisionAt: new Date(),
          reviewNotes: dto.notes ?? application.reviewNotes,
          reviewedById: user.id,
        },
      });

      const created = await tx.loan.create({
        data: {
          applicationId: id,
          clientId: application.clientId,
          principal: dto.approvedAmount,
          renewalPayoff,
          netDisbursement: round2(dto.approvedAmount - renewalPayoff),
          annualRate: dto.annualRate,
          termWeeks: dto.termWeeks,
          termInstallments: dto.termInstallments,
          paymentFrequency: dto.paymentFrequency,
          startDate: new Date(),
          firstDueDate,
          status: 'PENDING_DISBURSEMENT',
          assignedCollectorId:
            dto.assignedCollectorId ||
            application.client.profile?.assignedCollectorId ||
            null,
        },
      });

      for (const item of schedule) {
        await tx.installment.create({
          data: {
            loanId: created.id,
            number: item.number,
            dueDate: item.dueDate,
            principal: item.principal,
            interest: item.interest,
            total: item.total,
          },
        });
      }

      return tx.loan.findUnique({
        where: { id: created.id },
        include: { installments: { orderBy: { number: 'asc' } } },
      });
    });

    await this.notify(
      application.clientId,
      '¡Solicitud aprobada!',
      `Tu solicitud fue aprobada por ${new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC',
        maximumFractionDigits: 0,
      }).format(dto.approvedAmount)}.`,
    );
    await this.audit.log(user.id, 'APPROVE_APPLICATION', 'LoanApplication', id, {
      loanId: loan?.id,
      approvedAmount: dto.approvedAmount,
    });

    return summarizeLoan(loan);
  }

  async reject(user: AuthUser, id: string, reason: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: { loan: true },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (application.loan) {
      throw new BadRequestException('No se puede rechazar una solicitud con préstamo.');
    }

    await this.prisma.loanApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        decisionAt: new Date(),
        reviewedById: user.id,
      },
    });
    await this.notify(application.clientId, 'Solicitud no aprobada', reason);
    await this.audit.log(user.id, 'REJECT_APPLICATION', 'LoanApplication', id, {
      reason,
    });
    return this.getOne(user, id);
  }

  async addDocument(
    clientId: string,
    id: string,
    file: Express.Multer.File,
    type: string,
  ) {
    if (type !== 'ID_CARD') {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Solo se requiere la cédula de identidad.');
    }
    const application = await this.prisma.loanApplication.findFirst({
      where: { id, clientId },
    });
    if (!application) throw new NotFoundException('Solicitud no encontrada.');
    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
      throw new BadRequestException('No puedes adjuntar documentos a esta solicitud.');
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Solo se permiten archivos PDF, JPG o PNG.');
    }

    const document = await this.prisma.applicationDocument.create({
      data: {
        applicationId: id,
        type: 'ID_CARD',
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    await this.audit.log(clientId, 'UPLOAD_DOCUMENT', 'ApplicationDocument', document.id, {
      applicationId: id,
      type: document.type,
    });

    return {
      id: document.id,
      type: document.type,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      createdAt: document.createdAt,
    };
  }

  async getDocument(user: AuthUser, applicationId: string, documentId: string) {
    const document = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
      include: { application: true },
    });
    if (!document) throw new NotFoundException('Documento no encontrado.');

    if (user.role === 'CLIENT' && document.application.clientId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este documento.');
    }
    if (user.role === 'COLLECTOR') {
      throw new ForbiddenException('No tienes acceso a documentos de solicitudes.');
    }

    return {
      path: join(process.env.UPLOAD_DIR || './uploads', document.storedName),
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  async deleteDocument(clientId: string, applicationId: string, documentId: string) {
    const document = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
      include: { application: true },
    });
    if (!document) throw new NotFoundException('Documento no encontrado.');
    if (document.application.clientId !== clientId) {
      throw new ForbiddenException('No tienes acceso a este documento.');
    }
    if (!['DRAFT', 'SUBMITTED', 'INFO_REQUESTED'].includes(document.application.status)) {
      throw new BadRequestException('No puedes eliminar documentos en esta etapa.');
    }

    await unlink(join(process.env.UPLOAD_DIR || './uploads', document.storedName)).catch(
      () => undefined,
    );
    await this.prisma.applicationDocument.delete({ where: { id: documentId } });
    await this.audit.log(clientId, 'DELETE_DOCUMENT', 'ApplicationDocument', documentId, {
      applicationId,
    });
    return { ok: true };
  }

  private async upsertClientProfile(
    clientId: string,
    dto: Partial<CreateApplicationDto>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('Cliente no encontrado.');

    if (dto.cedula && dto.cedula !== user.profile?.cedula) {
      const exists = await this.prisma.clientProfile.findUnique({
        where: { cedula: dto.cedula },
      });
      if (exists) {
        throw new ConflictException('Esa cédula ya está registrada en otra cuenta.');
      }
    }

    await this.prisma.user.update({
      where: { id: clientId },
      data: {
        name: dto.name ?? user.name,
        phone: dto.phone ?? user.phone,
      },
    });

    const profileData = {
      cedula: dto.cedula ?? user.profile?.cedula,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      address: dto.address ?? undefined,
      community: dto.community ?? undefined,
      occupation: dto.occupation ?? undefined,
      employer: dto.employer ?? undefined,
      employmentStartDate: dto.employmentStartDate
        ? new Date(dto.employmentStartDate)
        : undefined,
      monthlyIncome: dto.monthlyIncome ?? undefined,
      otherIncome: dto.otherIncome ?? undefined,
    };

    if (!profileData.cedula) {
      throw new BadRequestException('La cédula es obligatoria.');
    }

    if (user.profile) {
      await this.prisma.clientProfile.update({
        where: { userId: clientId },
        data: profileData,
      });
    } else {
      await this.prisma.clientProfile.create({
        data: {
          userId: clientId,
          cedula: profileData.cedula,
          birthDate: profileData.birthDate,
          address: profileData.address,
          community: profileData.community,
          occupation: profileData.occupation,
          employer: profileData.employer,
          employmentStartDate: profileData.employmentStartDate,
          monthlyIncome: profileData.monthlyIncome,
          otherIncome: profileData.otherIncome,
        },
      });
    }
  }

  private async requireIdentityDocument(applicationId: string) {
    if (!await this.prisma.applicationDocument.findFirst({ where: { applicationId, type: 'ID_CARD' } })) {
      throw new BadRequestException('Adjuntá tu cédula de identidad antes de enviar la solicitud.');
    }
  }

  private async validateLoanRequest(clientId: string, renewalOfLoanId?: string | null) {
    const loans = await this.prisma.loan.findMany({ where: { clientId, status: { in: ['ACTIVE', 'DEFAULTED', 'PENDING_DISBURSEMENT'] } } });
    if (loans.some((loan) => loan.status === 'PENDING_DISBURSEMENT')) throw new ConflictException('Ya hay un préstamo aprobado pendiente de desembolso.');
    const active = loans.filter((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status));
    if (active.length && !active.some((loan) => loan.id === renewalOfLoanId)) {
      throw new ConflictException('Ya tenés un préstamo activo. Solo podés solicitar la renovación de ese préstamo.');
    }
  }

  private async validateRenewal(clientId: string, loanId: string, amount: number) {
    const source = await this.prisma.loan.findUnique({ where: { id: loanId }, include: { installments: true } });
    if (!source || source.clientId !== clientId || !['ACTIVE', 'DEFAULTED', 'PAID'].includes(source.status)) {
      throw new BadRequestException('Seleccioná uno de tus préstamos activos o pagados para renovar.');
    }
    const completed = await this.prisma.loanApplication.findFirst({ where: { renewalOfLoanId: loanId, loan: { is: { disbursedAt: { not: null } } } } });
    if (completed) throw new ConflictException('Este préstamo ya fue renovado.');
    const balance = round2(source.installments.reduce((sum, item) => sum + Math.max(0, item.total - item.paidAmount), 0));
    if (amount <= balance) throw new BadRequestException('El nuevo monto debe superar el saldo pendiente anterior.');
  }

  private async saveConsents(clientId: string, acceptEquifax: boolean) {
    await this.prisma.consent.upsert({
      where: {
        userId_type_version: {
          userId: clientId,
          type: 'PRIVACY',
          version: PRIVACY_VERSION,
        },
      },
      update: {},
      create: {
        userId: clientId,
        type: 'PRIVACY',
        version: PRIVACY_VERSION,
      },
    });

    if (acceptEquifax) {
      await this.prisma.consent.upsert({
        where: {
          userId_type_version: {
            userId: clientId,
            type: 'EQUIFAX',
            version: PRIVACY_VERSION,
          },
        },
        update: {},
        create: {
          userId: clientId,
          type: 'EQUIFAX',
          version: PRIVACY_VERSION,
        },
      });
    }
  }

  private async notify(userId: string, title: string, message: string) {
    await this.prisma.notification.create({
      data: { userId, title, message },
    });
  }

  private decorate(application: any) {
    if (application?.loan) {
      return {
        ...application,
        loan: summarizeLoan(application.loan),
      };
    }
    return application;
  }
}
import { parseBusinessDate } from '../common/dates';
