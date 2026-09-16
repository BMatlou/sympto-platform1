import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { QueryMedicationDto } from './dto/query-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMedicationDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.medication.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('A medication with this name already exists.');
    }

    return this.prisma.medication.create({
      data: {
        name,
        genericName: dto.genericName?.trim(),
        brandName: dto.brandName?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        rxNormCode: dto.rxNormCode?.trim(),
        controlled: dto.controlled ?? false,
        prescriptionRequired: dto.prescriptionRequired ?? true,
        searchable: dto.searchable ?? true,
        active: dto.active ?? true,
      },
      include: {
        strengths: { where: { active: true }, orderBy: { strength: 'asc' } },
        _count: { select: { strengths: true, patientMedications: true, prescriptionItems: true } },
      },
    });
  }

  async findAll(query: QueryMedicationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const normalizedSearch = query.search?.trim();

    const where: Prisma.MedicationWhereInput = {
      active: true,
      searchable: true,
    };

    if (normalizedSearch) {
      where.OR = [
        { name: { contains: normalizedSearch, mode: 'insensitive' } },
        { genericName: { contains: normalizedSearch, mode: 'insensitive' } },
        { brandName: { contains: normalizedSearch, mode: 'insensitive' } },
        { category: { contains: normalizedSearch, mode: 'insensitive' } },
        { rxNormCode: { contains: normalizedSearch, mode: 'insensitive' } },
        { strengths: { some: { active: true, strength: { contains: normalizedSearch, mode: 'insensitive' } } } },
        { strengths: { some: { active: true, dosageForm: { contains: normalizedSearch, mode: 'insensitive' } } } },
        { strengths: { some: { active: true, route: { contains: normalizedSearch, mode: 'insensitive' } } } },
      ];
    }

    const medications = await this.prisma.medication.findMany({
      where,
      select: {
        id: true,
        rxNormCode: true,
        name: true,
        genericName: true,
        brandName: true,
        description: true,
        category: true,
        controlled: true,
        prescriptionRequired: true,
        active: true,
        strengths: {
          where: { active: true },
          select: {
            id: true,
            strength: true,
            dosageForm: true,
            route: true,
            active: true,
          },
          orderBy: { strength: 'asc' },
        },
      },
      orderBy: [
        { genericName: 'asc' },
        { name: 'asc' },
        { id: 'asc' },
      ],
    });

    type MedicationRow = (typeof medications)[number];

    const normalize = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const isMissingStrength = (value: unknown) => {
      const strength = normalize(value);
      return !strength || ['n/a', 'na', 'unknown', 'unspecified'].includes(strength);
    };

    // Some legacy formulation rows were created without copying the route
    // from the medication reference data. Recover the route only when the
    // dosage form gives us an unambiguous route; never default every medicine
    // to oral administration.
    const inferRouteFromDosageForm = (value: unknown) => {
      const form = normalize(value);
      if (!form) return '';

      if (/tablet|caplet|capsule|pill|chewable|lozenge|troche|sublingual|buccal|oral|syrup|solution|suspension|powder|granule|elixir/.test(form)) {
        return 'ORAL';
      }
      if (/inhaler|inhalation|nebul|aerosol/.test(form)) return 'INHALATION';
      if (/injection|injectable|vial|ampoule|prefilled syringe/.test(form)) return 'INJECTION';
      if (/cream|ointment|gel|lotion|paste|topical|transdermal|patch/.test(form)) return 'TOPICAL';
      if (/ophthalmic|eye drop|ocular/.test(form)) return 'OPHTHALMIC';
      if (/otic|ear drop/.test(form)) return 'OTIC';
      if (/nasal|spray/.test(form)) return 'NASAL';
      if (/suppository|rectal|enema/.test(form)) return 'RECTAL';
      if (/vaginal|pessary/.test(form)) return 'VAGINAL';
      return '';
    };

    const withResolvedRoutes = (medication: MedicationRow): MedicationRow => ({
      ...medication,
      strengths: medication.strengths.map((strength) => ({
        ...strength,
        route: strength.route || inferRouteFromDosageForm(strength.dosageForm) || null,
      })),
    });

    // The selectable identity is the generic medication plus its formulations.
    // Missing/N/A strength is not a separate formulation; it is incomplete data.
    const formulationKeys = (medication: MedicationRow) => {
      const rows = medication.strengths;
      if (!rows.length) return ['unspecified-formulation'];

      const byFormRoute = new Map<string, string[]>();
      for (const row of rows) {
        const form = normalize(row.dosageForm);
        const route = normalize(row.route || inferRouteFromDosageForm(row.dosageForm));
        const formRoute = `${form}|${route}`;
        const strength = normalize(row.strength);
        const values = byFormRoute.get(formRoute) ?? [];
        if (!isMissingStrength(strength)) values.push(strength);
        byFormRoute.set(formRoute, values);
      }

      return Array.from(byFormRoute.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([formRoute, strengths]) => {
          const uniqueStrengths = Array.from(new Set(strengths)).sort();
          return `${formRoute}|${uniqueStrengths.length ? uniqueStrengths.join(',') : 'unspecified'}`;
        });
    };

    const unique = new Map<string, MedicationRow>();

    for (const medication of medications) {
      const resolvedMedication = withResolvedRoutes(medication);
      const generic = normalize(resolvedMedication.genericName || resolvedMedication.name);
      const identity = `${generic}::${formulationKeys(resolvedMedication).join('||')}`;
      const existing = unique.get(identity);

      if (!existing) {
        unique.set(identity, resolvedMedication);
        continue;
      }

      // If duplicate legacy rows differ only because one has N/A strength,
      // keep the row containing a real strength so the user gets the usable
      // medication record rather than an incomplete result.
      const existingComplete = existing.strengths.some((s) => !isMissingStrength(s.strength));
      const currentComplete = resolvedMedication.strengths.some((s) => !isMissingStrength(s.strength));
      if (!existingComplete && currentComplete) unique.set(identity, resolvedMedication);
    }

    const uniqueData = Array.from(unique.values());
    const total = uniqueData.length;
    const data = uniqueData.slice((page - 1) * limit, page * limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      include: {
        strengths: { where: { active: true }, orderBy: { strength: 'asc' } },
        _count: { select: { strengths: true, patientMedications: true, prescriptionItems: true } },
      },
    });

    if (!medication) throw new NotFoundException('Medication not found.');

    const inferRouteFromDosageForm = (value: unknown) => {
      const form = String(value ?? '').trim().toLowerCase();
      if (!form) return '';
      if (/tablet|caplet|capsule|pill|chewable|lozenge|troche|sublingual|buccal|oral|syrup|solution|suspension|powder|granule|elixir/.test(form)) return 'ORAL';
      if (/inhaler|inhalation|nebul|aerosol/.test(form)) return 'INHALATION';
      if (/injection|injectable|vial|ampoule|prefilled syringe/.test(form)) return 'INJECTION';
      if (/cream|ointment|gel|lotion|paste|topical|transdermal|patch/.test(form)) return 'TOPICAL';
      if (/ophthalmic|eye drop|ocular/.test(form)) return 'OPHTHALMIC';
      if (/otic|ear drop/.test(form)) return 'OTIC';
      if (/nasal|spray/.test(form)) return 'NASAL';
      if (/suppository|rectal|enema/.test(form)) return 'RECTAL';
      if (/vaginal|pessary/.test(form)) return 'VAGINAL';
      return '';
    };

    return {
      ...medication,
      strengths: medication.strengths.map((strength) => ({
        ...strength,
        route: strength.route || inferRouteFromDosageForm(strength.dosageForm) || null,
      })),
    };
  }

  async update(id: string, dto: UpdateMedicationDto) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate = await this.prisma.medication.findFirst({
        where: {
          id: { not: id },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
      });

      if (duplicate) {
        throw new ConflictException('A medication with this name already exists.');
      }
    }

    return this.prisma.medication.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        genericName: dto.genericName?.trim(),
        brandName: dto.brandName?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        rxNormCode: dto.rxNormCode?.trim(),
        controlled: dto.controlled,
        prescriptionRequired: dto.prescriptionRequired,
        searchable: dto.searchable,
        active: dto.active,
      },
      include: {
        strengths: { where: { active: true }, orderBy: { strength: 'asc' } },
        _count: { select: { strengths: true, patientMedications: true, prescriptionItems: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.medication.delete({ where: { id } });
    return { message: 'Medication deleted successfully.' };
  }
}