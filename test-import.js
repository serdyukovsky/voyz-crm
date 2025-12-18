/**
 * Скрипт для тестирования импорта CSV через API
 * 
 * Использование:
 * node test-import.js contacts test-contacts.csv
 * node test-import.js deals test-deals.csv
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Конфигурация
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testImport(entityType, csvFilePath, dryRun = true) {
  try {
    log(`\n🧪 Тестирование импорта ${entityType} из ${csvFilePath}`, 'blue');
    log(`   Режим: ${dryRun ? 'DRY-RUN (предпросмотр)' : 'РЕАЛЬНЫЙ ИМПОРТ'}`, 'yellow');

    // Проверка файла
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Файл не найден: ${csvFilePath}`);
    }

    // Чтение CSV для определения маппинга
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    log(`\n📋 Заголовки CSV:`, 'blue');
    headers.forEach((h, i) => log(`   ${i + 1}. ${h}`, 'reset'));

    // Создание маппинга (автоматический)
    const mapping = createMapping(entityType, headers);
    log(`\n🗺️  Маппинг полей:`, 'blue');
    Object.entries(mapping).forEach(([crmField, csvColumn]) => {
      log(`   ${crmField} ← ${csvColumn}`, 'reset');
    });

    // Подготовка FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvFilePath));
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('delimiter', ',');

    // Определение URL
    const endpoint = entityType === 'contact' ? 'contacts' : 'deals';
    const url = `${API_BASE_URL}/import/${endpoint}?dryRun=${dryRun}`;

    log(`\n📡 Отправка запроса:`, 'blue');
    log(`   URL: ${url}`, 'reset');

    // Отправка запроса
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Вывод результатов
    log(`\n✅ Результат импорта:`, 'green');
    log(`   Всего строк: ${result.summary.total}`, 'reset');
    log(`   Создано: ${result.summary.created}`, 'green');
    log(`   Обновлено: ${result.summary.updated}`, 'yellow');
    log(`   Пропущено: ${result.summary.skipped}`, 'yellow');
    log(`   Ошибок: ${result.summary.failed}`, result.summary.failed > 0 ? 'red' : 'reset');

    if (result.errors && result.errors.length > 0) {
      log(`\n❌ Ошибки (первые 10):`, 'red');
      result.errors.slice(0, 10).forEach((error, i) => {
        log(`   ${i + 1}. Строка ${error.row}: ${error.error}`, 'red');
        if (error.field) {
          log(`      Поле: ${error.field}`, 'red');
        }
        if (error.value) {
          log(`      Значение: ${error.value}`, 'red');
        }
      });
      if (result.errors.length > 10) {
        log(`   ... и еще ${result.errors.length - 10} ошибок`, 'red');
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      log(`\n⚠️  Предупреждения:`, 'yellow');
      result.warnings.forEach((warning, i) => {
        log(`   ${i + 1}. ${warning}`, 'yellow');
      });
    }

    return result;
  } catch (error) {
    log(`\n❌ Ошибка: ${error.message}`, 'red');
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'red');
    }
    throw error;
  }
}

function createMapping(entityType, csvHeaders) {
  const mapping = {};

  if (entityType === 'contact') {
    // Маппинг для контактов
    const fieldMap = {
      fullName: ['fullName', 'name', 'имя', 'фио', 'full name'],
      email: ['email', 'e-mail', 'mail', 'почта'],
      phone: ['phone', 'tel', 'telephone', 'телефон', 'phone number'],
      position: ['position', 'должность', 'job title', 'role'],
      companyName: ['companyName', 'company', 'компания', 'organization'],
      tags: ['tags', 'теги', 'tag', 'labels'],
      notes: ['notes', 'заметки', 'note', 'comments', 'описание'],
    };

    csvHeaders.forEach((csvHeader) => {
      const normalized = csvHeader.toLowerCase().trim();
      for (const [crmField, synonyms] of Object.entries(fieldMap)) {
        if (synonyms.some(syn => normalized === syn.toLowerCase() || normalized.includes(syn.toLowerCase()))) {
          mapping[crmField] = csvHeader;
          break;
        }
      }
    });
  } else {
    // Маппинг для сделок
    const fieldMap = {
      number: ['number', 'номер', 'deal number', 'id'],
      title: ['title', 'название', 'name', 'название сделки', 'deal title'],
      amount: ['amount', 'сумма', 'sum', 'value', 'price'],
      email: ['email', 'e-mail', 'mail', 'контакт', 'contact email'],
      phone: ['phone', 'tel', 'телефон', 'contact phone'],
      description: ['description', 'описание', 'desc', 'details'],
    };

    csvHeaders.forEach((csvHeader) => {
      const normalized = csvHeader.toLowerCase().trim();
      for (const [crmField, synonyms] of Object.entries(fieldMap)) {
        if (synonyms.some(syn => normalized === syn.toLowerCase() || normalized.includes(syn.toLowerCase()))) {
          mapping[crmField] = csvHeader;
          break;
        }
      }
    });

    // Для сделок нужны pipelineId и stageId - их нужно будет указать вручную
    // В тестовом скрипте используем значения по умолчанию
    if (!mapping.pipelineId) {
      log(`   ⚠️  pipelineId не найден в CSV, нужно указать вручную`, 'yellow');
    }
    if (!mapping.stageId) {
      log(`   ⚠️  stageId не найден в CSV, нужно указать вручную`, 'yellow');
    }
  }

  return mapping;
}

// Главная функция
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log('Использование:', 'yellow');
    log('  node test-import.js <entityType> <csvFile> [dryRun]', 'reset');
    log('', 'reset');
    log('Примеры:', 'yellow');
    log('  node test-import.js contacts test-contacts.csv', 'reset');
    log('  node test-import.js deals test-deals.csv', 'reset');
    log('  node test-import.js contacts test-contacts.csv false  # реальный импорт', 'reset');
    log('', 'reset');
    log('Переменные окружения:', 'yellow');
    log('  API_URL - URL API (по умолчанию: http://localhost:3001/api)', 'reset');
    log('  AUTH_TOKEN - JWT токен для аутентификации', 'reset');
    process.exit(1);
  }

  const [entityType, csvFile, dryRunArg] = args;

  if (entityType !== 'contact' && entityType !== 'contacts' && entityType !== 'deal' && entityType !== 'deals') {
    log(`❌ Неверный тип сущности: ${entityType}. Используйте 'contact' или 'deal'`, 'red');
    process.exit(1);
  }

  const normalizedEntityType = entityType === 'contacts' ? 'contact' : entityType === 'deals' ? 'deal' : entityType;
  const dryRun = dryRunArg !== 'false';

  if (!AUTH_TOKEN) {
    log('⚠️  AUTH_TOKEN не установлен. Установите переменную окружения:', 'yellow');
    log('   export AUTH_TOKEN="your-jwt-token"', 'reset');
    log('   или передайте через параметры запуска', 'reset');
  }

  try {
    await testImport(normalizedEntityType, csvFile, dryRun);
    log('\n✅ Тест завершен успешно!', 'green');
  } catch (error) {
    log('\n❌ Тест завершен с ошибкой', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testImport, createMapping };

