import { Collection, Entity, LoadStrategy, Logger, ManyToMany, MikroORM, PrimaryKey } from '@mikro-orm/core';
import { AbstractSqlDriver } from '@mikro-orm/knex';
import { v4 } from 'uuid';


@Entity()
export class App {

  @PrimaryKey()
  public id!: number;

  @ManyToMany('User', 'apps')
  public users = new Collection<User>(this);

}

@Entity()
export class User {

  @PrimaryKey({ type: 'uuid', defaultRaw: 'uuid_generate_v4()' })
  public id!: string;

  @ManyToMany(() => App, a => a.users, { owner: true })
  public apps = new Collection<App>(this);

}

describe('GH issue 1043', () => {

  let orm: MikroORM<AbstractSqlDriver>;
  const id = v4();
  const log = jest.fn();

  beforeAll(async () => {
    orm = await MikroORM.init({
      entities: [User, App],
      dbName: 'mikro_orm_test_gh1043',
      type: 'postgresql',
    });
    const logger = new Logger(log, ['query', 'query-params']);
    Object.assign(orm.config, { logger });

    await orm.getSchemaGenerator().ensureDatabase();
    await orm.getSchemaGenerator().execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await orm.getSchemaGenerator().dropSchema();
    await orm.getSchemaGenerator().createSchema();

    const em = orm.em;
    const user = em.create(User, { id });
    const app1 = em.create(App, { id: 1 });
    const app2 = em.create(App, { id: 2 });
    const app3 = em.create(App, { id: 3 });
    user.apps.add(app1, app2, app3);
    await em.persistAndFlush(user);
    em.clear();
  });

  beforeEach(() => {
    log.mockReset();
    orm.em.clear();
  });

  afterAll(() => orm.close(true));

  test('select-in strategy: find by many-to-many relation ID', async () => {
    const em = orm.em;
    const repository = em.getRepository(User);
    const findPromise = repository.findOne({ apps: 1 }, { populate: { apps: LoadStrategy.SELECT_IN } });
    await expect(findPromise).resolves.toBeInstanceOf(User);
  });

  test('joined strategy: find by many-to-many relation ID', async () => {
    const em = orm.em;
    const repository = em.getRepository(User);
    const findPromise = repository.findOne({ apps: 1 }, { populate: { apps: LoadStrategy.JOINED } });
    await expect(findPromise).resolves.toBeInstanceOf(User);
  });

  test('select-in strategy: find by many-to-many relation IDs', async () => {
    const em = orm.em;
    const repository = em.getRepository(User);
    const findPromise = repository.findOne({ apps: [1, 2, 3] }, { populate: { apps: LoadStrategy.SELECT_IN } });
    await expect(findPromise).resolves.toBeInstanceOf(User);
  });

  test('joined strategy: find by many-to-many relation IDs', async () => {
    const em = orm.em;
    const repository = em.getRepository(User);
    const findPromise = repository.findOne({ apps: [1, 2, 3] }, { populate: { apps: LoadStrategy.JOINED } });
    await expect(findPromise).resolves.toBeInstanceOf(User);
  });
});
