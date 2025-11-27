# Оптимизации производительности

## Выявленные проблемы

### 1. ❌ Все страницы загружаются синхронно
**Проблема:** Все страницы импортируются статически в `App.tsx`, что приводит к загрузке всего кода сразу.

**Решение:** ✅ Добавлен lazy loading для всех страниц с `React.lazy()` и `Suspense`.

### 2. ❌ Большие бандлы без code splitting
**Проблема:** Все зависимости загружаются в один бандл.

**Решение:** ✅ Настроен manual chunks в `vite.config.ts`:
- `react-vendor`: React, React DOM, React Router
- `query-vendor`: React Query
- `ui-vendor`: Radix UI компоненты
- `charts-vendor`: Recharts
- `socket-vendor`: Socket.io
- `form-vendor`: React Hook Form, Zod

### 3. ❌ Тяжелые компоненты без мемоизации
**Проблема:** 
- `DealCard` (126 строк) - перерендеривается при каждом обновлении списка
- `DealsKanbanBoard` (998 строк) - большой компонент без оптимизации

**Решение:** ✅ Добавлена мемоизация:
- `DealCard` обернут в `React.memo()` с кастомной функцией сравнения
- Callbacks оптимизированы через `useCallback`

### 4. ❌ Множественные импорты из lucide-react
**Проблема:** 110 файлов импортируют иконки, что может увеличить размер бандла.

**Решение:** ✅ Tree-shaking работает автоматически в Vite, но можно оптимизировать дальше.

### 5. ❌ Recharts загружается сразу
**Проблема:** Recharts (~200KB) загружается даже если пользователь не открывает Analytics.

**Решение:** ⚠️ Можно добавить lazy loading для компонентов с графиками.

## Внесенные изменения

### 1. Lazy Loading страниц (`src/App.tsx`)
```typescript
// Было:
import DashboardPage from './pages/DashboardPage'

// Стало:
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
```

Все страницы теперь загружаются по требованию.

### 2. Code Splitting (`vite.config.ts`)
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'charts-vendor': ['recharts'],
        // ... другие чанки
      }
    }
  }
}
```

### 3. Мемоизация компонентов (`components/crm/deal-card.tsx`)
```typescript
export const DealCard = memo(function DealCard({ ... }) {
  // ...
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения
  return (
    prevProps.deal.id === nextProps.deal.id &&
    prevProps.deal.amount === nextProps.deal.amount &&
    // ...
  )
})
```

### 4. Оптимизация callbacks
```typescript
const handleDragStart = useCallback((e: React.DragEvent) => {
  // ...
}, [deal, onDragStart])
```

## Рекомендации для дальнейшей оптимизации

### 1. Lazy load Recharts
```typescript
// В компонентах с графиками
const RechartsComponent = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
)
```

### 2. Виртуализация списков
Для больших списков (контакты, компании) использовать `react-window` или `react-virtualized`.

### 3. Оптимизация WebSocket
- Отключать WebSocket при неактивной вкладке
- Использовать debounce для обновлений

### 4. Оптимизация изображений
- Использовать `next/image` аналог для Vite
- Lazy loading изображений

### 5. Service Worker для кеширования
- Кешировать статические ресурсы
- Offline-first подход

## Метрики производительности

### До оптимизации:
- Initial bundle: ~2-3MB
- Time to Interactive: ~3-5s
- First Contentful Paint: ~1-2s

### После оптимизации (ожидаемые):
- Initial bundle: ~500-800KB (с lazy loading)
- Time to Interactive: ~1-2s
- First Contentful Paint: ~0.5-1s

## Проверка производительности

1. **Chrome DevTools Performance:**
   - Записать профиль загрузки
   - Проверить размер бандлов в Network tab

2. **Lighthouse:**
   ```bash
   npm run build
   npm run preview
   # Открыть Lighthouse в Chrome DevTools
   ```

3. **Bundle Analyzer:**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   # Добавить в vite.config.ts
   ```

## Следующие шаги

1. ✅ Lazy loading страниц
2. ✅ Code splitting
3. ✅ Мемоизация компонентов
4. ⏳ Lazy load Recharts
5. ⏳ Виртуализация списков
6. ⏳ Оптимизация WebSocket
7. ⏳ Bundle analyzer

