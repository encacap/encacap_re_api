import { parseBaseListQuery } from 'src/common/utils/request';
import { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { BaseQueryListParamsDto } from './base.dto';

export class BaseService {
  setPagination<T = unknown>(
    queryBuilder: SelectQueryBuilder<T>,
    query: FindOptionsWhere<BaseQueryListParamsDto>,
  ): SelectQueryBuilder<T> {
    const { limit, offset } = parseBaseListQuery(query);
    queryBuilder.skip(offset);
    if (limit > 0) queryBuilder.take(limit);

    return queryBuilder;
  }

  generateGetAllResponse<T = unknown>(
    items: T[],
    totalItems: number,
    query: FindOptionsWhere<BaseQueryListParamsDto>,
  ) {
    const { page = 1, limit = 0 } = query;
    const totalPages = Math.ceil(totalItems / Number(limit));

    return {
      items,
      meta: {
        total: totalItems,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
    };
  }
}
