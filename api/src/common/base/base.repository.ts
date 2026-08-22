import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class BaseRepository<
  TModel,
  TCreate,
  TUpdate,
  TWhereUnique,
  TWhere = any,
> {
  constructor(protected readonly model: any) {}

  create(data: TCreate): Promise<TModel> {
    return this.model.create({ data });
  }

  findAll(args?: {
    where?: TWhere;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: any;
    select?: any;
  }): Promise<TModel[]> {
    return this.model.findMany(args);
  }

  findById(
    where: TWhereUnique,
    include?: any,
    select?: any,
  ): Promise<TModel | null> {
    return this.model.findUnique({
      where,
      include,
      select,
    });
  }

  update(where: TWhereUnique, data: TUpdate): Promise<TModel> {
    return this.model.update({
      where,
      data,
    });
  }

  delete(where: TWhereUnique): Promise<TModel> {
    return this.model.delete({
      where,
    });
  }

  count(where?: TWhere): Promise<number> {
    return this.model.count({
      where,
    });
  }

  exists(where: TWhere): Promise<boolean> {
    return this.model
      .count({
        where,
        take: 1,
      })
      .then((count: number) => count > 0);
  }
}