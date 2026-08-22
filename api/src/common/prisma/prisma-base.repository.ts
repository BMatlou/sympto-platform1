import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export abstract class PrismaBaseRepository<
  TModel,
  TCreateInput,
  TUpdateInput,
  TWhereUniqueInput,
  TWhereInput,
  TOrderByInput = any,
> {
  protected constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: any,
  ) {}

  create(data: TCreateInput): Promise<TModel> {
    return this.model.create({
      data,
    });
  }

  findMany(params?: {
    where?: TWhereInput;
    orderBy?: TOrderByInput;
    skip?: number;
    take?: number;
    include?: any;
    select?: any;
  }): Promise<TModel[]> {
    return this.model.findMany(params);
  }

  findFirst(where: TWhereInput): Promise<TModel | null> {
    return this.model.findFirst({
      where,
    });
  }

  findUnique(where: TWhereUniqueInput): Promise<TModel | null> {
    return this.model.findUnique({
      where,
    });
  }

  update(
    where: TWhereUniqueInput,
    data: TUpdateInput,
  ): Promise<TModel> {
    return this.model.update({
      where,
      data,
    });
  }

  delete(where: TWhereUniqueInput): Promise<TModel> {
    return this.model.delete({
      where,
    });
  }

  count(where?: TWhereInput): Promise<number> {
    return this.model.count({
      where,
    });
  }

  upsert(
    where: TWhereUniqueInput,
    create: TCreateInput,
    update: TUpdateInput,
  ): Promise<TModel> {
    return this.model.upsert({
      where,
      create,
      update,
    });
  }

  exists(where: TWhereInput): Promise<boolean> {
    return this.model
      .count({ where })
      .then((count) => count > 0);
  }
}