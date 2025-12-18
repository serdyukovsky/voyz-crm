import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/services/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';

describe('Import API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testPipelineId: string;
  let testStageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Настройка приложения как в main.ts
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Создаем тестового пользователя и получаем токен
    const testUser = await prisma.user.create({
      data: {
        email: `test-import-${Date.now()}@example.com`,
        password: 'test-password',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testUserId = testUser.id;

    // Создаем тестовый pipeline и stage
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Test Pipeline',
        isDefault: true,
        stages: {
          create: {
            name: 'Test Stage',
            order: 0,
          },
        },
      },
      include: { stages: true },
    });
    testPipelineId = pipeline.id;
    testStageId = pipeline.stages[0].id;

    // Создаем токен напрямую через JWT сервис
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    const configService = moduleFixture.get<ConfigService>(ConfigService);
    
    const payload = {
      email: testUser.email,
      sub: testUser.id,
      role: testUser.role,
    };

    authToken = jwtService.sign(payload, {
      expiresIn: configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') || '15m',
    });
  });

  beforeEach(async () => {
    // Очистка БД перед каждым тестом
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.company.deleteMany();
  });

  afterAll(async () => {
    // Очистка после всех тестов
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.company.deleteMany();
    await prisma.stage.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/import/contacts', () => {
    it('должен вернуть 200 OK при валидном CSV', async () => {
      const csvContent = `Имя,Email,Телефон,Должность
Иван Иванов,ivan@example.com,+79991234567,Менеджер
Петр Петров,petr@example.com,+79997654321,Директор`;

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
        position: 'Должность',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(200);

      // Проверка структуры ответа
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('created');
      expect(response.body.summary).toHaveProperty('updated');
      expect(response.body.summary).toHaveProperty('failed');
      expect(response.body.summary).toHaveProperty('skipped');

      // Проверка результата
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.created).toBe(2);
      expect(response.body.summary.failed).toBe(0);
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('должен вернуть корректный importResult', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321
Мария Сидорова,maria@example.com,+79991112233`;

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(200);

      const result = response.body;

      // Проверка типов полей
      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.created).toBe('number');
      expect(typeof result.summary.updated).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
      expect(typeof result.summary.skipped).toBe('number');

      // Проверка значений
      expect(result.summary.total).toBe(3);
      expect(result.summary.created).toBe(3);
      expect(result.summary.updated).toBe(0);
      expect(result.summary.failed).toBe(0);

      // Проверка errors
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBe(0);

      // Проверка в БД
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com', 'maria@example.com'],
          },
        },
      });

      expect(contacts).toHaveLength(3);
    });

    it('должен вернуть 400 при неверном mapping', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567`;

      // Неверный mapping - отсутствует обязательное поле fullName
      const mapping = {
        email: 'Email',
        phone: 'Телефон',
        // fullName отсутствует!
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('fullName');
    });

    it('должен вернуть 400 при невалидном JSON mapping', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567`;

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', 'invalid json {')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid mapping JSON');
    });

    it('должен вернуть 400 при отсутствии файла', async () => {
      const mapping = {
        fullName: 'Имя',
        email: 'Email',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .field('mapping', JSON.stringify(mapping))
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('CSV file is required');
    });

    it('должен вернуть 413 при большом файле', async () => {
      // Создаем большой CSV файл (> 10MB)
      const header = 'Имя,Email,Телефон\n';
      const row = 'Иван Иванов,ivan@example.com,+79991234567\n';
      const largeContent = header + row.repeat(500000); // ~10MB+

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(largeContent), 'large-contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(413); // Payload Too Large

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('File size exceeds');
    });

    it('должен обработать CSV с разделителем ;', async () => {
      const csvContent = `Имя;Email;Телефон
Иван Иванов;ivan@example.com;+79991234567
Петр Петров;petr@example.com;+79997654321`;

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .field('delimiter', ';')
        .expect(200);

      expect(response.body.summary.created).toBe(2);
    });
  });

  describe('POST /api/import/deals', () => {
    it('должен вернуть 200 OK при валидном CSV', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Тестовая сделка,100000,${testPipelineId},${testStageId}
DEAL-002,Вторая сделка,50000,${testPipelineId},${testStageId}`;

      const mapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'deals.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.created).toBe(2);
    });

    it('должен вернуть корректный importResult для сделок', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}`;

      const mapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'deals.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(200);

      const result = response.body;

      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.created).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
      expect(result.summary.total).toBe(1);
      expect(result.summary.created).toBe(1);

      // Проверка в БД
      const deal = await prisma.deal.findUnique({
        where: { number: 'DEAL-001' },
      });

      expect(deal).toBeDefined();
      expect(deal?.title).toBe('Сделка 1');
      expect(deal?.amount).toEqual(100000);
    });

    it('должен вернуть 400 при неверном mapping для сделок', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}`;

      // Неверный mapping - отсутствует обязательное поле number
      const mapping = {
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        // number отсутствует!
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'deals.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('number');
    });

    it('должен вернуть 400 при отсутствии обязательных полей в mapping', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}`;

      // Отсутствует pipelineId
      const mapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        stageId: 'Stage ID',
        // pipelineId отсутствует!
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'deals.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('pipelineId');
    });

    it('должен вернуть 413 при большом файле для сделок', async () => {
      const header = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID\n`;
      const row = `DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}\n`;
      const largeContent = header + row.repeat(500000); // ~10MB+

      const mapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const response = await request(app.getHttpServer())
        .post('/api/import/deals')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(largeContent), 'large-deals.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(413);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('File size exceeds');
    });
  });

  describe('Authentication', () => {
    it('должен вернуть 401 при отсутствии токена', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567`;

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      await request(app.getHttpServer())
        .post('/api/import/contacts')
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(401);
    });

    it('должен вернуть 401 при невалидном токене', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567`;

      const mapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      await request(app.getHttpServer())
        .post('/api/import/contacts')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', Buffer.from(csvContent), 'contacts.csv')
        .field('mapping', JSON.stringify(mapping))
        .expect(401);
    });
  });
});

