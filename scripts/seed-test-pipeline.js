#!/usr/bin/env node

/**
 * Скрипт для создания тестовой воронки с этапами и сделками
 * 
 * Использование:
 * 1. Убедитесь что backend запущен
 * 2. Войдите в систему через UI и скопируйте access_token из localStorage
 * 3. Запустите: ACCESS_TOKEN=your_token node scripts/seed-test-pipeline.js
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://fictional-capybara-69qpv47gj7rgcrx65-3001.app.github.dev/api';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ ERROR: ACCESS_TOKEN environment variable is required');
  console.log('\n📝 How to get your access token:');
  console.log('1. Open the CRM in your browser');
  console.log('2. Login to your account');
  console.log('3. Open Browser Console (F12)');
  console.log('4. Type: localStorage.getItem("access_token")');
  console.log('5. Copy the token (without quotes)');
  console.log('\n🚀 Then run:');
  console.log('ACCESS_TOKEN=your_token_here node scripts/seed-test-pipeline.js\n');
  process.exit(1);
}

// Настройки для тестовой воронки
const PIPELINE_CONFIG = {
  name: '🚀 Продажи — Тестовая воронка',
  description: 'Тестовая воронка для демонстрации функционала импорта и работы с CRM',
  isDefault: true,
};

const STAGES_CONFIG = [
  { name: 'Новый лид', color: '#94a3b8', order: 0, isDefault: true },
  { name: 'Квалификация', color: '#3b82f6', order: 1 },
  { name: 'Переговоры', color: '#f59e0b', order: 2 },
  { name: 'Отправлено КП', color: '#8b5cf6', order: 3 },
  { name: 'Закрыто-Выиграно', color: '#10b981', order: 4, isClosed: true },
  { name: 'Закрыто-Проиграно', color: '#ef4444', order: 5, isClosed: true },
];

const TEST_DEALS = [
  {
    title: 'Внедрение CRM системы для ООО "Альфа"',
    number: 'DEAL-001',
    amount: 450000,
    stageName: 'Переговоры',
    description: 'Крупный клиент, заинтересован во внедрении полного цикла CRM',
  },
  {
    title: 'Консультация по автоматизации — ИП Петров',
    number: 'DEAL-002',
    amount: 75000,
    stageName: 'Квалификация',
    description: 'Небольшой проект, обсуждаем объем работ',
  },
  {
    title: 'Разработка интеграции с 1С — ООО "Бета"',
    number: 'DEAL-003',
    amount: 320000,
    stageName: 'Отправлено КП',
    description: 'Коммерческое предложение отправлено 2 дня назад',
  },
  {
    title: 'Техподдержка CRM — ООО "Гамма"',
    number: 'DEAL-004',
    amount: 150000,
    stageName: 'Закрыто-Выиграно',
    description: 'Контракт подписан, начинаем работу',
  },
  {
    title: 'Обучение персонала — ИП Сидоров',
    number: 'DEAL-005',
    amount: 50000,
    stageName: 'Новый лид',
    description: 'Входящая заявка, требуется первичная квалификация',
  },
  {
    title: 'Доработка модулей CRM — ООО "Дельта"',
    number: 'DEAL-006',
    amount: 280000,
    stageName: 'Квалификация',
    description: 'Уточняем требования к доработкам',
  },
  {
    title: 'Консалтинг по процессам — ЗАО "Эпсилон"',
    number: 'DEAL-007',
    amount: 95000,
    stageName: 'Закрыто-Проиграно',
    description: 'Клиент выбрал другого подрядчика',
  },
];

// Helper function для API запросов
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`📡 ${method} ${url}`);
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function main() {
  console.log('\n🎯 Создание тестовой воронки с этапами и сделками\n');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🔑 Access Token: ${ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('');

  try {
    // Шаг 1: Создаём pipeline
    console.log('📊 Шаг 1: Создание pipeline...');
    const pipeline = await apiRequest('/pipelines', 'POST', PIPELINE_CONFIG);
    console.log(`✅ Pipeline создан: "${pipeline.name}" (ID: ${pipeline.id})\n`);

    // Шаг 2: Создаём stages
    console.log('🎨 Шаг 2: Создание этапов...');
    const stages = [];
    for (const stageConfig of STAGES_CONFIG) {
      const stage = await apiRequest(
        `/pipelines/${pipeline.id}/stages`,
        'POST',
        stageConfig
      );
      stages.push(stage);
      console.log(`  ✅ Этап: "${stage.name}" (${stage.color})`);
    }
    console.log('');

    // Создаём маппинг имя стадии -> ID
    const stageMap = {};
    stages.forEach(stage => {
      stageMap[stage.name] = stage.id;
    });

    // Шаг 3: Получаем текущего пользователя
    console.log('👤 Шаг 3: Получение информации о пользователе...');
    const user = await apiRequest('/auth/me');
    console.log(`✅ Пользователь: ${user.firstName} ${user.lastName} (ID: ${user.id})\n`);

    // Шаг 4: Создаём тестовые сделки
    console.log('💼 Шаг 4: Создание тестовых сделок...');
    for (const dealData of TEST_DEALS) {
      const dealPayload = {
        title: dealData.title,
        number: dealData.number,
        amount: dealData.amount,
        stageId: stageMap[dealData.stageName],
        description: dealData.description,
        pipelineId: pipeline.id,
        assignedToId: user.id,
      };

      const deal = await apiRequest('/deals', 'POST', dealPayload);
      console.log(`  ✅ Сделка: "${deal.title}" → ${dealData.stageName} (${dealData.amount}₽)`);
    }

    console.log('\n🎉 ГОТОВО! Тестовая воронка успешно создана!\n');
    console.log('📋 Созданные данные:');
    console.log(`  • Pipeline: ${pipeline.name}`);
    console.log(`  • Этапов: ${stages.length}`);
    console.log(`  • Сделок: ${TEST_DEALS.length}`);
    console.log('\n🌐 Откройте страницу "Сделки" в CRM чтобы увидеть результат\n');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔐 Похоже, ваш токен устарел или неверен.');
      console.log('Пожалуйста, войдите в систему заново и получите новый токен.\n');
    }
    process.exit(1);
  }
}

main();

