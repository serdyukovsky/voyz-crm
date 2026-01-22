import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find Default Pipeline
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { name: 'Default Pipeline' }
    })
    
    if (!defaultPipeline) {
      console.log('Default Pipeline not found, trying other...')
      const anyPipeline = await prisma.pipeline.findFirst()
      if (!anyPipeline) {
        console.log('No pipelines found!')
        return
      }
      console.log(`Using pipeline: ${anyPipeline.name}`)
    }
    
    const pipelineId = defaultPipeline?.id
    
    // Get first user for task creation
    const firstUser = await prisma.user.findFirst()
    if (!firstUser) {
      console.log('No users found')
      return
    }
    
    // Get all deals
    const deals = await prisma.deal.findMany({
      where: { pipelineId },
      take: 5
    })
    
    console.log(`Found ${deals.length} deals in pipeline`)
    
    if (deals.length === 0) {
      console.log('No deals found')
      return
    }
    
    // Add tasks to deals
    let tasksAdded = 0
    for (let i = 0; i < Math.min(deals.length, 3); i++) {
      const deal = deals[i]
      let deadline: Date
      let status: any = 'IN_PROGRESS'
      let suffix = ''

      if (i === 0) {
        // Future task
        deadline = new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000)
        status = 'TODO'
        suffix = ' (5 дней вперёд - жёлтый)'
      } else if (i === 1) {
        // 5 days overdue
        deadline = new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000)
        suffix = ' (5 дней просрочки - красный)'
      } else {
        // 10 days overdue
        deadline = new Date(new Date().getTime() - 10 * 24 * 60 * 60 * 1000)
        suffix = ' (10 дней просрочки - красный)'
      }

      await prisma.task.create({
        data: {
          title: `Test Task ${i + 1}${suffix}`,
          dealId: deal.id,
          assignedToId: firstUser.id,
          createdById: firstUser.id,
          status: status as any,
          priority: 'HIGH',
          deadline
        }
      })
      
      tasksAdded++
      console.log(`✓ Task ${i + 1} added to "${deal.title}"`)
    }
    
    console.log(`Total tasks added: ${tasksAdded}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()