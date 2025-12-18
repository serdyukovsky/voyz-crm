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

          // Парсинг заголовков
          const headerLine = lines[0]
          if (!headerLine || headerLine.trim().length === 0) {
            reject(new Error('CSV file has no header row'))
            return
          }

          const headers = parseCsvLine(headerLine, delimiter).map((h) => h.trim().replace(/^"|"$/g, ''))

          if (headers.length === 0) {
            reject(new Error('CSV file has no headers'))
            return
          }

          // Парсинг строк данных
          const dataLines = maxRows ? lines.slice(1, maxRows + 1) : lines.slice(1)
          const rows: ParsedCsvRow[] = []

          for (const line of dataLines) {
            if (!line.trim()) continue

            // Простой парсинг CSV (поддерживает кавычки)
            const values = parseCsvLine(line, delimiter)
            
            if (values.length !== headers.length) {
              // Пропускаем строки с неверным количеством колонок
              console.warn(`Skipping row with ${values.length} columns (expected ${headers.length}):`, line.substring(0, 50))
              continue
            }

            const row: ParsedCsvRow = {}
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim() || ''
            })
            rows.push(row)
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
 */
function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Экранированная кавычка
        current += '"'
        i++ // Пропускаем следующую кавычку
      } else {
        // Начало/конец кавычек
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // Разделитель вне кавычек
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Добавляем последнее значение
  values.push(current)

  return values
}

