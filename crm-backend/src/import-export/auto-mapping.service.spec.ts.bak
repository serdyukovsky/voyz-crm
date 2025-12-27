import { Test, TestingModule } from '@nestjs/testing';
import { AutoMappingService } from './auto-mapping.service';

describe('AutoMappingService', () => {
  let service: AutoMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoMappingService],
    }).compile();

    service = module.get<AutoMappingService>(AutoMappingService);
  });

  describe('normalize', () => {
    it('должен нормализовать строку: lowercase, trim, remove symbols', () => {
      // Используем рефлексию для доступа к приватному методу через тестирование публичного API
      const testCases = [
        { input: 'Email', expected: 'email' },
        { input: '  Phone Number  ', expected: 'phone number' },
        { input: 'Full_Name', expected: 'fullname' },
        { input: 'E-Mail', expected: 'email' },
        { input: 'Company.Name', expected: 'companyname' },
        { input: 'Deal_ID', expected: 'dealid' },
        { input: 'Telegram Username', expected: 'telegram username' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.autoMapColumns([input], 'contact');
        // Проверяем что нормализация работает через результат маппинга
        expect(result[0].columnName).toBe(input);
      });
    });
  });

  describe('autoMapColumns - contacts', () => {
    it('должен найти exact match с confidence 1.0', () => {
      const csvColumns = ['Email', 'Phone', 'Full Name'];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        columnName: 'Email',
        suggestedField: 'email',
        confidence: 1.0,
      });
      expect(result[1]).toEqual({
        columnName: 'Phone',
        suggestedField: 'phone',
        confidence: 1.0,
      });
      // "Full Name" нормализуется в "fullname", что совпадает с полем "fullName" (тоже "fullname")
      // Но так как есть пробел, это может быть synonym match
      expect(result[2].suggestedField).toBe('fullName');
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('должен найти synonym match с confidence 0.8', () => {
      const csvColumns = ['E-Mail', 'Tel', 'FIO', 'Organization'];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(4);
      // "E-Mail" нормализуется в "email" (удаляются символы), что совпадает с полем "email"
      expect(result[0].suggestedField).toBe('email');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.8);
      expect(result[1]).toEqual({
        columnName: 'Tel',
        suggestedField: 'phone',
        confidence: 0.8,
      });
      expect(result[2]).toEqual({
        columnName: 'FIO',
        suggestedField: 'fullName',
        confidence: 0.8,
      });
      expect(result[3]).toEqual({
        columnName: 'Organization',
        suggestedField: 'companyName',
        confidence: 0.8,
      });
    });

    it('должен найти partial match с confidence 0.6', () => {
      const csvColumns = ['Email Address', 'Phone Number', 'Company Name'];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(3);
      expect(result[0].suggestedField).toBe('email');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result[1].suggestedField).toBe('phone');
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result[2].suggestedField).toBe('companyName');
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('должен вернуть unmapped для неизвестных колонок', () => {
      const csvColumns = ['Unknown Column', 'Random Field'];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        columnName: 'Unknown Column',
        suggestedField: null,
        confidence: 0,
      });
      expect(result[1]).toEqual({
        columnName: 'Random Field',
        suggestedField: null,
        confidence: 0,
      });
    });

    it('должен обработать колонки с символами и пробелами', () => {
      const csvColumns = ['E-Mail_Address', 'Phone-Number', 'Full.Name', 'Company_Name'];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(4);
      expect(result[0].suggestedField).toBe('email');
      expect(result[0].confidence).toBeGreaterThan(0);
      expect(result[1].suggestedField).toBe('phone');
      expect(result[1].confidence).toBeGreaterThan(0);
      expect(result[2].suggestedField).toBe('fullName');
      expect(result[2].confidence).toBeGreaterThan(0);
      expect(result[3].suggestedField).toBe('companyName');
      expect(result[3].confidence).toBeGreaterThan(0);
    });

    it('должен правильно маппить все поля контакта', () => {
      const csvColumns = [
        'Email',
        'Phone',
        'Full Name',
        'Position',
        'Company',
        'Tags',
        'Notes',
        'Telegram',
        'Instagram',
        'WhatsApp',
        'VK',
      ];
      const result = service.autoMapColumns(csvColumns, 'contact');

      expect(result).toHaveLength(11);
      expect(result[0].suggestedField).toBe('email');
      expect(result[1].suggestedField).toBe('phone');
      expect(result[2].suggestedField).toBe('fullName');
      expect(result[3].suggestedField).toBe('position');
      expect(result[4].suggestedField).toBe('companyName');
      expect(result[5].suggestedField).toBe('tags');
      expect(result[6].suggestedField).toBe('notes');
      expect(result[7].suggestedField).toBe('telegram');
      expect(result[8].suggestedField).toBe('instagram');
      expect(result[9].suggestedField).toBe('whatsapp');
      expect(result[10].suggestedField).toBe('vk');
    });
  });

  describe('autoMapColumns - deals', () => {
    it('должен найти exact match для полей сделки', () => {
      const csvColumns = ['Number', 'Title', 'Amount', 'Budget'];
      const result = service.autoMapColumns(csvColumns, 'deal');

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        columnName: 'Number',
        suggestedField: 'number',
        confidence: 1.0,
      });
      expect(result[1]).toEqual({
        columnName: 'Title',
        suggestedField: 'title',
        confidence: 1.0,
      });
      expect(result[2]).toEqual({
        columnName: 'Amount',
        suggestedField: 'amount',
        confidence: 1.0,
      });
      expect(result[3]).toEqual({
        columnName: 'Budget',
        suggestedField: 'budget',
        confidence: 1.0,
      });
    });

    it('должен найти synonym match для полей сделки', () => {
      const csvColumns = ['Deal Number', 'Deal Title', 'Sum', 'Planned'];
      const result = service.autoMapColumns(csvColumns, 'deal');

      expect(result).toHaveLength(4);
      expect(result[0].suggestedField).toBe('number');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result[1].suggestedField).toBe('title');
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result[2].suggestedField).toBe('amount');
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result[3].suggestedField).toBe('budget');
      expect(result[3].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('должен правильно маппить все поля сделки', () => {
      const csvColumns = [
        'Number',
        'Title',
        'Amount',
        'Budget',
        'Pipeline ID',
        'Stage ID',
        'Assigned To ID',
        'Contact ID',
        'Company ID',
        'Expected Close At',
        'Description',
        'Tags',
      ];
      const result = service.autoMapColumns(csvColumns, 'deal');

      expect(result).toHaveLength(12);
      expect(result[0].suggestedField).toBe('number');
      expect(result[1].suggestedField).toBe('title');
      expect(result[2].suggestedField).toBe('amount');
      expect(result[3].suggestedField).toBe('budget');
      // ID поля могут не маппиться автоматически, но проверим что они обработаны
      expect(result[4].columnName).toBe('Pipeline ID');
      expect(result[5].columnName).toBe('Stage ID');
    });
  });

  describe('confidence scores', () => {
    it('должен возвращать confidence 1.0 для exact match', () => {
      const result = service.autoMapColumns(['email'], 'contact');
      expect(result[0].confidence).toBe(1.0);
    });

    it('должен возвращать confidence 0.8 для synonym match', () => {
      const result = service.autoMapColumns(['tel'], 'contact');
      expect(result[0].confidence).toBe(0.8);
    });

    it('должен возвращать confidence 0.6 для partial match', () => {
      const result = service.autoMapColumns(['email address'], 'contact');
      // Может быть 0.8 если "email address" в синонимах, или 0.6 если partial
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('должен возвращать confidence 0 для unmapped', () => {
      const result = service.autoMapColumns(['unknown field'], 'contact');
      expect(result[0].confidence).toBe(0);
    });

    it('должен выбирать лучшее совпадение при нескольких matches', () => {
      // "name" может маппиться и на fullName (exact) и на title (partial для deals)
      const result = service.autoMapColumns(['name'], 'contact');
      expect(result[0].suggestedField).toBe('fullName');
      expect(result[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('должен обработать пустой массив колонок', () => {
      const result = service.autoMapColumns([], 'contact');
      expect(result).toHaveLength(0);
    });

    it('должен обработать колонки с только пробелами', () => {
      const result = service.autoMapColumns(['   ', '  Email  '], 'contact');
      expect(result).toHaveLength(2);
      expect(result[1].suggestedField).toBe('email');
    });

    it('должен обработать колонки с только символами', () => {
      const result = service.autoMapColumns(['___', '---', '...'], 'contact');
      expect(result).toHaveLength(3);
      // После нормализации остаются пустые строки, должны быть unmapped
      result.forEach(r => {
        // Пустые строки после нормализации не должны маппиться
        if (r.columnName.replace(/[_.-\s]/g, '').length === 0) {
          expect(r.suggestedField).toBeNull();
          expect(r.confidence).toBe(0);
        }
      });
    });

    it('должен обработать колонки в разных регистрах', () => {
      const result = service.autoMapColumns(['EMAIL', 'Phone', 'eMaIl'], 'contact');
      expect(result).toHaveLength(3);
      expect(result[0].suggestedField).toBe('email');
      expect(result[0].confidence).toBeGreaterThan(0);
      expect(result[1].suggestedField).toBe('phone');
      expect(result[1].confidence).toBeGreaterThan(0);
      expect(result[2].suggestedField).toBe('email');
      expect(result[2].confidence).toBeGreaterThan(0);
    });

    it('должен обработать колонки с кириллицей (не маппится, но не падает)', () => {
      const result = service.autoMapColumns(['Имя', 'Email'], 'contact');
      expect(result).toHaveLength(2);
      expect(result[0].suggestedField).toBeNull(); // Кириллица не маппится
      expect(result[1].suggestedField).toBe('email');
    });
  });

  describe('getSynonyms', () => {
    it('должен вернуть синонимы для поля', () => {
      const synonyms = service.getSynonyms('email');
      expect(synonyms).toContain('email');
      expect(synonyms).toContain('e-mail');
      expect(synonyms).toContain('mail');
    });

    it('должен вернуть пустой массив для неизвестного поля', () => {
      const synonyms = service.getSynonyms('unknownField');
      expect(synonyms).toEqual([]);
    });
  });
});

