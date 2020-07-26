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

  @Column('text')
  files: any;

  @BeforeInsert()
  @BeforeUpdate()
  async convertFiles(): Promise<void> {
    this.files = JSON.stringify(this.files);
  }

  beautify(): Folder {
    try {
      this.files = JSON.parse(this.files.toString());
    } catch (error) {
      this.files = [];
    } finally {
      return this;
    }
  }
}
