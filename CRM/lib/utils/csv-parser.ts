/**
 * CSV Parser Utility
 * Парсит CSV файл на клиенте для предпросмотра
 */

export interface ParsedCsvRow {
  [key: string]: string
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

          const lines = text.split(/\r?\n/).filter((line) => line.trim())

          if (lines.length === 0) {
            reject(new Error('CSV file has no content'))
            return
          }

          // Парсинг заголовков (первая строка)
          const headerLine = lines[0]
          if (!headerLine || headerLine.trim().length === 0) {
            reject(new Error('CSV file has no header row'))
            return
          }

          // Парсим заголовки с учетом кавычек и разделителей
          const rawHeaders = parseCsvLine(headerLine, delimiter)
          const headers = rawHeaders.map((h) => {
            // Убираем кавычки в начале и конце, если есть
            let cleaned = h.trim()
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
              cleaned = cleaned.slice(1, -1)
            }
            // Заменяем двойные кавычки на одинарные (если были экранированы)
            cleaned = cleaned.replace(/""/g, '"')
            return cleaned.trim()
          })

          if (headers.length === 0) {
            reject(new Error('CSV file has no headers'))
            return
          }

          // Парсинг строк данных
          const dataLines = maxRows ? lines.slice(1, maxRows + 1) : lines.slice(1)
          const rows: ParsedCsvRow[] = []

          for (let lineIndex = 0; lineIndex < dataLines.length; lineIndex++) {
            const line = dataLines[lineIndex]
            if (!line.trim()) continue

            try {
              // Парсим строку с учетом кавычек и разделителей
              const rawValues = parseCsvLine(line, delimiter)
              
              // Очищаем значения от кавычек
              const values = rawValues.map((v) => {
                let cleaned = v.trim()
                // Убираем кавычки в начале и конце, если есть
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                  cleaned = cleaned.slice(1, -1)
                }
                // Заменяем двойные кавычки на одинарные (если были экранированы)
                cleaned = cleaned.replace(/""/g, '"')
                return cleaned.trim()
              })

              // Если количество колонок не совпадает, пытаемся исправить
              if (values.length !== headers.length) {
                console.warn(
                  `Row ${lineIndex + 2}: Expected ${headers.length} columns, got ${values.length}. ` +
                  `Line: ${line.substring(0, 100)}`
                )
                
                // Если значений меньше - дополняем пустыми
                // Если больше - обрезаем
                const adjustedValues = [...values]
                while (adjustedValues.length < headers.length) {
                  adjustedValues.push('')
                }
                while (adjustedValues.length > headers.length) {
                  adjustedValues.pop()
                }

                const row: ParsedCsvRow = {}
                headers.forEach((header, index) => {
                  row[header] = adjustedValues[index] || ''
                })
                rows.push(row)
              } else {
                // Количество колонок совпадает - создаем строку
                const row: ParsedCsvRow = {}
                headers.forEach((header, index) => {
                  row[header] = values[index] || ''
                })
                rows.push(row)
              }
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

