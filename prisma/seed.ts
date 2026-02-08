import { PrismaClient, MomentStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. Create THE HOLD singleton instance
  // ============================================
  console.log('🏛️  Creating THE HOLD instance...');
  const theHold = await prisma.theHold.upsert({
    where: { id: 'the-hold-singleton' },
    update: {},
    create: {
      id: 'the-hold-singleton',
      name: 'THE HOLD',
      description: 'A sanctuary for collective presence. A space to be held, and to hold others.',
    },
  });
  console.log(`   ✓ Created: ${theHold.name}\n`);

  // ============================================
  // 2. Create The Listener (anonymous architect)
  // ============================================
  console.log('👤 Creating anonymous architect...');
  const theListener = await prisma.architect.upsert({
    where: { id: 'the-listener' },
    update: {},
    create: {
      id: 'the-listener',
      name: 'The Listener',
      bio: 'An anonymous presence, holding space for all who seek it.',
      isAnonymous: true,
    },
  });
  console.log(`   ✓ Created: ${theListener.name} (anonymous: ${theListener.isAnonymous})\n`);

  // ============================================
  // 3. Create Council user (from environment)
  // ============================================
  const councilEmail = process.env.COUNCIL_EMAIL;
  const councilPassword = process.env.COUNCIL_PASSWORD;

  if (councilEmail && councilPassword) {
    console.log('👑 Creating Council user...');
    const passwordHash = await bcrypt.hash(councilPassword, 12);
    
    const councilUser = await prisma.user.upsert({
      where: { email: councilEmail },
      update: {},
      create: {
        email: councilEmail,
        passwordHash,
        role: UserRole.COUNCIL,
        displayName: 'Council Member',
      },
    });
    console.log(`   ✓ Created Council user: ${councilUser.email}\n`);
  } else {
    console.log('⚠️  Skipping Council user creation (COUNCIL_EMAIL or COUNCIL_PASSWORD not set)\n');
  }

  // ============================================
  // 4. Create "You Are Held" live moment
  // ============================================
  console.log('✨ Creating live moment...');
  
  // First, archive any existing live moments
  await prisma.moment.updateMany({
    where: { status: MomentStatus.live },
    data: { status: MomentStatus.archived, endedAt: new Date() },
  });

  const youAreHeld = await prisma.moment.upsert({
    where: { id: 'you-are-held' },
    update: {
      status: MomentStatus.live,
      startedAt: new Date(),
      endedAt: null,
    },
    create: {
      id: 'you-are-held',
      title: 'You Are Held',
      description: 'A continuous space of presence. Enter, breathe, and know that you are held.',
      status: MomentStatus.live,
      architectId: theListener.id,
      theHoldId: theHold.id,
      startedAt: new Date(),
      totalMinutesPresent: 0,
      totalSessions: 0,
      peakPresence: 0,
    },
  });
  console.log(`   ✓ Created live moment: "${youAreHeld.title}"`);
  console.log(`   ✓ Status: ${youAreHeld.status}`);
  console.log(`   ✓ Started at: ${youAreHeld.startedAt}\n`);

  // ============================================
  // Seed Summary
  // ============================================
  console.log('🎉 Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary:');
  console.log(`  • THE HOLD instance: ${theHold.name}`);
  console.log(`  • Architect: ${theListener.name} (anonymous)`);
  console.log(`  • Live Moment: "${youAreHeld.title}"`);
  if (councilEmail) {
    console.log(`  • Council User: ${councilEmail}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
