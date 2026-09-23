import { Injectable } from '@nestjs/common';
import { isAdmin } from '@forestwatch/auth';
import { Prisma } from '@forestwatch/database';
import type { NativeStatus, SpeciesDetail, SpeciesListPage, SpeciesSummary } from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCreateSpeciesBody, ParsedSpeciesQuery, ParsedUpdateSpeciesBody } from '@forestwatch/validation';
import { ApiException } from '../common/http/api-exception';
import type { RequestUser } from '../auth/types';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const speciesInclude = {
  _count: { select: { plantations: true } },
} satisfies Prisma.SpeciesInclude;

type SpeciesRecord = Prisma.SpeciesGetPayload<{ include: typeof speciesInclude }>;

@Injectable()
export class SpeciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(query: ParsedSpeciesQuery, user?: RequestUser): Promise<SpeciesListPage> {
    if (query.includeInactive && !userIsAdmin(user)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }

    const where = this.listWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.species.findMany({
        where,
        include: speciesInclude,
        orderBy: { scientificName: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.species.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(idOrName: string, user?: RequestUser): Promise<SpeciesDetail> {
    const species = await this.findRecord(idOrName);
    if (!species.active && !userIsAdmin(user)) {
      throw new ApiException(404, 'SPECIES_NOT_FOUND', 'Species not found');
    }
    return this.toDetail(species, user);
  }

  async create(input: ParsedCreateSpeciesBody, user: RequestUser): Promise<SpeciesDetail> {
    this.requireAdmin(user);
    try {
      const created: SpeciesRecord = await this.prisma.species.create({
        data: {
          scientificName: input.scientificName,
          commonEnglishName: input.commonEnglishName,
          sinhalaName: input.sinhalaName,
          tamilName: input.tamilName,
          nativeStatus: input.nativeStatus,
          description: input.description,
          imageKey: null,
          active: input.active,
        },
        include: speciesInclude,
      });
      await this.audit('SPECIES_CREATED', user.id, created.id);
      return this.toDetail(created, user);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(idOrName: string, input: ParsedUpdateSpeciesBody, user: RequestUser): Promise<SpeciesDetail> {
    this.requireAdmin(user);
    const species = await this.findRecord(idOrName);
    try {
      const updated: SpeciesRecord = await this.prisma.species.update({
        where: { id: species.id },
        data: {
          scientificName: input.scientificName,
          commonEnglishName: input.commonEnglishName,
          sinhalaName: input.sinhalaName,
          tamilName: input.tamilName,
          nativeStatus: input.nativeStatus,
          description: input.description,
          active: input.active,
        },
        include: speciesInclude,
      });
      await this.audit('SPECIES_UPDATED', user.id, updated.id);
      return this.toDetail(updated, user);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async setImage(idOrName: string, file: Express.Multer.File, user: RequestUser): Promise<SpeciesDetail> {
    this.requireAdmin(user);
    const species = await this.findRecord(idOrName);
    const stored = await this.storage.putOptimizedImage(`species/${species.id}/image.webp`, file.buffer);
    const previous = species.imageKey;
    const updated: SpeciesRecord = await this.prisma.species.update({
      where: { id: species.id },
      data: { imageKey: stored.objectKey },
      include: speciesInclude,
    });
    if (previous && previous !== stored.objectKey) {
      await this.storage.removeOptimizedImage(previous);
    }
    await this.audit('SPECIES_IMAGE_UPDATED', user.id, updated.id);
    return this.toDetail(updated, user);
  }

  async removeImage(idOrName: string, user: RequestUser): Promise<SpeciesDetail> {
    this.requireAdmin(user);
    const species = await this.findRecord(idOrName);
    const updated: SpeciesRecord = await this.prisma.species.update({
      where: { id: species.id },
      data: { imageKey: null },
      include: speciesInclude,
    });
    await this.storage.removeOptimizedImage(species.imageKey);
    await this.audit('SPECIES_IMAGE_DELETED', user.id, updated.id);
    return this.toDetail(updated, user);
  }

  private listWhere(query: ParsedSpeciesQuery): Prisma.SpeciesWhereInput {
    const where: Prisma.SpeciesWhereInput = {};
    if (!query.includeInactive) {
      where.active = true;
    }
    if (query.nativeStatus) {
      where.nativeStatus = query.nativeStatus;
    }
    if (query.q) {
      where.OR = [
        { scientificName: { contains: query.q, mode: 'insensitive' } },
        { commonEnglishName: { contains: query.q, mode: 'insensitive' } },
        { sinhalaName: { contains: query.q, mode: 'insensitive' } },
        { tamilName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private async findRecord(idOrName: string): Promise<SpeciesRecord> {
    const decoded = decodeURIComponent(idOrName).trim();
    const species = UUID_RE.test(decoded)
      ? await this.prisma.species.findFirst({ where: { id: decoded }, include: speciesInclude })
      : await this.prisma.species.findFirst({
          where: {
            OR: [
              { scientificName: { equals: decoded, mode: 'insensitive' } },
              { scientificName: { equals: decoded.replace(/-/g, ' '), mode: 'insensitive' } },
            ],
          },
          include: speciesInclude,
        });
    if (!species) {
      throw new ApiException(404, 'SPECIES_NOT_FOUND', 'Species not found');
    }
    return species;
  }

  private requireAdmin(user: RequestUser): void {
    if (!isAdmin(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
  }

  private rethrowUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiException(409, 'SPECIES_EXISTS', 'A species with that scientific name already exists');
    }
    throw error;
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'species', entityId },
    });
  }

  private async toSummary(species: SpeciesRecord): Promise<SpeciesSummary> {
    const image = await this.storage.resolvePublicImage(species.imageKey);
    return {
      id: species.id,
      scientificName: species.scientificName,
      commonEnglishName: species.commonEnglishName,
      sinhalaName: species.sinhalaName,
      tamilName: species.tamilName,
      nativeStatus: species.nativeStatus as NativeStatus,
      description: species.description,
      imageKey: species.imageKey,
      imageUrl: image?.url ?? null,
      imageThumbnailUrl: image?.thumbnailUrl ?? null,
      active: species.active,
      plantationRecordCount: species._count.plantations,
    };
  }

  private async toDetail(species: SpeciesRecord, user?: RequestUser): Promise<SpeciesDetail> {
    return {
      ...(await this.toSummary(species)),
      editable: userIsAdmin(user),
    };
  }
}

function userIsAdmin(user?: RequestUser): boolean {
  return Boolean(user && isAdmin(user.roles));
}
