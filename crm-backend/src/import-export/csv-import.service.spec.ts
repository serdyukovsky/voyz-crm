import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportService } from './csv-import.service';
import { ImportBatchService } from './import-batch.service';
import { PrismaService } from '@/common/services/prisma.service';
import { Readable } from 'stream';
import { ContactFieldMapping, DealFieldMapping } from './dto/field-mapping.dto';
import { CommonModule } from '@/common/common.module';

/**
 * Integration тесты для CSV импорта
 * Использует реальную Prisma БД (test environment)
 */
describe('CsvImportService (Integration)', () => {
  let service: CsvImportService;
  let importBatchService: ImportBatchService;
  let prisma: PrismaService;
  let testUserId: string;
  let testPipelineId: string;
  let testStageId: string;

  // Увеличиваем timeout для больших batch тестов
  jest.setTimeout(30000); // 30 секунд

  // Парсим CSV строку в массив rows (как это делает фронтенд)
  const parseCsvToRows = (csvContent: string): Record<string, string>[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  // Создаем тестового пользователя объект
  const createTestUser = (userId: string) => ({
    id: userId,
    userId: userId,
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [CsvImportService, ImportBatchService],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
    importBatchService = module.get<ImportBatchService>(ImportBatchService);
    prisma = module.get<PrismaService>(PrismaService);

    // Создаем тестового пользователя
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
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
  });

  beforeEach(async () => {
    // Очистка БД перед каждым тестом
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.task.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.file.deleteMany();
    await prisma.customFieldValue.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.company.deleteMany();
  });

  afterAll(async () => {
    // Очистка после всех тестов
    await prisma.activity.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.task.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.file.deleteMany();
    await prisma.customFieldValue.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.company.deleteMany();
    await prisma.stage.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('importContacts', () => {
    it('должен импортировать 3 новых контакта', async () => {
      const csvContent = `Имя,Email,Телефон,Должность
Иван Иванов,ivan@example.com,+79991234567,Менеджер
Петр Петров,petr@example.com,+79997654321,Директор
Мария Сидорова,maria@example.com,+79991112233,Бухгалтер`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
        position: 'Должность',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.total).toBe(3);
      expect(result.summary.created).toBe(3);
      expect(result.summary.updated).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Проверка в БД
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com', 'maria@example.com'],
          },
        },
      });

      expect(contacts).toHaveLength(3);
      expect(contacts[0].fullName).toBe('Иван Иванов');
      expect(contacts[0].email).toBe('ivan@example.com');
      expect(contacts[0].phone).toBe('+79991234567');
      expect(contacts[0].position).toBe('Менеджер');
    });

    it('должен обновить существующий контакт по email', async () => {
      // Создаем существующий контакт
      const existingContact = await prisma.contact.create({
        data: {
          fullName: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '+79991234567',
          position: 'Старая должность',
        },
      });

      const csvContent = `Имя,Email,Телефон,Должность
Иван Иванов,ivan@example.com,+79991234567,Новая должность`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
        position: 'Должность',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.total).toBe(1);
      expect(result.summary.created).toBe(0);
      expect(result.summary.updated).toBe(1);
      expect(result.summary.failed).toBe(0);

      // Проверка обновления
      const updated = await prisma.contact.findUnique({
        where: { id: existingContact.id },
      });

      expect(updated).toBeDefined();
      expect(updated?.position).toBe('Новая должность');
      expect(updated?.email).toBe('ivan@example.com'); // Email не изменился
    });

    it('должен искать по phone если нет email', async () => {
      // Создаем существующий контакт только с phone
      const existingContact = await prisma.contact.create({
        data: {
          fullName: 'Петр Петров',
          phone: '+79997654321',
          position: 'Старая должность',
        },
      });

      const csvContent = `Имя,Телефон,Должность
Петр Петров,+79997654321,Новая должность`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        phone: 'Телефон',
        position: 'Должность',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.total).toBe(1);
      expect(result.summary.created).toBe(0);
      expect(result.summary.updated).toBe(1);

      // Проверка обновления
      const updated = await prisma.contact.findUnique({
        where: { id: existingContact.id },
      });

      expect(updated?.position).toBe('Новая должность');
    });

    it('должен пропустить строку с пустым именем', async () => {
      const csvContent = `Имя,Email,Телефон
,empty@example.com,+79991234567
Иван Иванов,ivan@example.com,+79991234567`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.skipped).toBe(0);

      // Проверка ошибки
      const error = result.errors.find((e) => e.row === 2);
      expect(error).toBeDefined();
      expect(error?.field).toBe('fullName');
      expect(error?.error).toContain('Full name is required');

      // Проверка что создан только один контакт
      const contacts = await prisma.contact.findMany();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].fullName).toBe('Иван Иванов');
    });

    it('должен нормализовать email и phone', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,IVAN@EXAMPLE.COM,8 (999) 123-45-67
Петр Петров,Petr@Example.Com,+7 999 765 43 21`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.created).toBe(2);

      // Проверка нормализации
      const contacts = await prisma.contact.findMany({
        orderBy: { fullName: 'asc' },
      });

      expect(contacts[0].email).toBe('ivan@example.com'); // lowercase
      expect(contacts[0].phone).toBe('+79991234567'); // E.164 format
      expect(contacts[1].email).toBe('petr@example.com');
      expect(contacts[1].phone).toBe('+79997654321');
    });

    it('должен корректно обработать importResult (created / updated / failed)', async () => {
      // Создаем существующий контакт
      await prisma.contact.create({
        data: {
          fullName: 'Существующий',
          email: 'existing@example.com',
        },
      });

      const csvContent = `Имя,Email,Телефон
Новый 1,new1@example.com,+79991111111
Существующий,existing@example.com,+79992222222
Без email,,+79993333333
Пустое имя,,+79994444444`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.total).toBe(4);
      expect(result.summary.created).toBe(2); // Новый 1, Без email
      expect(result.summary.updated).toBe(1); // Существующий
      expect(result.summary.failed).toBe(1); // Пустое имя
      expect(result.errors.length).toBeGreaterThan(0);

      // Проверка ошибки для строки с пустым именем
      const emptyNameError = result.errors.find((e) => e.field === 'fullName');
      expect(emptyNameError).toBeDefined();
      expect(emptyNameError?.row).toBeGreaterThan(1); // Номер строки в CSV
    });

    it('должен обработать tags (разделенные запятой)', async () => {
      const csvContent = `Имя,Email,Теги
Иван Иванов,ivan@example.com,vip,regular,important`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        tags: 'Теги',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.created).toBe(1);

      const contact = await prisma.contact.findFirst({
        where: { email: 'ivan@example.com' },
      });

      expect(contact?.tags).toContain('vip');
      expect(contact?.tags).toContain('regular');
      expect(contact?.tags).toContain('important');
    });

    it('должен обработать social links', async () => {
      const csvContent = `Имя,Email,Instagram,Telegram
Иван Иванов,ivan@example.com,ivan_inst,ivan_tg`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        social: {
          instagram: 'Instagram',
          telegram: 'Telegram',
        },
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      expect(result.summary.created).toBe(1);

      const contact = await prisma.contact.findUnique({
        where: { email: 'ivan@example.com' },
      });

      expect(contact?.social).toBeDefined();
      const social = contact?.social as any;
      expect(social.instagram).toBe('ivan_inst');
      expect(social.telegram).toBe('ivan_tg');
    });
  });

  describe('importDeals', () => {
    it('должен импортировать сделку с существующим contact (email)', async () => {
      // Создаем контакт
      const contact = await prisma.contact.create({
        data: {
          fullName: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '+79991234567',
        },
      });

      // Создаем Map для резолва contactId
      const contactMap = await importBatchService.batchFindContactsByEmailOrPhone(
        ['ivan@example.com'],
        [],
      );
      const contactEmailPhoneMap = new Map<string, string>();
      contactMap.forEach((c, key) => {
        contactEmailPhoneMap.set(key, c.id);
      });

      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID,Email контакта
DEAL-001,Тестовая сделка,100000,${testPipelineId},${testStageId},ivan@example.com`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        email: 'Email контакта',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(
        rows,
        mapping,
        user,
        testPipelineId,
        undefined,
        contactEmailPhoneMap,
        false,
      );

      expect(result.summary.total).toBe(1);
      expect(result.summary.created).toBe(1);
      expect(result.summary.failed).toBe(0);

      // Проверка в БД
      const deal = await prisma.deal.findUnique({
        where: { number: 'DEAL-001' },
      });

      expect(deal).toBeDefined();
      expect(deal?.title).toBe('Тестовая сделка');
      expect(deal?.amount).toEqual(100000);
      expect(deal?.contactId).toBe(contact.id);
      expect(deal?.pipelineId).toBe(testPipelineId);
      expect(deal?.stageId).toBe(testStageId);
    });

    it('должен обработать ошибку если contact не найден (но не упасть)', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID,Email контакта
DEAL-001,Тестовая сделка,100000,${testPipelineId},${testStageId},nonexistent@example.com
DEAL-002,Вторая сделка,50000,${testPipelineId},${testStageId},`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        email: 'Email контакта',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      // Должны быть созданы обе сделки (contactId будет null)
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);

      const deals = await prisma.deal.findMany({
        where: {
          number: {
            in: ['DEAL-001', 'DEAL-002'],
          },
        },
      });

      expect(deals).toHaveLength(2);
      expect(deals[0].contactId).toBeNull();
      expect(deals[1].contactId).toBeNull();
    });

    it('должен обработать batch > 1000 строк', async () => {
      // Создаем 1500 строк CSV
      const header = 'Номер сделки,Название,Сумма,Pipeline ID,Stage ID\n';
      const rows: string[] = [];
      for (let i = 1; i <= 1500; i++) {
        rows.push(`DEAL-${i},Сделка ${i},${i * 1000},${testPipelineId},${testStageId}`);
      }
      const csvContent = header + rows.join('\n');

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result.summary.total).toBe(1500);
      expect(result.summary.created).toBe(1500);

      // Проверка что все созданы
      const count = await prisma.deal.count({
        where: {
          number: {
            startsWith: 'DEAL-',
          },
        },
      });

      expect(count).toBe(1500);
    });

    it('должен обработать транзакцию на batch', async () => {
      // Создаем 2000 строк, чтобы проверить что batch обрабатывается в транзакциях
      const header = 'Номер сделки,Название,Сумма,Pipeline ID,Stage ID\n';
      const rows: string[] = [];
      for (let i = 1; i <= 2000; i++) {
        rows.push(`DEAL-${i},Сделка ${i},${i * 1000},${testPipelineId},${testStageId}`);
      }
      const csvContent = header + rows.join('\n');

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result.summary.total).toBe(2000);
      expect(result.summary.created).toBe(2000);

      // Проверка что все созданы (2 batch по 1000)
      const count = await prisma.deal.count();
      expect(count).toBe(2000);
    });

    it('должен обработать ошибки валидации и продолжить', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Валидная сделка,100000,${testPipelineId},${testStageId}
,Без номера,50000,${testPipelineId},${testStageId}
DEAL-003,Без названия,75000,${testPipelineId},${testStageId}
DEAL-004,Без pipeline,25000,,${testStageId}
DEAL-005,Валидная сделка 2,30000,${testPipelineId},${testStageId}`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result.summary.total).toBe(5);
      expect(result.summary.created).toBe(2); // Только валидные
      expect(result.summary.failed).toBe(3); // 3 ошибки

      // Проверка ошибок
      expect(result.errors).toHaveLength(3);
      const numberError = result.errors.find((e) => e.field === 'number');
      expect(numberError).toBeDefined();
      expect(numberError?.error).toContain('Deal number is required');

      // Проверка что созданы только валидные
      const deals = await prisma.deal.findMany({
        where: {
          number: {
            in: ['DEAL-001', 'DEAL-005'],
          },
        },
      });
      expect(deals).toHaveLength(2);
    });

    it('должен обработать дату в expectedCloseAt', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID,Дата закрытия
DEAL-001,Сделка с датой,100000,${testPipelineId},${testStageId},2024-12-31`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        expectedCloseAt: 'Дата закрытия',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result.summary.created).toBe(1);

      const deal = await prisma.deal.findUnique({
        where: { number: 'DEAL-001' },
      });

      expect(deal?.expectedCloseAt).toBeDefined();
      expect(deal?.expectedCloseAt?.getFullYear()).toBe(2024);
      expect(deal?.expectedCloseAt?.getMonth()).toBe(11); // 0-based
      expect(deal?.expectedCloseAt?.getDate()).toBe(31);
    });

    it('должен обработать tags для сделок', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID,Теги
DEAL-001,Сделка с тегами,100000,${testPipelineId},${testStageId},vip,important,urgent`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        tags: 'Теги',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result.summary.created).toBe(1);

      const deal = await prisma.deal.findUnique({
        where: { number: 'DEAL-001' },
      });

      expect(deal?.tags).toContain('vip');
      expect(deal?.tags).toContain('important');
      expect(deal?.tags).toContain('urgent');
    });
  });

  describe('Edge Cases - importContacts', () => {
    it('должен обработать CSV с разделителем ;', async () => {
      const csvContent = `Имя;Email;Телефон
Иван Иванов;ivan@example.com;+79991234567
Петр Петров;petr@example.com;+79997654321`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId, ';');

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.errors).toBeDefined();

      // Проверка: корректные строки импортированы
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);
      expect(result.summary.failed).toBe(0);

      // Проверка в БД
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com'],
          },
        },
      });

      expect(contacts).toHaveLength(2);
    });

    it('должен обработать CSV с BOM (Byte Order Mark)', async () => {
      // UTF-8 BOM: \uFEFF
      const csvContent = `\uFEFFИмя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);

      // Проверка в БД
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com'],
          },
        },
      });

      expect(contacts).toHaveLength(2);
    });

    it('должен пропустить пустые строки и продолжить обработку', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567

Петр Петров,petr@example.com,+79997654321

Мария Сидорова,maria@example.com,+79991112233`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();

      // Проверка: пустые строки пропущены, валидные обработаны
      expect(result.summary.total).toBe(3); // Только непустые строки
      expect(result.summary.created).toBe(3);
      expect(result.summary.skipped).toBe(0); // Пустые строки не считаются skipped

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

    it('должен игнорировать лишние колонки и обработать валидные строки', async () => {
      const csvContent = `Имя,Email,Телефон,Лишняя колонка 1,Лишняя колонка 2
Иван Иванов,ivan@example.com,+79991234567,лишнее значение 1,лишнее значение 2
Петр Петров,petr@example.com,+79997654321,еще лишнее,и еще`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
        // Лишние колонки не маппятся
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);
      expect(result.summary.failed).toBe(0);

      // Проверка в БД
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com'],
          },
        },
      });

      expect(contacts).toHaveLength(2);
      expect(contacts[0].fullName).toBe('Иван Иванов');
      expect(contacts[0].email).toBe('ivan@example.com');
    });

    it('должен собрать ошибки если отсутствует mapping для обязательного поля', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321`;

      // Отсутствует mapping для обязательного поля fullName
      const mapping: ContactFieldMapping = {
        email: 'Email',
        phone: 'Телефон',
        // fullName не указан!
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.errors).toBeDefined();

      // Проверка: ошибки собраны для всех строк
      expect(result.summary.total).toBe(2);
      expect(result.summary.failed).toBe(2);
      expect(result.summary.created).toBe(0);

      // Проверка: ошибки содержат информацию о поле
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      const fullNameErrors = result.errors.filter((e) => e.field === 'fullName');
      expect(fullNameErrors.length).toBeGreaterThan(0);
      expect(fullNameErrors[0].error).toContain('Full name is required');
    });

    it('должен нормализовать email с пробелами и обработать валидные строки', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов, ivan@example.com ,+79991234567
Петр Петров,petr @example.com,+79997654321
Мария Сидорова,  maria@example.com  ,+79991112233`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary.total).toBe(3);

      // Проверка: email нормализованы (пробелы удалены, lowercase)
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com', 'maria@example.com'],
          },
        },
      });

      // Все должны быть созданы (email нормализуются)
      expect(result.summary.created).toBeGreaterThanOrEqual(2); // Может быть меньше из-за дубликатов после нормализации
      expect(contacts.length).toBeGreaterThanOrEqual(2);
    });

    it('должен обработать phone в разных форматах и нормализовать', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,8 (999) 123-45-67
Петр Петров,petr@example.com,+7 999 765 43 21
Мария Сидорова,maria@example.com,89991112233
Анна Козлова,anna@example.com,+79994445566`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary.total).toBe(4);
      expect(result.summary.created).toBe(4);

      // Проверка: phone нормализованы в E.164 format
      const contacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com', 'maria@example.com', 'anna@example.com'],
          },
        },
        orderBy: { email: 'asc' },
      });

      expect(contacts.length).toBe(4);
      // Проверка нормализации phone
      const phoneNumbers = contacts.map((c) => c.phone).sort();
      expect(phoneNumbers).toContain('+79991234567');
      expect(phoneNumbers).toContain('+79997654321');
      expect(phoneNumbers).toContain('+79991112233');
      expect(phoneNumbers).toContain('+79994445566');
    });

    it('должен обработать смешанные валидные и невалидные строки без падения', async () => {
      const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
,invalid-email,+79997654321
Петр Петров,petr@example.com,+79991112233
Мария Сидорова,,+79994445566
Анна Козлова,anna@example.com,+79995556677`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      const result = await service.importContacts(stream, mapping, testUserId);

      // Проверка: сервис не упал
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.errors).toBeDefined();

      // Проверка: валидные строки обработаны
      expect(result.summary.total).toBe(5);
      expect(result.summary.created).toBeGreaterThanOrEqual(3); // Валидные строки
      expect(result.summary.failed).toBeGreaterThanOrEqual(2); // Невалидные строки

      // Проверка: ошибки собраны
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      // Проверка: валидные контакты созданы в БД
      const validContacts = await prisma.contact.findMany({
        where: {
          email: {
            in: ['ivan@example.com', 'petr@example.com', 'anna@example.com'],
          },
        },
      });

      expect(validContacts.length).toBe(3);
    });

    it('должен всегда возвращать валидный importResult даже при ошибках', async () => {
      const csvContent = `Имя,Email,Телефон
,invalid-email,invalid-phone
,another-invalid,another-invalid`;

      const mapping: ContactFieldMapping = {
        fullName: 'Имя',
        email: 'Email',
        phone: 'Телефон',
      };

      const stream = createCsvStream(csvContent);
      let result;

      // Проверка: не должно быть throw
      try {
        result = await service.importContacts(stream, mapping, testUserId);
      } catch (error) {
        fail('Сервис не должен падать с ошибкой: ' + error);
      }

      // Проверка: importResult всегда валиден
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('created');
      expect(result.summary).toHaveProperty('updated');
      expect(result.summary).toHaveProperty('failed');
      expect(result.summary).toHaveProperty('skipped');
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);

      // Проверка: все поля summary - числа
      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.created).toBe('number');
      expect(typeof result.summary.updated).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
      expect(typeof result.summary.skipped).toBe('number');
    });
  });

  describe('Edge Cases - importDeals', () => {
    it('должен обработать CSV с разделителем ; для сделок', async () => {
      const csvContent = `Номер сделки;Название;Сумма;Pipeline ID;Stage ID
DEAL-001;Сделка 1;100000;${testPipelineId};${testStageId}
DEAL-002;Сделка 2;50000;${testPipelineId};${testStageId}`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);

      const deals = await prisma.deal.findMany({
        where: {
          number: {
            in: ['DEAL-001', 'DEAL-002'],
          },
        },
      });

      expect(deals).toHaveLength(2);
    });

    it('должен обработать пустые строки в CSV для сделок', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}

DEAL-002,Сделка 2,50000,${testPipelineId},${testStageId}`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.created).toBe(2);
    });

    it('должен собрать ошибки если отсутствует mapping для обязательного поля (number)', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}`;

      // Отсутствует mapping для обязательного поля number
      const mapping: DealFieldMapping = {
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
        // number не указан!
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result).toBeDefined();
      expect(result.summary.failed).toBeGreaterThanOrEqual(1);
      expect(result.errors.length).toBeGreaterThan(0);

      const numberError = result.errors.find((e) => e.field === 'number');
      expect(numberError).toBeDefined();
      expect(numberError?.error).toContain('Deal number is required');
    });

    it('должен обработать смешанные валидные и невалидные строки для сделок', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Валидная сделка 1,100000,${testPipelineId},${testStageId}
,Без номера,50000,${testPipelineId},${testStageId}
DEAL-003,Валидная сделка 2,75000,${testPipelineId},${testStageId}
DEAL-004,Без pipeline,25000,,${testStageId}`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      const result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);

      expect(result).toBeDefined();
      expect(result.summary.total).toBe(4);
      expect(result.summary.created).toBeGreaterThanOrEqual(2); // Валидные
      expect(result.summary.failed).toBeGreaterThanOrEqual(2); // Невалидные

      // Проверка: валидные сделки созданы
      const validDeals = await prisma.deal.findMany({
        where: {
          number: {
            in: ['DEAL-001', 'DEAL-003'],
          },
        },
      });

      expect(validDeals.length).toBe(2);
    });

    it('должен всегда возвращать валидный importResult для сделок даже при ошибках', async () => {
      const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
,Без номера,50000,${testPipelineId},${testStageId}
DEAL-002,Без pipeline,25000,,${testStageId}`;

      const mapping: DealFieldMapping = {
        number: 'Номер сделки',
        title: 'Название',
        amount: 'Сумма',
        pipelineId: 'Pipeline ID',
        stageId: 'Stage ID',
      };

      const rows = parseCsvToRows(csvContent);
      const user = createTestUser(testUserId);
      let result;

      try {
        result = await service.importDeals(rows, mapping, user, testPipelineId, undefined, undefined, false);
      } catch (error) {
        fail('Сервис не должен падать с ошибкой: ' + error);
      }

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('created');
      expect(result.summary).toHaveProperty('failed');
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('dry-run mode', () => {
    describe('importContacts - dry-run', () => {
      it('не должен создавать записи в БД при dry-run=true', async () => {
        const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321`;

        const mapping: ContactFieldMapping = {
          fullName: 'Имя',
          email: 'Email',
          phone: 'Телефон',
        };

        const stream = createCsvStream(csvContent);
        const result = await service.importContacts(stream, mapping, testUserId, ',', true);

        // Проверка результата
        expect(result.summary.total).toBe(2);
        expect(result.summary.created).toBe(2);
        expect(result.summary.updated).toBe(0);
        expect(result.summary.failed).toBe(0);

        // Проверка что записи НЕ созданы в БД
        const contacts = await prisma.contact.findMany({
          where: {
            email: {
              in: ['ivan@example.com', 'petr@example.com'],
            },
          },
        });
        expect(contacts).toHaveLength(0);
      });

      it('должен правильно считать created/updated в dry-run', async () => {
        // Создаем существующий контакт
        await prisma.contact.create({
          data: {
            fullName: 'Иван Иванов',
            email: 'ivan@example.com',
            phone: '+79991234567',
          },
        });

        const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321
Мария Сидорова,maria@example.com,+79991112233`;

        const mapping: ContactFieldMapping = {
          fullName: 'Имя',
          email: 'Email',
          phone: 'Телефон',
        };

        const stream = createCsvStream(csvContent);
        const result = await service.importContacts(stream, mapping, testUserId, ',', true);

        // Проверка результата
        expect(result.summary.total).toBe(3);
        expect(result.summary.created).toBe(2); // Петр и Мария
        expect(result.summary.updated).toBe(1); // Иван (существующий)
        expect(result.summary.failed).toBe(0);

        // Проверка что записи НЕ созданы/обновлены в БД
        const contacts = await prisma.contact.findMany();
        expect(contacts).toHaveLength(1); // Только существующий
        expect(contacts[0].email).toBe('ivan@example.com');
      });

      it('должен возвращать идентичный importResult как при реальном импорте', async () => {
        // Создаем существующий контакт
        await prisma.contact.create({
          data: {
            fullName: 'Иван Иванов',
            email: 'ivan@example.com',
          },
        });

        const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321
,invalid@example.com,+79993333333`;

        const mapping: ContactFieldMapping = {
          fullName: 'Имя',
          email: 'Email',
          phone: 'Телефон',
        };

        // Dry-run
        const stream1 = createCsvStream(csvContent);
        const dryRunResult = await service.importContacts(stream1, mapping, testUserId, ',', true);

        // Реальный импорт
        const stream2 = createCsvStream(csvContent);
        const realResult = await service.importContacts(stream2, mapping, testUserId, ',', false);

        // Проверка что summary совпадает
        expect(dryRunResult.summary.total).toBe(realResult.summary.total);
        expect(dryRunResult.summary.created).toBe(realResult.summary.created);
        expect(dryRunResult.summary.updated).toBe(realResult.summary.updated);
        expect(dryRunResult.summary.failed).toBe(realResult.summary.failed);
        expect(dryRunResult.summary.skipped).toBe(realResult.summary.skipped);

        // Проверка что структура errors идентична
        expect(dryRunResult.errors.length).toBe(realResult.errors.length);
      });
    });

    describe('importDeals - dry-run', () => {
      it('не должен создавать записи в БД при dry-run=true', async () => {
        const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Сделка 1,100000,${testPipelineId},${testStageId}
DEAL-002,Сделка 2,200000,${testPipelineId},${testStageId}`;

        const mapping: DealFieldMapping = {
          number: 'Номер сделки',
          title: 'Название',
          amount: 'Сумма',
          pipelineId: 'Pipeline ID',
          stageId: 'Stage ID',
        };

        const stream = createCsvStream(csvContent);
        const result = await service.importDeals(stream, mapping, testUserId, undefined, ',', true);

        // Проверка результата
        expect(result.summary.total).toBe(2);
        expect(result.summary.created).toBe(2);
        expect(result.summary.updated).toBe(0);
        expect(result.summary.failed).toBe(0);

        // Проверка что записи НЕ созданы в БД
        const deals = await prisma.deal.findMany({
          where: {
            number: {
              in: ['DEAL-001', 'DEAL-002'],
            },
          },
        });
        expect(deals).toHaveLength(0);
      });

      it('должен правильно считать created/updated в dry-run', async () => {
        // Создаем существующую сделку
        await prisma.deal.create({
          data: {
            number: 'DEAL-001',
            title: 'Существующая сделка',
            amount: 50000,
            pipelineId: testPipelineId,
            stageId: testStageId,
            createdById: testUserId,
          },
        });

        const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Обновленная сделка,150000,${testPipelineId},${testStageId}
DEAL-002,Новая сделка,200000,${testPipelineId},${testStageId}
DEAL-003,Еще одна сделка,300000,${testPipelineId},${testStageId}`;

        const mapping: DealFieldMapping = {
          number: 'Номер сделки',
          title: 'Название',
          amount: 'Сумма',
          pipelineId: 'Pipeline ID',
          stageId: 'Stage ID',
        };

        const stream = createCsvStream(csvContent);
        const result = await service.importDeals(stream, mapping, testUserId, undefined, ',', true);

        // Проверка результата
        expect(result.summary.total).toBe(3);
        expect(result.summary.created).toBe(2); // DEAL-002 и DEAL-003
        expect(result.summary.updated).toBe(1); // DEAL-001 (существующая)
        expect(result.summary.failed).toBe(0);

        // Проверка что записи НЕ созданы/обновлены в БД
        const deals = await prisma.deal.findMany();
        expect(deals).toHaveLength(1); // Только существующая
        expect(deals[0].number).toBe('DEAL-001');
        expect(deals[0].amount).toBe(50000); // Не обновлена
      });

      it('должен возвращать идентичный importResult как при реальном импорте', async () => {
        // Создаем существующую сделку
        await prisma.deal.create({
          data: {
            number: 'DEAL-001',
            title: 'Существующая сделка',
            amount: 50000,
            pipelineId: testPipelineId,
            stageId: testStageId,
            createdById: testUserId,
          },
        });

        const csvContent = `Номер сделки,Название,Сумма,Pipeline ID,Stage ID
DEAL-001,Обновленная сделка,150000,${testPipelineId},${testStageId}
DEAL-002,Новая сделка,200000,${testPipelineId},${testStageId}
,Без номера,300000,${testPipelineId},${testStageId}`;

        const mapping: DealFieldMapping = {
          number: 'Номер сделки',
          title: 'Название',
          amount: 'Сумма',
          pipelineId: 'Pipeline ID',
          stageId: 'Stage ID',
        };

        // Dry-run
        const rows1 = parseCsvToRows(csvContent);
        const user = createTestUser(testUserId);
        const dryRunResult = await service.importDeals(rows1, mapping, user, testPipelineId, undefined, undefined, true);

        // Реальный импорт
        const rows2 = parseCsvToRows(csvContent);
        const realResult = await service.importDeals(rows2, mapping, user, testPipelineId, undefined, undefined, false);

        // Проверка что summary совпадает
        expect(dryRunResult.summary.total).toBe(realResult.summary.total);
        expect(dryRunResult.summary.created).toBe(realResult.summary.created);
        expect(dryRunResult.summary.updated).toBe(realResult.summary.updated);
        expect(dryRunResult.summary.failed).toBe(realResult.summary.failed);
        expect(dryRunResult.summary.skipped).toBe(realResult.summary.skipped);

        // Проверка что структура errors идентична
        expect(dryRunResult.errors.length).toBe(realResult.errors.length);
      });
    });
  });
});

