import { IREUser, slugify } from '@encacap-group/common/dist/re';
import { ImageService } from '@modules/image/services/image.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { pick } from 'lodash';
import { BaseService } from 'src/base/base.service';
import { AlgoliaCategoryService } from 'src/modules/algolia/services/algolia-category.service';
import { WebsiteEntity } from 'src/modules/website/entities/website.entity';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { CategoryListQueryDto } from '../dtos/category-list-query.dto';
import { CategoryUpdateBodyDto } from '../dtos/category-update-body.dto';
import { RootCategoryCreateBody } from '../dtos/root-category-create-body.dto';
import { CategoryEntity } from '../entities/category.entity';

@Injectable()
export class CategoryService extends BaseService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly imageService: ImageService,
    private readonly algoliaService: AlgoliaCategoryService,
  ) {
    super();
  }

  async get(query: FindOptionsWhere<CategoryEntity>) {
    const record = await this.getQueryBuilder().where(query).getOne();

    if (!record) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    return this.imageService.mapVariantToImage(record, 'thumbnail');
  }

  async getAll(query: CategoryListQueryDto) {
    let queryBuilder = this.getQueryBuilder();

    if (query.websiteId) {
      queryBuilder.andWhere('website.id = :websiteId', { websiteId: query.websiteId });
    }

    if (query.categoryGroupCodes) {
      queryBuilder.andWhere('categoryGroup.code IN (:...categoryGroup)', {
        categoryGroup: query.categoryGroupCodes,
      });
    }

    if (query.parentId !== undefined) {
      queryBuilder.andWhere({
        parentId: isNaN(query.parentId) ? IsNull() : query.parentId,
      });
    }

    if (query.parentCode) {
      queryBuilder = this.setFilter(queryBuilder, query.parentCode, 'parent.code');
    }

    const { orderDirection } = query;
    let { orderBy } = query;

    if (orderBy === 'categoryGroupName') {
      orderBy = 'categoryGroup.name';
    } else {
      orderBy = `category.${orderBy ?? 'createdAt'}`;
    }

    queryBuilder.orderBy(orderBy, orderDirection);
    queryBuilder = this.setPagination(queryBuilder, query);
    queryBuilder = await this.setAlgoliaSearch(
      queryBuilder,
      query,
      this.algoliaService.search.bind(this.algoliaService),
      'category.code',
    );

    const [categories, items] = await queryBuilder.getManyAndCount();

    await this.imageService.mapVariantToImage(categories, 'thumbnail');

    return this.generateGetAllResponse(categories, items, query);
  }

  getRoots(query: CategoryListQueryDto) {
    return this.getAll({
      ...query,
      parentId: null,
    });
  }

  async create(body: Partial<RootCategoryCreateBody>, user: IREUser) {
    const { code } = body;

    if (!code) {
      body.code = slugify(body.name);
    }

    const record = await this.categoryRepository.save({
      ...body,
      websiteId: body.websiteId ?? user.websiteId,
    });
    const category = await this.get({ code: record.code });

    this.algoliaService.save({
      objectID: category.code,
      name: category.name,
      categoryGroupName: category.categoryGroup.name,
    });

    return category;
  }

  async update(id: number, body: CategoryUpdateBodyDto) {
    await this.categoryRepository.update({ id }, pick(body, ['name', 'categoryGroupId', 'thumbnailId']));

    const category = await this.get({ id });

    this.algoliaService.update({
      objectID: String(category.id),
      name: category.name,
      categoryGroupName: category.categoryGroup.name,
    });

    return category;
  }

  delete(id: number) {
    this.algoliaService.remove(String(id));
    return this.categoryRepository.delete({ id });
  }

  private getQueryBuilder() {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndMapOne('category.parent', CategoryEntity, 'parent', 'parent.id = category.parentId')
      .leftJoinAndMapMany('category.children', CategoryEntity, 'children', 'children.parentId = category.id')
      .leftJoinAndMapOne(
        'children.parent',
        CategoryEntity,
        'childrenParent',
        'childrenParent.id = children.parentId',
      )
      .leftJoinAndSelect('category.thumbnail', 'thumbnail')
      .leftJoinAndMapOne('category.website', WebsiteEntity, 'website', 'website.id = category.websiteId')
      .leftJoinAndSelect('category.categoryGroup', 'categoryGroup');
  }
}
