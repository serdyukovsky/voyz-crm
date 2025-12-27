# Stage 6: Logs and Noise

## Анализ текущего состояния

### Статистика console.log/warn/info/debug:

**Backend:**
- Всего найдено: ~186 вхождений
- Критичные файлы (hot paths):
  - `chat.service.ts`: 5+ логи
  - `deals.service.ts`: 1 warn (можно оставить)
  - `main.ts`: 2 логи (startup - можно оставить), 1 warn (CORS - можно оставить)
  - `import-export`: много логов (но это не hot path, используется редко)

**Frontend:**
- Всего найдено: ~335 вхождений
- Критичные файлы (hot paths):
  - `quick-search.tsx`: 10+ логов в hot path (поиск вызывается часто)
  - `task-detail-modal.tsx`: 3 логи
  - `deals-list-view.tsx`: логи
  - `deals-kanban-board.tsx`: логи

## Рекомендации

### Высокий приоритет (hot paths):

1. **quick-search.tsx** - удалить debug логи из функции поиска
   - Логи выполняются при каждом поисковом запросе
   - Влияние: снижает производительность и засоряет консоль

2. **task-detail-modal.tsx** - удалить логи из useEffect/обработчиков
   - Логи при каждом изменении полей
   - Влияние: среднее (модалка открывается часто)

3. **deals-list-view.tsx, deals-kanban-board.tsx** - проверить и удалить логи
   - Логи при рендеринге списков
   - Влияние: среднее

### Средний приоритет:

4. **chat.service.ts** - оставить только error логи
   - Backend сервис, вызывается часто

### Низкий приоритет (можно оставить):

- **main.ts** - startup логи можно оставить
- **import-export** - debug логи для редких операций импорта можно оставить
- **console.error** - оставить все (критичные ошибки)

## Реализация

### Принципы:
1. Удалить `console.log` из hot paths и часто вызываемых функций
2. Оставить `console.error` для критичных ошибок
3. Оставить startup логи (выполняются 1 раз при старте)
4. Можно оставить логи в редко вызываемых функциях (импорт/экспорт)

### Файлы для очистки:

**Frontend:**
- `CRM/components/shared/quick-search.tsx` - удалить все console.log (строки 90, 220-255, 326-327)
- `CRM/components/crm/task-detail-modal.tsx` - удалить console.log (строки 192, 197, 287)

**Backend:**
- `crm-backend/src/chat/chat.service.ts` - проверить и удалить лишние логи

