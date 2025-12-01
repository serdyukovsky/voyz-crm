# Как пересобрать Codespace - Пошаговая инструкция

## Способ 1: Через Command Palette (Самый надежный)

### Шаг 1: Откройте Command Palette
- **Windows/Linux**: Нажмите `Ctrl + Shift + P`
- **Mac**: Нажмите `Cmd + Shift + P`
- Или нажмите `F1`

### Шаг 2: Введите команду
В появившемся поле введите:
```
Codespaces: Rebuild Container
```

### Шаг 3: Выберите команду
Нажмите Enter на команде "Codespaces: Rebuild Container"

### Шаг 4: Подтвердите
Подтвердите пересборку в появившемся диалоге

---

## Способ 2: Через меню внизу экрана

1. Посмотрите в **левый нижний угол** экрана VS Code
2. Там должна быть кнопка с текстом типа "Codespaces" или иконка
3. Нажмите на неё
4. В меню выберите "Rebuild Container"

---

## Способ 3: Через GitHub веб-интерфейс

1. Откройте ваш репозиторий на GitHub.com
2. Нажмите на зеленую кнопку **"Code"** (слева вверху)
3. Перейдите на вкладку **"Codespaces"**
4. Найдите ваш активный Codespace
5. Нажмите на **три точки** (`...`) справа от Codespace
6. Выберите **"Rebuild"**

---

## Способ 4: Создать новый Codespace

Если пересборка не работает, создайте новый:

1. На GitHub.com откройте ваш репозиторий
2. Нажмите **"Code"** → вкладка **"Codespaces"**
3. Нажмите **"Create codespace on main"**
4. Новый Codespace автоматически использует конфигурацию из `.devcontainer/`

---

## Способ 5: Через терминал (если установлен devcontainer CLI)

```bash
# Проверьте, установлен ли devcontainer CLI
which devcontainer

# Если установлен, можно попробовать:
devcontainer rebuild
```

---

## Визуальные подсказки где искать

### В VS Code:
- **Левая нижняя панель** - там обычно показывается статус подключения
- **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) - самый надежный способ
- **Меню View** → **Command Palette**

### На GitHub:
- **Code** кнопка → **Codespaces** вкладка → меню Codespace (три точки)

---

## Если ничего не помогает

1. **Закройте текущий Codespace**:
   - GitHub.com → Codespaces → ваш Codespace → три точки → "Stop"
   
2. **Создайте новый Codespace**:
   - GitHub.com → Code → Codespaces → "Create codespace on main"

Новый Codespace автоматически подхватит конфигурацию из `.devcontainer/devcontainer.json`

