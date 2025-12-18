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
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/).filter((line) => line.trim())

        if (lines.length === 0) {
          reject(new Error('CSV file is empty'))
          return
        }

        // Парсинг заголовков
        const headerLine = lines[0]
        const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''))

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
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
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

