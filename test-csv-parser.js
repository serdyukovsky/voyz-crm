// Тестовый CSV для проверки парсинга
const testCsv = `Название сделки,Тип,Контакт,Email,Телефон
Сделка 1,Продажа,Иван Иванов,ivan@example.com,+79991234567
Сделка 2,Покупка,Петр Петров,petr@example.com,+79997654321
"Сделка 3, с запятой",Аренда,"Мария, Сидорова",maria@example.com,+79991112233`

console.log('Test CSV:')
console.log(testCsv)
console.log('\n---\n')

// Простой split
const lines = testCsv.split(/\r?\n/)
console.log('Lines:', lines.length)
lines.forEach((line, i) => {
  console.log(`Line ${i}:`, line)
  const simple = line.split(',')
  console.log(`  Simple split:`, simple)
})
