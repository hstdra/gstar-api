import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity()
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  localPath: string;

  @Column()
  drivePath: string;

  @Column({default: false})
  autoSync: boolean;

  @Column('text')
  files: string;

  beautify(): Folder {
    try {
      this.files = JSON.parse(this.files.toString());
    } catch (error) {
      this.files = JSON.parse('[]');
    } finally {
      return this;
    }
  }
}
