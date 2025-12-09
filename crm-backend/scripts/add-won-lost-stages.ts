import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addWonLostStages() {
  try {
    console.log('🔄 Adding "Выиграно" and "Проиграно" stages to existing pipelines...');
    await prisma.$connect();
    console.log('✅ Database connected');

    // Get all pipelines
    const pipelines = await prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    console.log(`📊 Found ${pipelines.length} pipelines`);

    for (const pipeline of pipelines) {
      console.log(`\n📋 Processing pipeline: ${pipeline.name} (${pipeline.id})`);

      // Check if "Выиграно" stage already exists
      const wonStage = pipeline.stages.find(
        (s) => s.name.toLowerCase() === 'выиграно' || s.name.toLowerCase() === 'won'
      );

      // Check if "Проиграно" stage already exists
      const lostStage = pipeline.stages.find(
        (s) => s.name.toLowerCase() === 'проиграно' || s.name.toLowerCase() === 'lost'
      );

      // Get max order from existing stages
      const maxOrder = pipeline.stages.length > 0 
        ? Math.max(...pipeline.stages.map(s => s.order))
        : 0;

      // Create "Выиграно" stage if it doesn't exist
      if (!wonStage) {
        console.log('  ➕ Creating "Выиграно" stage...');
        await prisma.stage.create({
          data: {
            name: 'Выиграно',
            order: maxOrder + 1,
            color: '#10B981', // green
            isDefault: false,
            isClosed: true,
            pipelineId: pipeline.id,
          },
        });
        console.log('  ✅ "Выиграно" stage created');
      } else {
        console.log('  ⏭️  "Выиграно" stage already exists');
      }

      // Create "Проиграно" stage if it doesn't exist
      if (!lostStage) {
        console.log('  ➕ Creating "Проиграно" stage...');
        await prisma.stage.create({
          data: {
            name: 'Проиграно',
            order: maxOrder + 2,
            color: '#EF4444', // red
            isDefault: false,
            isClosed: true,
            pipelineId: pipeline.id,
          },
        });
        console.log('  ✅ "Проиграно" stage created');
      } else {
        console.log('  ⏭️  "Проиграно" stage already exists');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All pipelines processed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Cannot connect to database!');
      console.error('Please make sure PostgreSQL is running.');
    } else {
      console.error('❌ Error adding stages:', error.message || error);
      console.error('Error details:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addWonLostStages();






