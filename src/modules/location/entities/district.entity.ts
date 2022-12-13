import { BaseEntityWithPrimaryCodeColumn } from 'src/base/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { WardEntity } from './ward.entity';

@Entity({ name: 'districts' })
export class DistrictEntity extends BaseEntityWithPrimaryCodeColumn {
  @Column()
  name: string;

  @Column({ name: 'ghn_ref_id' })
  ghnRefId: number;

  @Column({ name: 'province_code' })
  provinceCode: string;

  @ManyToOne(() => ProvinceEntity, (province) => province.districts)
  @JoinColumn({ name: 'province_code', referencedColumnName: 'code' })
  province: ProvinceEntity;

  wards: WardEntity[];
}
