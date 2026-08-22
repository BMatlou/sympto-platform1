import { Injectable } from '@nestjs/common';

import { BaseRepository } from './base.repository';
import { BaseQueryDto } from '../dto/base-query.dto';

@Injectable()
export abstract class BaseCrudService<
  TModel,
  TCreate,
  TUpdate,
  TWhereUnique,
  TWhere = any,
> {
  constructor(
    protected readonly repository: BaseRepository<
      TModel,
      TCreate,
      TUpdate,
      TWhereUnique,
      TWhere
    >,
  ) {}

  create(data: TCreate) {
    return this.repository.create(data);
  }

  findAll(query?: BaseQueryDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    return this.repository.findAll({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findOne(where: TWhereUnique) {
    return this.repository.findById(where);
  }

  update(where: TWhereUnique, data: TUpdate) {
    return this.repository.update(where, data);
  }

  remove(where: TWhereUnique) {
    return this.repository.delete(where);
  }

  count(where?: TWhere) {
    return this.repository.count(where);
  }

  exists(where: TWhere) {
    return this.repository.exists(where);
  }
}