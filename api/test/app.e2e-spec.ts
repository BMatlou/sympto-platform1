/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = 'e2e.patient@example.test';
  const username = 'e2e-patient';
  const password = 'StrongPassword123!';

  const removeTestUser = async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { personId: true },
    });

    if (user) {
      await prisma.person.delete({ where: { id: user.personId } });
    }
  };

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL is required to run E2E tests.');
    }

    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    await removeTestUser();

    await Promise.all(
      ['PATIENT', 'PRACTITIONER', 'ADMIN'].map((name) =>
        prisma.role.upsert({
          where: { name },
          update: { isSystem: true },
          create: { name, isSystem: true },
        }),
      ),
    );
  });

  it('registers, logs in, and accesses a protected route', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username,
        password,
        firstName: 'E2E',
        lastName: 'Patient',
      })
      .expect(201);

    expect(registration.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          email,
          userType: 'PATIENT',
        }),
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username, password, firstName: 'E2E', lastName: 'Patient' })
      .expect(409);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect({ message: 'Authenticated' });
  });

  afterAll(async () => {
    await removeTestUser();
    await app.close();
  });
});
