import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MongoDB...');

  const adminPassword = await bcrypt.hash('mohit@12100890', 12);

  const existing = await prisma.user.findUnique({
    where: { email: 'admin@streamx.com' },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: adminPassword },
    });
    console.log('Admin password updated:', existing.email);
  } else {
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@streamx.com',
        password: adminPassword,
        role: 'ADMIN',
        plan: 'PREMIUM',
      },
    });
    console.log('Admin user created: admin@streamx.com');
  }

  const settings = [
    { key: 'site_name', value: 'StreamX' },
    { key: 'site_tagline', value: 'Your Premium Streaming Platform' },
    { key: 'footer_text', value: 'StreamX - Watch movies, TV shows, and anime.' },
  ];

  for (const s of settings) {
    const existingSetting = await prisma.setting.findUnique({ where: { key: s.key } });
    if (!existingSetting) {
      await prisma.setting.create({ data: s });
    }
  }
  console.log('Settings seeded!');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
