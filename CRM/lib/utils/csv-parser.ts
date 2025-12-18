/**
 * CSV Parser Utility
 * Парсит CSV файл на клиенте для предпросмотра
 * 
 * Структура CSV:
 * - Первая строка: заголовки (названия столбцов)
 * - Остальные строки: данные
 * - Разделитель: запятая (,) или точка с запятой (;)
 * - Кавычки: для значений с запятыми или специальными символами
 */

export interface ParsedCsvRow {
  [key: string]: string
}

/**
 * Автоматическое определение разделителя CSV
 * Анализирует первую строку и определяет наиболее вероятный разделитель
 */
function detectDelimiter(firstLine: string): ',' | ';' {
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  
  // Если точка с запятой встречается чаще - используем её
  if (semicolonCount > commaCount) {
    return ';'
  }
  
  // По умолчанию запятая
  return ','
}

/**
 * Парсинг CSV файла
 * @param file - CSV файл
 * @param delimiter - Разделитель (по умолчанию ',')
 * @param maxRows - Максимальное количество строк для парсинга (для предпросмотра)
 */
export async function parseCsvFile(
  file: File,
  delimiter: ',' | ';' = ',',
  maxRows?: number,
): Promise<{ headers: string[]; rows: ParsedCsvRow[] }> {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new Error('File is required'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          if (!e.target?.result) {
            reject(new Error('Failed to read file content'))
            return
          }

          const text = e.target.result as string
          
          if (!text || text.trim().length === 0) {
            reject(new Error('CSV file is empty'))
            return
          }

          // Разделяем на строки, сохраняя пустые строки для правильного подсчета
          const lines = text.split(/\r?\n/)
          
          // Фильтруем только непустые строки
          const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

          if (nonEmptyLines.length === 0) {
            reject(new Error('CSV file has no content'))
            return
          }

          // Автоматическое определение разделителя, если не указан явно
          let actualDelimiter = delimiter
          if (delimiter === ',') {
            // Пытаемся определить разделитель автоматически
            actualDelimiter = detectDelimiter(nonEmptyLines[0])
            console.log('Detected delimiter:', actualDelimiter)
          }

          // Парсинг заголовков (первая непустая строка)
          const headerLine = nonEmptyLines[0]
          if (!headerLine || headerLine.trim().length === 0) {
            reject(new Error('CSV file has no header row'))
            return
          }

          console.log('Header line:', headerLine)
          
          // Парсим заголовки с учетом кавычек и разделителей
          const rawHeaders = parseCsvLine(headerLine, actualDelimiter)
          console.log('Raw headers:', rawHeaders)
          
          const headers = rawHeaders
            .map((h) => {
              // Убираем кавычки в начале и конце, если есть
              let cleaned = h.trim()
              if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1)
              }
              // Заменяем двойные кавычки на одинарные (если были экранированы)
              cleaned = cleaned.replace(/""/g, '"')
              // Исправляем двойные обратные слэши (\\ -> \)
              cleaned = cleaned.replace(/\\\\/g, '\\')
              return cleaned.trim()
            })
            .filter((h) => h.length > 0) // Убираем пустые заголовки (от лишних разделителей в конце)
          
          console.log('Cleaned headers:', headers)
          console.log('Headers count:', headers.length)

          if (headers.length === 0) {
            reject(new Error('CSV file has no headers'))
            return
          }

          // Парсинг строк данных (начинаем со второй непустой строки)
          const dataLines = maxRows ? nonEmptyLines.slice(1, maxRows + 1) : nonEmptyLines.slice(1)
          console.log(`Parsing ${dataLines.length} data rows...`)
          
          const rows: ParsedCsvRow[] = []

          for (let lineIndex = 0; lineIndex < dataLines.length; lineIndex++) {
            const line = dataLines[lineIndex]
            if (!line.trim()) continue

            try {
              // Парсим строку с учетом кавычек и разделителей
              const rawValues = parseCsvLine(line, actualDelimiter)
              
              // Очищаем значения от кавычек
              const values = rawValues.map((v) => {
                let cleaned = v.trim()
                // Убираем кавычки в начале и конце, если есть
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                  cleaned = cleaned.slice(1, -1)
                }
                // Заменяем двойные кавычки на одинарные (если были экранированы)
                cleaned = cleaned.replace(/""/g, '"')
                // Исправляем двойные обратные слэши (\\ -> \)
                cleaned = cleaned.replace(/\\\\/g, '\\')
                return cleaned.trim()
              })

              // Обрезаем значения до количества заголовков (убираем лишние пустые в конце)
              const adjustedValues = values.slice(0, headers.length)
              
              // Если значений меньше - дополняем пустыми
              while (adjustedValues.length < headers.length) {
                adjustedValues.push('')
              }

              // Если количество колонок не совпадает - логируем предупреждение
              if (values.length !== headers.length) {
                console.warn(
                  `Row ${lineIndex + 2}: Expected ${headers.length} columns, got ${values.length}. ` +
                  `Line preview: ${line.substring(0, 100)}`
                )
                if (values.length > headers.length) {
                  console.warn(`  Trimming ${values.length - headers.length} extra empty columns`)
                }
              }

              // Создаем строку данных
              const row: ParsedCsvRow = {}
              headers.forEach((header, index) => {
                row[header] = adjustedValues[index] || ''
              })
              rows.push(row)
            } catch (err) {
              console.error(`Error parsing row ${lineIndex + 2}:`, err)
              // Пропускаем проблемную строку, но продолжаем парсинг
              continue
            }
          }

          resolve({ headers, rows })
        } catch (error) {
          console.error('Error parsing CSV:', error)
          reject(error instanceof Error ? error : new Error('Failed to parse CSV file'))
        }
      }

      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        reject(new Error('Failed to read file'))
      }

      reader.onabort = () => {
        reject(new Error('File reading was aborted'))
      }

      // Читаем файл с кодировкой UTF-8
      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      console.error('Error setting up file reader:', error)
      reject(error instanceof Error ? error : new Error('Failed to process file'))
    }
  })
}

/**
 * Парсинг одной строки CSV с поддержкой кавычек
 * Правильно обрабатывает:
 * - Кавычки вокруг значений
 * - Экранированные кавычки ("")
 * - Запятые внутри кавычек
 * - Пробелы вокруг значений
 */
function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Экранированная кавычка ("")
        current += '"'
        i += 2 // Пропускаем обе кавычки
        continue
      } else {
        // Начало/конец кавычек
        inQuotes = !inQuotes
        i++
        continue
      }
    }

    if (char === delimiter && !inQuotes) {
      // Разделитель вне кавычек - завершаем текущее значение
      values.push(current.trim())
      current = ''
      i++
      continue
    }

    // Обычный символ
    current += char
    i++
  }

  // Добавляем последнее значение (даже если строка не заканчивается разделителем)
  values.push(current.trim())

  return values
}

