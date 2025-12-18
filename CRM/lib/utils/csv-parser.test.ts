/**
 * Тесты для CSV парсера
 * Можно запустить в браузере для отладки
 */

import { parseCsvFile, type ParsedCsvRow } from './csv-parser'

// Тестовый CSV
const testCsvContent = `Название сделки,Тип,Контакт,Email,Телефон
Сделка 1,Продажа,Иван Иванов,ivan@example.com,+79991234567
Сделка 2,Покупка,Петр Петров,petr@example.com,+79997654321
"Сделка 3, с запятой",Аренда,"Мария, Сидорова",maria@example.com,+79991112233`

export async function testCsvParser() {
  console.log('Testing CSV Parser...')
  console.log('Input CSV:')
  console.log(testCsvContent)
  console.log('\n---\n')

  // Создаем File объект из строки
  const blob = new Blob([testCsvContent], { type: 'text/csv' })
  const file = new File([blob], 'test.csv', { type: 'text/csv' })

  try {
    const result = await parseCsvFile(file, ',', 10)
    
    console.log('Parsed Headers:', result.headers)
    console.log('Headers count:', result.headers.length)
    console.log('\nParsed Rows:', result.rows.length)
    
    result.rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`)
      result.headers.forEach((header) => {
        console.log(`  ${header}: "${row[header]}"`)
      })
    })

    // Проверка структуры
    console.log('\n--- Validation ---')
    const expectedHeaders = ['Название сделки', 'Тип', 'Контакт', 'Email', 'Телефон']
    const headersMatch = JSON.stringify(result.headers) === JSON.stringify(expectedHeaders)
    console.log('Headers match:', headersMatch)
    
    if (!headersMatch) {
      console.error('Expected headers:', expectedHeaders)
      console.error('Got headers:', result.headers)
    }

    // Проверка первой строки
    if (result.rows.length > 0) {
      const firstRow = result.rows[0]
      console.log('\nFirst row validation:')
      console.log('  Название сделки:', firstRow['Название сделки'], 'Expected: "Сделка 1"')
      console.log('  Тип:', firstRow['Тип'], 'Expected: "Продажа"')
      console.log('  Контакт:', firstRow['Контакт'], 'Expected: "Иван Иванов"')
      console.log('  Email:', firstRow['Email'], 'Expected: "ivan@example.com"')
      console.log('  Телефон:', firstRow['Телефон'], 'Expected: "+79991234567"')
    }

    return result
  } catch (error) {
    console.error('Parser error:', error)
    throw error
  }
}

// Экспортируем для использования в консоли браузера
if (typeof window !== 'undefined') {
  (window as any).testCsvParser = testCsvParser
}

