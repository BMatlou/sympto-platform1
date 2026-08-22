import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BaseCrudService } from './base-crud.service';
import { BaseQueryDto } from '../dto/base-query.dto';

export abstract class BaseController<
  TModel,
  TCreate,
  TUpdate,
  TWhereUnique = { id: string },
> {
  constructor(
    protected readonly service: BaseCrudService<
      TModel,
      TCreate,
      TUpdate,
      TWhereUnique
    >,
  ) {}

  @Post()
  create(@Body() dto: TCreate) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: BaseQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne({ id } as TWhereUnique);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: TUpdate,
  ) {
    return this.service.update(
      { id } as TWhereUnique,
      dto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove({ id } as TWhereUnique);
  }
}