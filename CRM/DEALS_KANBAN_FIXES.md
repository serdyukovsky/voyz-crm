# Исправления канбана сделок

## ✅ Исправленные проблемы

### 1. Скроллинг - общий для всех колонок

**Проблема:** Каждая колонка имела свой ScrollArea, скроллилась отдельно.

**Решение:**
- Убран `ScrollArea` из каждой колонки
- Убрана фиксированная высота `h-[calc(100vh-300px)]` из колонок
- Добавлен общий скролл для всех колонок: `overflow-x-auto overflow-y-auto`
- Хэдер, фильтры и элементы управления зафиксированы через `flex-shrink-0`

**Изменения:**
```diff
- <Card className="h-[calc(100vh-300px)]">
-   <ScrollArea className="h-full">
-     <CardContent className="p-3">
+ <Card className="flex flex-col">
+   <CardContent className="p-3 flex-1 min-h-0">
```

```diff
- <div className="flex gap-3 overflow-x-auto pb-4">
+ <div className="flex-1 min-h-0">
+   <div className="flex gap-3 overflow-x-auto overflow-y-auto h-full">
```

### 2. Drag and Drop

**Проблема:** Не работал drag and drop между колонками.

**Решение:**
- Добавлен `e.stopPropagation()` в `handleDragOver` и `handleDrop`
- Добавлена проверка `dealId` из `dataTransfer` в `handleDrop`
- Улучшена передача данных через `dataTransfer.setData`

**Изменения:**
```diff
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
+   e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
+   e.stopPropagation()
+   const dealId = e.dataTransfer.getData('text/plain')
+   if (dealId) {
      onDrop(stage.id)
+   }
  }
```

### 3. Открытие карточки сделки

**Проблема:** Карточка не открывалась при клике.

**Решение:**
- Заменен `Link` с `href` на использование `useNavigate` из react-router-dom
- Исправлен `handleCardClick` для правильной навигации
- Добавлена проверка на `isDragging` чтобы не открывать карточку во время drag

**Изменения:**
```diff
+ import { Link, useNavigate } from 'react-router-dom'

  function DealCard({ ... }) {
+   const navigate = useNavigate()
    
    const handleCardClick = (e: React.MouseEvent) => {
      if (isDragging || (e.target as HTMLElement).closest('[data-no-navigate]')) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
-     // Navigate to deal detail page
-     window.location.href = `/deals/${deal.id}`
+     navigate(`/deals/${deal.id}`)
    }
```

```diff
- <Link href={`/deals/${deal.id}`}>
-   {deal.title}
- </Link>
+ <div onClick={handleCardClick}>
+   {deal.title}
+ </div>
```

### 4. Структура страницы DealsPage

**Изменения:**
```diff
- <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
+ <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
    <div className="flex gap-4 h-full flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
```

## 📝 Файлы изменены

1. `components/crm/deals-kanban-board.tsx`
   - Исправлен скроллинг
   - Исправлен drag and drop
   - Исправлено открытие карточки

2. `src/pages/DealsPage.tsx`
   - Исправлена структура контейнера для правильного скроллинга

3. `vite-env.d.ts` (создан)
   - Типизация для `import.meta.env`

## ✅ Результат

- ✅ Общий скролл для всех колонок
- ✅ Зафиксированы хэдер, фильтры и элементы управления
- ✅ Работает drag and drop между колонками
- ✅ Открывается карточка сделки при клике
