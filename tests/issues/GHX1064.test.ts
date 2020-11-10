import { Entity, MikroORM, OneToOne, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import { AbstractSqlDriver } from '@mikro-orm/knex';

@Entity()
export class App {

  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

}

@Entity()
export class User {

  [PrimaryKeyType]: string;
  @OneToOne({ entity: () => App, primary: true, owner: true })
  app!: App;

  @Property()
  name!: string;

}

describe('GH issue 1064', () => {

  let orm: MikroORM<AbstractSqlDriver>;

  beforeAll(async () => {
    orm = await MikroORM.init({
      entities: [User, App],
      dbName: 'mikro_orm_test_1064',
      type: 'postgresql',
    });
    await orm.getSchemaGenerator().ensureDatabase();
  });


  beforeEach(async () => {

    await orm.getSchemaGenerator().dropSchema();
    orm.em.clear();
  });

  afterAll(() => orm.close(true));

  it('should not create unique index on primary key column', async () => {
    const sql = await orm.getSchemaGenerator().getCreateSchemaSQL();
    expect(sql).toMatchSnapshot();
  });

  it('should not generate create unique index sql', async () => {
    await orm.getSchemaGenerator().createSchema();

    await orm.em.execute('ALTER TABLE "user"\n' +
      'DROP CONSTRAINT "user_app_id_unique"');

    const sql = await orm.getSchemaGenerator().getUpdateSchemaSQL();
    expect(sql).toMatchSnapshot();
  });

});
