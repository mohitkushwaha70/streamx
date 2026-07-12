import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@streamx.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@streamx.com',
      password: adminPassword,
      role: 'ADMIN',
      plan: 'PREMIUM',
    },
  });
  console.log('Admin user:', admin.email);

  await prisma.setting.upsert({ where: { key: 'site_name' }, update: { value: 'StreamX' }, create: { key: 'site_name', value: 'StreamX' } });
  await prisma.setting.upsert({ where: { key: 'site_tagline' }, update: { value: 'Your Premium Streaming Platform' }, create: { key: 'site_tagline', value: 'Your Premium Streaming Platform' } });
  await prisma.setting.upsert({ where: { key: 'footer_text' }, update: { value: 'StreamX - Watch movies, TV shows, and anime.' }, create: { key: 'footer_text', value: 'StreamX - Watch movies, TV shows, and anime.' } });

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
