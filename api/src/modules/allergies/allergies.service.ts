import {
ConflictException,
Injectable,
NotFoundException,
} from '@nestjs/common';

import { Prisma, AllergyCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { QueryAllergyDto } from './dto/query-allergy.dto';

@Injectable()
export class AllergiesService {
constructor(
private readonly prisma: PrismaService,
) {}

async create(dto: CreateAllergyDto) {
const existing = await this.prisma.allergy.findFirst({
where: {
name: {
equals: dto.name.trim(),
mode: 'insensitive',
},
},
});

if (existing) {
  throw new ConflictException(
    'An allergy with this name already exists.',
  );
}

return this.prisma.allergy.create({
  data: {
    name: dto.name.trim(),
    snomedCode: dto.snomedCode?.trim(),
    description: dto.description?.trim(),
    category:
      (dto.category as AllergyCategory) ??
      AllergyCategory.OTHER,
    common: dto.common ?? false,
    searchable: dto.searchable ?? true,
    active: dto.active ?? true,
  },
  select: {
    id: true,
    snomedCode: true,
    name: true,
    description: true,
    category: true,
    common: true,
    searchable: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  },
});

}

async findAll(query: QueryAllergyDto) {
const {
page = 1,
limit = 10,
search,
} = query;

const trimmedSearch = search?.trim();

const where: Prisma.AllergyWhereInput = {
  active: true,
  searchable: true,
  ...(trimmedSearch
  ? {
      OR: [
        {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive',
          },
        },
        {
          category: {
            equals: trimmedSearch.toUpperCase() as AllergyCategory,
          },
        },
      ],
    }
  : {}),
};

const [data, total] =
  await this.prisma.$transaction([
    this.prisma.allergy.findMany({
      where,
      select: {
        id: true,
        snomedCode: true,
        name: true,
        description: true,
        category: true,
        common: true,
      },
      orderBy: [
        {
          common: 'desc',
        },
        {
          name: 'asc',
        },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.allergy.count({
      where,
    }),
  ]);

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
const allergy =
await this.prisma.allergy.findUnique({
where: {
id,
},
select: {
id: true,
snomedCode: true,
name: true,
description: true,
category: true,
common: true,
searchable: true,
active: true,
createdAt: true,
updatedAt: true,
},
});

if (!allergy) {
  throw new NotFoundException(
    'Allergy not found.',
  );
}

return allergy;

}

async update(
id: string,
dto: UpdateAllergyDto,
) {
await this.findOne(id);

if (dto.name) {
  const duplicate =
    await this.prisma.allergy.findFirst({
      where: {
        id: {
          not: id,
        },
        name: {
          equals: dto.name.trim(),
          mode: 'insensitive',
        },
      },
    });

  if (duplicate) {
    throw new ConflictException(
      'An allergy with this name already exists.',
    );
  }
}

const updateData: Prisma.AllergyUpdateInput = {
  ...(dto.name !== undefined && {
    name: dto.name.trim(),
  }),

  ...(dto.snomedCode !== undefined && {
    snomedCode:
      dto.snomedCode.trim(),
  }),

  ...(dto.description !== undefined && {
    description:
      dto.description.trim(),
  }),

  ...(dto.category !== undefined && {
    category:
      dto.category as AllergyCategory,
  }),

  ...(dto.common !== undefined && {
    common: dto.common,
  }),

  ...(dto.searchable !== undefined && {
    searchable: dto.searchable,
  }),

  ...(dto.active !== undefined && {
    active: dto.active,
  }),
};

return this.prisma.allergy.update({
  where: {
    id,
  },
  data: updateData,
  select: {
    id: true,
    snomedCode: true,
    name: true,
    description: true,
    category: true,
    common: true,
    searchable: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  },
});

}

async remove(id: string) {
await this.findOne(id);

await this.prisma.allergy.delete({
  where: {
    id,
  },
});

return {
  message:
    'Allergy deleted successfully.',
};

}
}
