const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { id: 'default-cat-1' },
    update: {},
    create: {
      id: 'default-cat-1',
      name: 'Raw Materials',
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: 'default-sup-1' },
    update: {},
    create: {
      id: 'default-sup-1',
      name: 'Alpha Chemicals Inc.',
      contact: 'John Smith',
      email: 'sales@alphachem.com',
    },
  });

  const user = await prisma.user.upsert({
    where: { username: 'admin@aura.com' },
    update: {},
    create: {
      username: 'admin@aura.com',
      password: 'password123',
      role: 'PLANT_ADMIN',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'MAT-001' },
    update: {},
    create: {
      sku: 'MAT-001',
      name: 'Steel Sheet 2mm',
      quantity: 500,
      cost_price: 12.50,
      selling_price: 25.00,
      min_stock: 100,
      categoryId: category.id,
      supplierId: supplier.id,
      location: 'Warehouse A',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'MAT-002' },
    update: {},
    create: {
      sku: 'MAT-002',
      name: 'Aluminum Coil',
      quantity: 200,
      cost_price: 45.00,
      selling_price: 80.00,
      min_stock: 50,
      categoryId: category.id,
      supplierId: supplier.id,
      location: 'Warehouse B',
    },
  });

  console.log('Seed created user, category, supplier, and default products!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
