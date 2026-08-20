import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ─── 1. Store Settings ─────────────────────────────────
  console.log('📦 Creating store settings...');
  const settingsData = [
    { key: 'store_name', value: 'ShopNova' },
    { key: 'store_tagline', value: 'Your Premium Shopping Destination' },
    { key: 'store_email', value: 'support@shopnova.com' },
    { key: 'store_phone', value: '+880 1234-567890' },
    { key: 'store_address', value: 'Dhaka, Bangladesh' },
    { key: 'currency', value: 'BDT' },
    { key: 'currency_symbol', value: '৳' },
    { key: 'social_facebook', value: 'https://facebook.com/shopnova' },
    { key: 'social_instagram', value: 'https://instagram.com/shopnova' },
    { key: 'social_youtube', value: 'https://youtube.com/shopnova' },
    { key: 'free_shipping_above', value: '5000' },
    { key: 'default_shipping_fee', value: '120' },
    { key: 'tax_enabled', value: 'false' },
    { key: 'tax_rate', value: '0' },
  ];

  for (const s of settingsData) {
    await db.storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log('  ✅ 14 store settings created.');

  // ─── 2. Categories ─────────────────────────────────────
  console.log('📂 Creating categories...');
  const parentCategories = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Home & Living', slug: 'home-living' },
    { name: 'Beauty', slug: 'beauty' },
  ];

  const createdParents: Record<string, string> = {};
  for (const cat of parentCategories) {
    const created = await db.category.create({
      data: { name: cat.name, slug: cat.slug, position: parentCategories.indexOf(cat) },
    });
    createdParents[cat.slug] = created.id;
  }

  const childCategories = [
    { name: 'Smartphones', slug: 'smartphones', parent: 'electronics' },
    { name: 'Laptops', slug: 'laptops', parent: 'electronics' },
    { name: 'Headphones', slug: 'headphones', parent: 'electronics' },
    { name: 'Accessories', slug: 'accessories', parent: 'electronics' },
    { name: "Men's Clothing", slug: 'mens-clothing', parent: 'fashion' },
    { name: "Women's Clothing", slug: 'womens-clothing', parent: 'fashion' },
    { name: 'Footwear', slug: 'footwear', parent: 'fashion' },
    { name: 'Watches', slug: 'watches', parent: 'fashion' },
    { name: 'Furniture', slug: 'furniture', parent: 'home-living' },
    { name: 'Kitchen', slug: 'kitchen', parent: 'home-living' },
    { name: 'Decor', slug: 'decor', parent: 'home-living' },
    { name: 'Skincare', slug: 'skincare', parent: 'beauty' },
    { name: 'Makeup', slug: 'makeup', parent: 'beauty' },
    { name: 'Fragrance', slug: 'fragrance', parent: 'beauty' },
  ];

  const createdCategories: Record<string, string> = { ...createdParents };
  for (const cat of childCategories) {
    const created = await db.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        parentId: createdParents[cat.parent],
      },
    });
    createdCategories[cat.slug] = created.id;
  }
  console.log('  ✅ 4 parent + 14 child categories created.');

  // ─── 3. Brands ─────────────────────────────────────────
  console.log('🏷️  Creating brands...');
  const brandsData = [
    { name: 'TechPro', slug: 'techpro' },
    { name: 'NovaSound', slug: 'novasound' },
    { name: 'UrbanStyle', slug: 'urbanstyle' },
    { name: 'TimeMaster', slug: 'timemaster' },
    { name: 'HomeBliss', slug: 'homebliss' },
    { name: 'GlowUp', slug: 'glowup' },
    { name: 'FreshWear', slug: 'freshwear' },
    { name: 'EliteGear', slug: 'elitegear' },
    { name: 'SwiftCharge', slug: 'swiftcharge' },
    { name: 'PureSkin', slug: 'pureskin' },
  ];

  const createdBrands: Record<string, string> = {};
  for (const brand of brandsData) {
    const created = await db.brand.create({
      data: { name: brand.name, slug: brand.slug },
    });
    createdBrands[brand.slug] = created.id;
  }
  console.log('  ✅ 10 brands created.');

  // ─── 4. Products ───────────────────────────────────────
  console.log('🛍️  Creating products...');

  const productsData = [
    // ELECTRONICS - Smartphones
    {
      title: 'TechPro X1 Pro Smartphone',
      description: 'Experience the future of mobile technology with the TechPro X1 Pro. Featuring a stunning 6.7-inch AMOLED display, 108MP triple camera system, and all-day battery life. Powered by the latest octa-core processor for seamless multitasking and gaming.',
      shortDesc: '6.7" AMOLED, 108MP Camera, 5000mAh Battery',
      price: 14999,
      compareAtPrice: 16999,
      categoryId: createdCategories['smartphones'],
      brandId: createdBrands['techpro'],
      sku: 'TPH-001',
      stockQuantity: 50,
      specifications: JSON.stringify({ Brand: 'TechPro', Display: '6.7 inch AMOLED', Processor: 'Octa-core 3.0GHz', RAM: '8GB', Storage: '128GB', Camera: '108MP + 12MP + 5MP', Battery: '5000mAh', OS: 'Android 14' }),
      tags: JSON.stringify(['smartphone', '5g', 'amoled', 'techpro']),
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'TechPro Neo 5G Smartphone',
      description: 'Stay connected at lightning speed with the TechPro Neo 5G. This budget-friendly smartphone delivers flagship-level performance with 5G connectivity, a 48MP AI camera, and a sleek modern design that fits perfectly in your hand.',
      shortDesc: '6.5" IPS LCD, 48MP AI Camera, 5G Ready',
      price: 8999,
      compareAtPrice: null,
      categoryId: createdCategories['smartphones'],
      brandId: createdBrands['techpro'],
      sku: 'TPH-002',
      stockQuantity: 80,
      specifications: JSON.stringify({ Brand: 'TechPro', Display: '6.5 inch IPS LCD', Processor: 'Octa-core 2.4GHz', RAM: '6GB', Storage: '128GB', Camera: '48MP + 8MP + 2MP', Battery: '4500mAh', OS: 'Android 14' }),
      tags: JSON.stringify(['smartphone', '5g', 'budget', 'techpro']),
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      isTrending: false,
    },
    // ELECTRONICS - Laptops
    {
      title: 'EliteGear UltraBook Pro 15',
      description: 'The EliteGear UltraBook Pro 15 redefines portable computing with its ultra-thin aluminum chassis and brilliant 15.6-inch 2K display. Equipped with 16GB RAM and a 512GB NVMe SSD, it handles demanding workloads with ease.',
      shortDesc: '15.6" 2K Display, Intel i7, 16GB RAM, 512GB SSD',
      price: 14500,
      compareAtPrice: 16000,
      categoryId: createdCategories['laptops'],
      brandId: createdBrands['elitegear'],
      sku: 'ELG-001',
      stockQuantity: 25,
      specifications: JSON.stringify({ Brand: 'EliteGear', Display: '15.6 inch 2K IPS', Processor: 'Intel Core i7-13700H', RAM: '16GB DDR5', Storage: '512GB NVMe SSD', GPU: 'Intel Iris Xe', Battery: '72Wh', Weight: '1.7kg' }),
      tags: JSON.stringify(['laptop', 'ultrabook', 'intel', 'elitegear']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    {
      title: 'EliteGear Studio Laptop 14',
      description: 'Designed for creators and professionals, the EliteGear Studio Laptop 14 offers exceptional color accuracy with its 14-inch QHD+ display. The powerful AMD Ryzen 7 processor ensures smooth video editing and graphic design workflows.',
      shortDesc: '14" QHD+ Display, AMD Ryzen 7, 16GB RAM',
      price: 12000,
      compareAtPrice: null,
      categoryId: createdCategories['laptops'],
      brandId: createdBrands['elitegear'],
      sku: 'ELG-002',
      stockQuantity: 30,
      specifications: JSON.stringify({ Brand: 'EliteGear', Display: '14 inch QHD+ IPS', Processor: 'AMD Ryzen 7 7840U', RAM: '16GB LPDDR5', Storage: '512GB NVMe SSD', GPU: 'AMD Radeon 780M', Battery: '65Wh', Weight: '1.4kg' }),
      tags: JSON.stringify(['laptop', 'creator', 'amd', 'elitegear']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    // ELECTRONICS - Headphones
    {
      title: 'NovaSound ANC Pro Wireless Headphones',
      description: 'Immerse yourself in pure audio bliss with NovaSound ANC Pro. Industry-leading active noise cancellation, 40-hour battery life, and premium memory foam ear cushions make these the perfect companion for music lovers and professionals alike.',
      shortDesc: 'Active Noise Cancellation, 40hr Battery, Hi-Res Audio',
      price: 4500,
      compareAtPrice: 5500,
      categoryId: createdCategories['headphones'],
      brandId: createdBrands['novasound'],
      sku: 'NVS-001',
      stockQuantity: 100,
      specifications: JSON.stringify({ Brand: 'NovaSound', Type: 'Over-Ear', Driver: '40mm Dynamic', ANC: 'Yes - Hybrid', Battery: '40 hours', Bluetooth: '5.3', Weight: '260g', Color: 'Matte Black' }),
      tags: JSON.stringify(['headphones', 'wireless', 'anc', 'novasound']),
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'NovaSound Sport Buds',
      description: 'Engineered for active lifestyles, the NovaSound Sport Buds deliver powerful bass and crystal-clear audio in a compact, sweat-proof design. With IP67 water resistance and secure wing-tip fit, they stay put during the most intense workouts.',
      shortDesc: 'True Wireless, IP67 Waterproof, 8hr Battery',
      price: 2200,
      compareAtPrice: null,
      categoryId: createdCategories['headphones'],
      brandId: createdBrands['novasound'],
      sku: 'NVS-002',
      stockQuantity: 150,
      specifications: JSON.stringify({ Brand: 'NovaSound', Type: 'In-Ear TWS', Driver: '12mm Dynamic', ANC: 'No', Battery: '8 hours (32h with case)', Bluetooth: '5.3', Weight: '5.5g per bud', IP: 'IP67' }),
      tags: JSON.stringify(['earbuds', 'wireless', 'sport', 'waterproof', 'novasound']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
    },
    // ELECTRONICS - Accessories
    {
      title: 'SwiftCharge 65W GaN Fast Charger',
      description: 'Charge all your devices at full speed with the SwiftCharge 65W GaN adapter. Using the latest gallium nitride technology, it delivers up to 65W of power in an incredibly compact form factor that fits in your pocket.',
      shortDesc: '65W GaN, 3 Ports (2 USB-C + 1 USB-A)',
      price: 1850,
      compareAtPrice: 2200,
      categoryId: createdCategories['accessories'],
      brandId: createdBrands['swiftcharge'],
      sku: 'SWC-001',
      stockQuantity: 200,
      specifications: JSON.stringify({ Brand: 'SwiftCharge', MaxPower: '65W', Ports: '2x USB-C, 1x USB-A', Technology: 'GaN', Input: '100-240V', Weight: '120g', Protection: 'OVP, OCP, SCP' }),
      tags: JSON.stringify(['charger', 'gan', 'fast-charging', 'swiftcharge']),
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
    },
    {
      title: 'SwiftCharge 20000mAh Power Bank',
      description: 'Never run out of power on the go with the SwiftCharge 20000mAh power bank. Featuring 22.5W fast charging, dual USB-C ports, and a sleek aluminum body that matches your premium devices.',
      shortDesc: '20000mAh, 22.5W Fast Charge, LED Display',
      price: 2500,
      compareAtPrice: null,
      categoryId: createdCategories['accessories'],
      brandId: createdBrands['swiftcharge'],
      sku: 'SWC-002',
      stockQuantity: 120,
      specifications: JSON.stringify({ Brand: 'SwiftCharge', Capacity: '20000mAh', Output: '22.5W Max', Ports: '2x USB-C, 1x USB-A', Display: 'LED Percentage', Weight: '350g', Input: 'USB-C 18W' }),
      tags: JSON.stringify(['power-bank', 'fast-charging', 'portable', 'swiftcharge']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    // FASHION - Men's Clothing
    {
      title: 'UrbanStyle Premium Cotton Polo T-Shirt',
      description: 'Elevate your casual wardrobe with the UrbanStyle Premium Cotton Polo. Crafted from 100% long-staple pique cotton, it offers exceptional softness and breathability. The classic fit and refined details make it perfect for both office and weekend wear.',
      shortDesc: '100% Premium Cotton, Classic Fit, Pique Weave',
      price: 1250,
      compareAtPrice: 1500,
      categoryId: createdCategories['mens-clothing'],
      brandId: createdBrands['urbanstyle'],
      sku: 'URB-001',
      stockQuantity: 200,
      specifications: JSON.stringify({ Brand: 'UrbanStyle', Material: '100% Cotton Pique', Fit: 'Classic', Collar: 'Ribbed Polo', Care: 'Machine Washable', Season: 'All Season' }),
      tags: JSON.stringify(['mens', 'polo', 'cotton', 'casual', 'urbanstyle']),
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
    },
    {
      title: 'FreshWear Slim Fit Chino Pants',
      description: 'The FreshWear Slim Fit Chino Pants combine modern tailoring with all-day comfort. Made from stretch cotton twill with a hint of elastane, these chinos move with you while maintaining a sharp, polished silhouette.',
      shortDesc: 'Stretch Cotton Twill, Slim Fit, 5 Pocket Design',
      price: 1800,
      compareAtPrice: null,
      categoryId: createdCategories['mens-clothing'],
      brandId: createdBrands['freshwear'],
      sku: 'FRW-001',
      stockQuantity: 150,
      specifications: JSON.stringify({ Brand: 'FreshWear', Material: '98% Cotton, 2% Elastane', Fit: 'Slim', Closure: 'Zip Fly', Pockets: '5', Care: 'Machine Wash Cold' }),
      tags: JSON.stringify(['mens', 'chino', 'pants', 'slim-fit', 'freshwear']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
    },
    // FASHION - Women's Clothing
    {
      title: 'UrbanStyle Floral Maxi Dress',
      description: 'Embrace effortless elegance with the UrbanStyle Floral Maxi Dress. Featuring a beautiful hand-painted floral print on flowing viscose fabric, this dress transitions seamlessly from garden parties to evening dinners.',
      shortDesc: 'Viscose Fabric, Floral Print, A-Line Silhouette',
      price: 2200,
      compareAtPrice: 2800,
      categoryId: createdCategories['womens-clothing'],
      brandId: createdBrands['urbanstyle'],
      sku: 'URB-002',
      stockQuantity: 80,
      specifications: JSON.stringify({ Brand: 'UrbanStyle', Material: '100% Viscose', Length: 'Maxi', Pattern: 'Floral Print', Closure: 'Back Zip', Lining: 'Fully Lined' }),
      tags: JSON.stringify(['womens', 'dress', 'maxi', 'floral', 'urbanstyle']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'FreshWear Classic Button-Down Blouse',
      description: 'A wardrobe essential reimagined with premium craftsmanship. The FreshWear Classic Button-Down is tailored from breathable cotton-poplin with mother-of-pearl buttons, offering a refined look for any occasion.',
      shortDesc: 'Cotton Poplin, Relaxed Fit, Pearl Buttons',
      price: 1450,
      compareAtPrice: null,
      categoryId: createdCategories['womens-clothing'],
      brandId: createdBrands['freshwear'],
      sku: 'FRW-002',
      stockQuantity: 120,
      specifications: JSON.stringify({ Brand: 'FreshWear', Material: '100% Cotton Poplin', Fit: 'Relaxed', Buttons: 'Mother-of-Pearl', Collar: 'Pointed Collar', Care: 'Machine Washable' }),
      tags: JSON.stringify(['womens', 'blouse', 'cotton', 'classic', 'freshwear']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    // FASHION - Footwear
    {
      title: 'UrbanStyle Classic Leather Sneakers',
      description: 'Where heritage craftsmanship meets contemporary design. The UrbanStyle Classic Leather Sneakers feature premium full-grain leather uppers, cushioned insoles, and a durable rubber outsole for all-day comfort and timeless style.',
      shortDesc: 'Full-Grain Leather, Cushioned Sole, Handcrafted',
      price: 3500,
      compareAtPrice: 4200,
      categoryId: createdCategories['footwear'],
      brandId: createdBrands['urbanstyle'],
      sku: 'URB-003',
      stockQuantity: 60,
      specifications: JSON.stringify({ Brand: 'UrbanStyle', Upper: 'Full-Grain Leather', Sole: 'Rubber', Insole: 'Memory Foam', Lining: 'Leather', Closure: 'Lace-Up' }),
      tags: JSON.stringify(['sneakers', 'leather', 'casual', 'urbanstyle']),
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
    },
    // FASHION - Watches
    {
      title: 'TimeMaster Chronograph Watch',
      description: 'Command attention with the TimeMaster Chronograph, a masterpiece of precision engineering. The stainless steel case houses a reliable quartz movement with chronograph functionality, while the sapphire crystal ensures lasting clarity.',
      shortDesc: 'Stainless Steel, Sapphire Crystal, Chronograph',
      price: 6800,
      compareAtPrice: 8500,
      categoryId: createdCategories['watches'],
      brandId: createdBrands['timemaster'],
      sku: 'TMS-001',
      stockQuantity: 40,
      specifications: JSON.stringify({ Brand: 'TimeMaster', Case: 'Stainless Steel 42mm', Crystal: 'Sapphire', Movement: 'Japanese Quartz', Water: '100m (10ATM)', Strap: 'Genuine Leather', Dial: 'Blue Sunray' }),
      tags: JSON.stringify(['watch', 'chronograph', 'stainless-steel', 'timemaster']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'TimeMaster Minimalist Dress Watch',
      description: 'Simplicity refined to perfection. The TimeMaster Minimalist features an ultra-thin 7.5mm case, elegant mesh bracelet, and a clean dial with just hour markers and slender hands — the ultimate accessory for the modern minimalist.',
      shortDesc: 'Ultra-Thin 7.5mm, Mesh Bracelet, Rose Gold',
      price: 4200,
      compareAtPrice: null,
      categoryId: createdCategories['watches'],
      brandId: createdBrands['timemaster'],
      sku: 'TMS-002',
      stockQuantity: 55,
      specifications: JSON.stringify({ Brand: 'TimeMaster', Case: 'Stainless Steel Rose Gold 38mm', Crystal: 'Mineral', Movement: 'Japanese Quartz', Water: '30m (3ATM)', Strap: 'Stainless Steel Mesh', Dial: 'White' }),
      tags: JSON.stringify(['watch', 'minimalist', 'dress', 'rose-gold', 'timemaster']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    // HOME & LIVING - Furniture
    {
      title: 'HomeBliss Ergonomic Office Chair',
      description: 'Transform your workspace with the HomeBliss Ergonomic Office Chair. Featuring adjustable lumbar support, breathable mesh back, 4D armrests, and a smooth recline mechanism, it is designed to keep you comfortable through long work sessions.',
      shortDesc: 'Mesh Back, Adjustable Lumbar, 4D Armrests',
      price: 9500,
      compareAtPrice: 12000,
      categoryId: createdCategories['furniture'],
      brandId: createdBrands['homebliss'],
      sku: 'HBL-001',
      stockQuantity: 20,
      specifications: JSON.stringify({ Brand: 'HomeBliss', Material: 'Mesh + Foam', Frame: 'Steel Base', Armrests: '4D Adjustable', Recline: '90-135 degrees', Weight_Capacity: '150kg', Warranty: '3 Years' }),
      tags: JSON.stringify(['chair', 'ergonomic', 'office', 'homebliss']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    // HOME & LIVING - Kitchen
    {
      title: 'HomeBliss Non-Stick Cookware Set',
      description: 'Cook like a pro with the HomeBliss 10-Piece Non-Stick Cookware Set. Featuring a premium ceramic coating that is PFOA-free, these pots and pans distribute heat evenly for perfect cooking results every time.',
      shortDesc: '10 Pieces, Ceramic Non-Stick, Induction Compatible',
      price: 4800,
      compareAtPrice: 6000,
      categoryId: createdCategories['kitchen'],
      brandId: createdBrands['homebliss'],
      sku: 'HBL-002',
      stockQuantity: 35,
      specifications: JSON.stringify({ Brand: 'HomeBliss', Pieces: '10', Coating: 'Ceramic Non-Stick', Material: 'Aluminum Core', Compatible: 'Gas, Electric, Induction', PFOA_Free: 'Yes', Handle: 'Bakelite Cool-Touch' }),
      tags: JSON.stringify(['cookware', 'non-stick', 'kitchen', 'ceramic', 'homebliss']),
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
    },
    // HOME & LIVING - Decor
    {
      title: 'HomeBliss Handwoven Jute Area Rug',
      description: 'Add warmth and texture to any room with the HomeBliss Handwoven Jute Area Rug. Each rug is meticulously handcrafted by skilled artisans using sustainably sourced natural jute fibers, creating a unique piece that tells a story.',
      shortDesc: 'Handwoven Natural Jute, 5x8 ft, Eco-Friendly',
      price: 3200,
      compareAtPrice: null,
      categoryId: createdCategories['decor'],
      brandId: createdBrands['homebliss'],
      sku: 'HBL-003',
      stockQuantity: 30,
      specifications: JSON.stringify({ Brand: 'HomeBliss', Material: '100% Natural Jute', Size: '5 x 8 ft', Pattern: 'Woven Herringbone', Thickness: '0.5 inch', Backing: 'Non-Slip Latex', Care: 'Spot Clean' }),
      tags: JSON.stringify(['rug', 'jute', 'handwoven', 'decor', 'eco-friendly', 'homebliss']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    // BEAUTY - Skincare
    {
      title: 'PureSkin Hyaluronic Acid Serum',
      description: 'Unlock dewy, plump skin with the PureSkin Hyaluronic Acid Serum. Formulated with triple-weight hyaluronic acid molecules, it hydrates at multiple skin layers for deep, lasting moisture retention and a visibly youthful glow.',
      shortDesc: 'Triple Hyaluronic Acid, 30ml, All Skin Types',
      price: 950,
      compareAtPrice: 1200,
      categoryId: createdCategories['skincare'],
      brandId: createdBrands['pureskin'],
      sku: 'PSK-001',
      stockQuantity: 200,
      specifications: JSON.stringify({ Brand: 'PureSkin', Volume: '30ml', Key_Ingredient: 'Hyaluronic Acid (1.5%)', Skin_Type: 'All Skin Types', Paraben_Free: 'Yes', Cruelty_Free: 'Yes', Shelf_Life: '24 Months' }),
      tags: JSON.stringify(['serum', 'hyaluronic-acid', 'skincare', 'hydrating', 'pureskin']),
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'PureSkin Vitamin C Brightening Moisturizer',
      description: 'Brighten and protect your skin daily with the PureSkin Vitamin C Moisturizer. A potent blend of stabilized vitamin C, niacinamide, and squalane works together to even skin tone, reduce dark spots, and lock in moisture for a radiant complexion.',
      shortDesc: 'Vitamin C + Niacinamide, 50ml, Brightening',
      price: 1350,
      compareAtPrice: null,
      categoryId: createdCategories['skincare'],
      brandId: createdBrands['pureskin'],
      sku: 'PSK-002',
      stockQuantity: 180,
      specifications: JSON.stringify({ Brand: 'PureSkin', Volume: '50ml', Key_Ingredients: 'Vitamin C 10%, Niacinamide 5%', Skin_Type: 'Normal to Combination', Paraben_Free: 'Yes', SPF: 'None (use sunscreen)', Texture: 'Lightweight Cream' }),
      tags: JSON.stringify(['moisturizer', 'vitamin-c', 'brightening', 'skincare', 'pureskin']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    // BEAUTY - Makeup
    {
      title: 'GlowUp Matte Lipstick Collection',
      description: 'Express yourself with the GlowUp Matte Lipstick Collection. These long-wearing, highly pigmented lipsticks deliver a velvety matte finish that lasts up to 12 hours without drying. Enriched with vitamin E for comfortable, all-day wear.',
      shortDesc: 'Velvety Matte Finish, 12hr Wear, 8 Shades Available',
      price: 650,
      compareAtPrice: 800,
      categoryId: createdCategories['makeup'],
      brandId: createdBrands['glowup'],
      sku: 'GLW-001',
      stockQuantity: 300,
      specifications: JSON.stringify({ Brand: 'GlowUp', Finish: 'Matte', Wear_Time: 'Up to 12 Hours', Shades: '8 Available', Ingredients: 'Vitamin E, Shea Butter', Cruelty_Free: 'Yes', Net_Weight: '3.5g' }),
      tags: JSON.stringify(['lipstick', 'matte', 'makeup', 'long-wear', 'glowup']),
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: true,
    },
    // BEAUTY - Fragrance
    {
      title: 'GlowUp Eau de Parfum - Midnight Bloom',
      description: 'Captivating and mysterious, Midnight Bloom opens with sparkling bergamot and blackcurrant, blooming into a heart of jasmine sambac and iris. The base of warm vanilla and sandalwood lingers beautifully on the skin for hours.',
      shortDesc: '100ml EDP, Floral Woody, Long-Lasting',
      price: 2800,
      compareAtPrice: 3500,
      categoryId: createdCategories['fragrance'],
      brandId: createdBrands['glowup'],
      sku: 'GLW-002',
      stockQuantity: 60,
      specifications: JSON.stringify({ Brand: 'GlowUp', Type: 'Eau de Parfum', Volume: '100ml', Notes_Top: 'Bergamot, Blackcurrant', Notes_Heart: 'Jasmine Sambac, Iris', Notes_Base: 'Vanilla, Sandalwood', Longevity: '8-10 Hours' }),
      tags: JSON.stringify(['fragrance', 'perfume', 'floral', 'long-lasting', 'glowup']),
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
    },
    // Extra products to reach 24+
    {
      title: 'TechPro Wireless Charging Pad',
      description: 'Simplify your charging routine with the TechPro Wireless Charging Pad. Supporting up to 15W fast wireless charging with intelligent temperature control, it is compatible with all Qi-enabled devices and features a sleek, anti-slip surface.',
      shortDesc: '15W Qi Wireless Charger, LED Indicator, Anti-Slip',
      price: 950,
      compareAtPrice: null,
      categoryId: createdCategories['accessories'],
      brandId: createdBrands['techpro'],
      sku: 'TPH-003',
      stockQuantity: 250,
      specifications: JSON.stringify({ Brand: 'TechPro', Max_Power: '15W', Standard: 'Qi', Compatibility: 'All Qi Devices', Features: 'LED Indicator, Over-Heat Protection', Cable: 'USB-C Included', Weight: '90g' }),
      tags: JSON.stringify(['charger', 'wireless', 'qi', 'techpro']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: false,
    },
    {
      title: 'FreshWear Classic Denim Jacket',
      description: 'A timeless wardrobe staple, the FreshWear Classic Denim Jacket is crafted from premium selvedge denim that ages beautifully over time. Featuring a regular fit, chest pockets, and adjustable waist tabs for a personalized look.',
      shortDesc: 'Selvedge Denim, Regular Fit, Indigo Wash',
      price: 3200,
      compareAtPrice: 3800,
      categoryId: createdCategories['mens-clothing'],
      brandId: createdBrands['freshwear'],
      sku: 'FRW-003',
      stockQuantity: 70,
      specifications: JSON.stringify({ Brand: 'FreshWear', Material: '100% Cotton Selvedge Denim', Fit: 'Regular', Wash: 'Indigo Medium', Closure: 'Button Front', Pockets: '4', Weight: '450g' }),
      tags: JSON.stringify(['mens', 'jacket', 'denim', 'selvedge', 'freshwear']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
    },
    {
      title: 'HomeBliss Ceramic Plant Pot Set',
      description: 'Bring nature indoors with the HomeBliss Ceramic Plant Pot Set. This set of three minimalist pots in varying sizes features a smooth matte glaze finish and integrated drainage holes, perfect for succulents, herbs, or small houseplants.',
      shortDesc: 'Set of 3, Matte Ceramic, Drainage Holes',
      price: 1200,
      compareAtPrice: null,
      categoryId: createdCategories['decor'],
      brandId: createdBrands['homebliss'],
      sku: 'HBL-004',
      stockQuantity: 90,
      specifications: JSON.stringify({ Brand: 'HomeBliss', Material: 'Ceramic', Finish: 'Matte Glaze', Sizes: 'Small (10cm), Medium (14cm), Large (18cm)', Drainage: 'Yes', Color: 'White', Set: '3 Pieces' }),
      tags: JSON.stringify(['planter', 'ceramic', 'decor', 'minimalist', 'homebliss']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
    {
      title: 'PureSkin Retinol Night Cream',
      description: 'Reveal smoother, younger-looking skin overnight with the PureSkin Retinol Night Cream. Formulated with encapsulated retinol and bakuchiol, it reduces fine lines and wrinkles while you sleep, without irritation.',
      shortDesc: 'Encapsulated Retinol + Bakuchiol, 50ml, Anti-Aging',
      price: 1650,
      compareAtPrice: 2000,
      categoryId: createdCategories['skincare'],
      brandId: createdBrands['pureskin'],
      sku: 'PSK-003',
      stockQuantity: 140,
      specifications: JSON.stringify({ Brand: 'PureSkin', Volume: '50ml', Key_Ingredients: 'Retinol 0.3%, Bakuchiol 1%', Skin_Type: 'All Skin Types', Paraben_Free: 'Yes', Usage: 'Night Only', Texture: 'Rich Cream' }),
      tags: JSON.stringify(['night-cream', 'retinol', 'anti-aging', 'skincare', 'pureskin']),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
    },
  ];

  const createdProducts: Record<string, string> = {};
  for (const p of productsData) {
    const product = await db.product.create({
      data: {
        title: p.title,
        slug: slugify(p.title),
        description: p.description,
        shortDesc: p.shortDesc,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        categoryId: p.categoryId,
        brandId: p.brandId,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        specifications: p.specifications,
        tags: p.tags,
        status: 'published',
        publishedAt: new Date(),
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        isNewArrival: p.isNewArrival,
        isTrending: p.isTrending,
      },
    });
    createdProducts[p.sku] = product.id;
  }
  console.log(`  ✅ ${productsData.length} products created.`);

  // ─── 5. Product Images ─────────────────────────────────
  console.log('🖼️  Creating product images...');
  let imageCount = 0;
  for (const p of productsData) {
    const productId = createdProducts[p.sku];
    const shortName = p.title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 3).join('+');
    const imageCountForProduct = (p.sku === 'TPH-001' || p.sku === 'NVS-001' || p.sku === 'URB-003' || p.sku === 'HBL-001' || p.sku === 'TMS-001') ? 4 : (p.sku === 'TPH-002' || p.sku === 'URB-002' || p.sku === 'HBL-002' || p.sku === 'GLW-002') ? 3 : 2;

    for (let i = 0; i < imageCountForProduct; i++) {
      await db.productImage.create({
        data: {
          productId,
          url: `https://placehold.co/600x600/e2e8f0/475569?text=${shortName}+${i + 1}`,
          altText: `${p.title} - Image ${i + 1}`,
          position: i,
        },
      });
      imageCount++;
    }
  }
  console.log(`  ✅ ${imageCount} product images created.`);

  // ─── 6. Product Variants ───────────────────────────────
  console.log('🔄 Creating product variants...');
  const variantsData = [
    // TechPro X1 Pro - Storage variants
    { sku: 'TPH-001', variants: [
      { name: '128GB Black', sku: 'TPH-001-BLK-128', price: 14999, stock: 20, attributes: JSON.stringify({ Color: 'Black', Storage: '128GB' }) },
      { name: '256GB Black', sku: 'TPH-001-BLK-256', price: 16499, stock: 15, attributes: JSON.stringify({ Color: 'Black', Storage: '256GB' }) },
      { name: '512GB Black', sku: 'TPH-001-BLK-512', price: 18999, stock: 10, attributes: JSON.stringify({ Color: 'Black', Storage: '512GB' }) },
    ]},
    // UrbanStyle Premium Cotton Polo - Size variants
    { sku: 'URB-001', variants: [
      { name: 'Small (S)', sku: 'URB-001-S', price: 1250, stock: 50, attributes: JSON.stringify({ Size: 'S', Chest: '38 inch' }) },
      { name: 'Medium (M)', sku: 'URB-001-M', price: 1250, stock: 60, attributes: JSON.stringify({ Size: 'M', Chest: '40 inch' }) },
      { name: 'Large (L)', sku: 'URB-001-L', price: 1250, stock: 50, attributes: JSON.stringify({ Size: 'L', Chest: '42 inch' }) },
      { name: 'Extra Large (XL)', sku: 'URB-001-XL', price: 1250, stock: 40, attributes: JSON.stringify({ Size: 'XL', Chest: '44 inch' }) },
    ]},
    // NovaSound ANC Pro - Color variants
    { sku: 'NVS-001', variants: [
      { name: 'Matte Black', sku: 'NVS-001-BLK', price: 4500, stock: 40, attributes: JSON.stringify({ Color: 'Matte Black' }) },
      { name: 'Silver', sku: 'NVS-001-SLV', price: 4500, stock: 30, attributes: JSON.stringify({ Color: 'Silver' }) },
      { name: 'Midnight Blue', sku: 'NVS-001-BLU', price: 4700, stock: 30, attributes: JSON.stringify({ Color: 'Midnight Blue' }) },
    ]},
    // FreshWear Slim Fit Chino - Size variants
    { sku: 'FRW-001', variants: [
      { name: '30 Waist', sku: 'FRW-001-30', price: 1800, stock: 30, attributes: JSON.stringify({ Size: '30', Waist: '30 inch', Length: '32 inch' }) },
      { name: '32 Waist', sku: 'FRW-001-32', price: 1800, stock: 40, attributes: JSON.stringify({ Size: '32', Waist: '32 inch', Length: '32 inch' }) },
      { name: '34 Waist', sku: 'FRW-001-34', price: 1800, stock: 40, attributes: JSON.stringify({ Size: '34', Waist: '34 inch', Length: '34 inch' }) },
      { name: '36 Waist', sku: 'FRW-001-36', price: 1800, stock: 40, attributes: JSON.stringify({ Size: '36', Waist: '36 inch', Length: '34 inch' }) },
    ]},
    // UrbanStyle Classic Leather Sneakers - Size variants
    { sku: 'URB-003', variants: [
      { name: 'US 8 (EU 41)', sku: 'URB-003-41', price: 3500, stock: 15, attributes: JSON.stringify({ Size: 'US 8', EU: '41' }) },
      { name: 'US 9 (EU 42)', sku: 'URB-003-42', price: 3500, stock: 15, attributes: JSON.stringify({ Size: 'US 9', EU: '42' }) },
      { name: 'US 10 (EU 43)', sku: 'URB-003-43', price: 3500, stock: 15, attributes: JSON.stringify({ Size: 'US 10', EU: '43' }) },
      { name: 'US 11 (EU 44)', sku: 'URB-003-44', price: 3500, stock: 15, attributes: JSON.stringify({ Size: 'US 11', EU: '44' }) },
    ]},
    // GlowUp Matte Lipstick - Shade variants
    { sku: 'GLW-001', variants: [
      { name: 'Ruby Red', sku: 'GLW-001-RR', price: 650, stock: 50, attributes: JSON.stringify({ Shade: 'Ruby Red', Finish: 'Matte' }) },
      { name: 'Nude Pink', sku: 'GLW-001-NP', price: 650, stock: 50, attributes: JSON.stringify({ Shade: 'Nude Pink', Finish: 'Matte' }) },
      { name: 'Coral Sunset', sku: 'GLW-001-CS', price: 650, stock: 40, attributes: JSON.stringify({ Shade: 'Coral Sunset', Finish: 'Matte' }) },
      { name: 'Berry Crush', sku: 'GLW-001-BC', price: 650, stock: 40, attributes: JSON.stringify({ Shade: 'Berry Crush', Finish: 'Matte' }) },
    ]},
    // TimeMaster Chronograph - Strap variants
    { sku: 'TMS-001', variants: [
      { name: 'Brown Leather Strap', sku: 'TMS-001-BRN', price: 6800, stock: 20, attributes: JSON.stringify({ Strap: 'Brown Leather', Dial: 'Blue Sunray' }) },
      { name: 'Black Leather Strap', sku: 'TMS-001-BLK', price: 6800, stock: 20, attributes: JSON.stringify({ Strap: 'Black Leather', Dial: 'Blue Sunray' }) },
    ]},
    // HomeBliss Ergonomic Office Chair - Color variants
    { sku: 'HBL-001', variants: [
      { name: 'Black Mesh', sku: 'HBL-001-BLK', price: 9500, stock: 10, attributes: JSON.stringify({ Color: 'Black', Material: 'Mesh + Foam' }) },
      { name: 'Grey Mesh', sku: 'HBL-001-GRY', price: 9500, stock: 10, attributes: JSON.stringify({ Color: 'Grey', Material: 'Mesh + Foam' }) },
    ]},
  ];

  let variantCount = 0;
  for (const vg of variantsData) {
    const productId = createdProducts[vg.sku];
    for (let i = 0; i < vg.variants.length; i++) {
      const v = vg.variants[i];
      await db.productVariant.create({
        data: {
          productId,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stockQuantity: v.stock,
          attributes: v.attributes,
          position: i,
        },
      });
      variantCount++;
    }
  }
  console.log(`  ✅ ${variantCount} product variants created across ${variantsData.length} products.`);

  // ─── 7. Coupons ─────────────────────────────────────────
  console.log('🎫 Creating coupons...');
  const couponsData = [
    {
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minOrderAmount: 500,
      maxDiscount: null,
      maxUses: null,
      perUserLimit: 1,
      active: true,
    },
    {
      code: 'FLAT200',
      type: 'fixed',
      value: 200,
      minOrderAmount: 2000,
      maxDiscount: null,
      maxUses: 100,
      perUserLimit: 1,
      active: true,
    },
    {
      code: 'SUMMER20',
      type: 'percentage',
      value: 20,
      minOrderAmount: 1000,
      maxDiscount: 2000,
      maxUses: null,
      perUserLimit: 2,
      active: true,
    },
  ];

  for (const c of couponsData) {
    await db.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderAmount: c.minOrderAmount,
        maxDiscount: c.maxDiscount,
        maxUses: c.maxUses,
        perUserLimit: c.perUserLimit,
        active: c.active,
      },
    });
  }
  console.log('  ✅ 3 coupons created.');

  // ─── 8. Homepage Sections ──────────────────────────────
  console.log('🏠 Creating homepage sections...');
  const homepageSections = [
    { type: 'hero_banner', title: 'Welcome to ShopNova', config: JSON.stringify({ subtitle: 'Discover Premium Products at Amazing Prices', cta: 'Shop Now', ctaLink: '#shop' }), position: 0, active: true },
    { type: 'featured_categories', title: 'Shop by Category', config: JSON.stringify({ layout: 'grid' }), position: 1, active: true },
    { type: 'flash_sale', title: 'Flash Sale', config: JSON.stringify({ duration: 24, badge: 'Hot Deals' }), position: 2, active: true },
    { type: 'featured_products', title: 'Featured Products', config: JSON.stringify({ maxItems: 8 }), position: 3, active: true },
    { type: 'best_sellers', title: 'Best Sellers', config: JSON.stringify({ maxItems: 8 }), position: 4, active: true },
    { type: 'new_arrivals', title: 'New Arrivals', config: JSON.stringify({ maxItems: 8 }), position: 5, active: true },
    { type: 'promotional_banner', title: 'Summer Collection', config: JSON.stringify({ subtitle: 'Up to 40% Off', cta: 'Explore', ctaLink: '#shop' }), position: 6, active: true },
    { type: 'trending_products', title: 'Trending Now', config: JSON.stringify({ maxItems: 8 }), position: 7, active: true },
  ];

  for (const s of homepageSections) {
    await db.homepageSection.create({ data: s });
  }
  console.log('  ✅ 8 homepage sections created.');

  // ─── 9. Banners ────────────────────────────────────────
  console.log('🎨 Creating banners...');
  const bannersData = [
    {
      title: 'Mega Electronics Sale',
      imageUrl: 'https://placehold.co/1200x400/1e293b/f8fafc?text=Mega+Electronics+Sale+-+Up+to+30%25+Off',
      linkUrl: '#electronics',
      position: 0,
      active: true,
    },
    {
      title: 'New Fashion Collection',
      imageUrl: 'https://placehold.co/1200x400/7c3aed/faf5ff?text=New+Fashion+Collection+-+Shop+Now',
      linkUrl: '#fashion',
      position: 1,
      active: true,
    },
    {
      title: 'Beauty Bonanza',
      imageUrl: 'https://placehold.co/1200x400/be123c/fff1f2?text=Beauty+Bonanza+-+Buy+2+Get+1+Free',
      linkUrl: '#beauty',
      position: 2,
      active: true,
    },
  ];

  for (const b of bannersData) {
    await db.banner.create({ data: b });
  }
  console.log('  ✅ 3 banners created.');

  // ─── 10. FAQs ──────────────────────────────────────────
  console.log('❓ Creating FAQs...');
  const faqsData = [
    {
      question: 'What are the shipping options available?',
      answer: 'We offer three shipping options: Standard Delivery (3-5 business days, ৳120), Express Delivery (1-2 business days, ৳250), and Inside Dhaka Delivery (1-2 business days, ৳60). Orders above ৳5,000 qualify for free standard shipping across Bangladesh.',
      category: 'Shipping',
      position: 0,
    },
    {
      question: 'What is your return and exchange policy?',
      answer: 'We offer a 7-day return and exchange policy from the date of delivery. Items must be unused, unwashed, and in their original packaging with all tags intact. To initiate a return, please contact our support team with your order number. Refunds are processed within 5-7 business days after we receive the returned item.',
      category: 'Returns',
      position: 1,
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept multiple payment methods including Cash on Delivery (COD), bKash, Nagad, Rocket, SSLCommerz (credit/debit cards), and bank transfers. For international orders, we support major credit cards and PayPal through SSLCommerz.',
      category: 'Payment',
      position: 2,
    },
    {
      question: 'How can I track my order?',
      answer: 'Once your order is shipped, you will receive an SMS and email with a tracking number. You can use this number on our website\'s "Track Order" page or directly on the courier partner\'s website to get real-time updates on your delivery status.',
      category: 'Orders',
      position: 3,
    },
    {
      question: 'Do you offer cash on delivery?',
      answer: 'Yes, we offer Cash on Delivery (COD) for all orders within Bangladesh. Please note that for COD orders, you must accept the delivery and pay the exact amount. We do not offer partial payments or change for COD orders.',
      category: 'Payment',
      position: 4,
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach our customer support team through multiple channels: Email us at support@shopnova.com, call us at +880 1234-567890 (Saturday-Thursday, 9 AM - 9 PM), or use the live chat feature on our website. We typically respond to emails within 24 hours.',
      category: 'Support',
      position: 5,
    },
    {
      question: 'Can I cancel my order after placing it?',
      answer: 'Yes, you can cancel your order within 1 hour of placing it. After that, cancellation may not be possible if the order has already been processed for shipping. To cancel, go to your order details page or contact our support team immediately.',
      category: 'Orders',
      position: 6,
    },
    {
      question: 'Are the products on ShopNova authentic?',
      answer: 'Absolutely! We are authorized retailers for all the brands we carry. Every product comes with original packaging, brand warranty, and authenticity documentation. We source our products directly from brands or their authorized distributors to guarantee 100% authenticity.',
      category: 'General',
      position: 7,
    },
  ];

  for (const f of faqsData) {
    await db.fAQ.create({ data: f });
  }
  console.log('  ✅ 8 FAQs created.');

  // ─── 11. Shipping Methods ──────────────────────────────
  console.log('🚚 Creating shipping methods...');
  const shippingMethods = [
    {
      name: 'Standard Delivery',
      description: 'Standard delivery across Bangladesh. Delivery within 3-5 business days.',
      fee: 120,
      estimatedDays: '3-5',
      active: true,
      freeAbove: 5000,
      zones: JSON.stringify([{ name: 'Outside Dhaka', fee: 120 }, { name: 'Dhaka Suburbs', fee: 120 }]),
    },
    {
      name: 'Express Delivery',
      description: 'Fast express delivery for urgent orders. Delivery within 1-2 business days.',
      fee: 250,
      estimatedDays: '1-2',
      active: true,
      freeAbove: null,
      zones: JSON.stringify([{ name: 'Dhaka City', fee: 250 }, { name: 'Major Cities', fee: 300 }]),
    },
    {
      name: 'Inside Dhaka',
      description: 'Affordable delivery within Dhaka city limits. Delivery within 1-2 business days.',
      fee: 60,
      estimatedDays: '1-2',
      active: true,
      freeAbove: 5000,
      zones: JSON.stringify([{ name: 'Dhaka City', fee: 60 }]),
    },
  ];

  for (const sm of shippingMethods) {
    await db.shippingMethod.create({ data: sm });
  }
  console.log('  ✅ 3 shipping methods created.');

  // ─── 12. Admin User ─────────────────────────────────────
  console.log('👤 Creating admin user...');
  const adminPassword = await hash('admin123', 12);
  const admin = await db.user.create({
    data: {
      email: 'admin@shopnova.com',
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'admin',
      emailVerified: true,
    },
  });
  console.log('  ✅ Admin user created (admin@shopnova.com).');

  // ─── 13. Demo Customer ─────────────────────────────────
  console.log('👤 Creating demo customer...');
  const customerPassword = await hash('customer123', 12);
  const customer = await db.user.create({
    data: {
      email: 'customer@example.com',
      passwordHash: customerPassword,
      name: 'John Doe',
      role: 'customer',
      phone: '+880 1712-345678',
      emailVerified: true,
    },
  });

  await db.address.create({
    data: {
      userId: customer.id,
      label: 'Home',
      fullName: 'John Doe',
      phone: '+880 1712-345678',
      addressLine1: 'House 42, Road 11, Block E',
      city: 'Banani',
      district: 'Dhaka',
      postalCode: '1213',
      isDefault: true,
    },
  });
  console.log('  ✅ Demo customer created (customer@example.com) with address.');

  // ─── 14. CMS Pages ─────────────────────────────────────
  console.log('📄 Creating CMS pages...');
  const cmsPages = [
    {
      title: 'About ShopNova',
      slug: 'about',
      status: 'published',
      seoTitle: 'About Us - ShopNova',
      seoDescription: 'Learn about ShopNova, your premium shopping destination in Bangladesh. Discover our mission, values, and commitment to quality.',
      content: `ShopNova was founded with a simple yet powerful vision: to make premium products accessible to everyone in Bangladesh. Since our inception, we have been committed to curating the finest collection of electronics, fashion, home essentials, and beauty products from both local and international brands.

Our team of passionate individuals works tirelessly to ensure that every product on our platform meets the highest standards of quality and authenticity. We believe that shopping should be a delightful experience, and we strive to make every interaction with ShopNova seamless and enjoyable.

At ShopNova, customer satisfaction is at the core of everything we do. From our easy-to-navigate website to our responsive customer support team, every aspect of our service is designed with you in mind. We offer fast and reliable shipping across Bangladesh, secure payment options, and a hassle-free return policy.

We are also deeply committed to supporting local brands and artisans. Through our platform, talented Bangladeshi creators can reach a wider audience, helping to grow the local economy and showcase the best of what our country has to offer.

Thank you for choosing ShopNova. We look forward to serving you and being your trusted shopping partner for years to come.`,
    },
    {
      title: 'Contact Us',
      slug: 'contact',
      status: 'published',
      seoTitle: 'Contact Us - ShopNova',
      seoDescription: 'Get in touch with ShopNova. Find our contact information, support hours, and reach out to our team for any questions or concerns.',
      content: `We would love to hear from you! Whether you have a question about our products, need assistance with an order, or simply want to share your feedback, our team is here to help.

You can reach us through the following channels:

Email: support@shopnova.com
Phone: +880 1234-567890 (Saturday-Thursday, 9 AM - 9 PM)
Facebook: facebook.com/shopnova
Instagram: instagram.com/shopnova

For business inquiries and partnership opportunities, please email us at partners@shopnova.com. We are always open to collaborating with brands, influencers, and content creators who share our passion for quality.

Our headquarters is located in Dhaka, Bangladesh. While we do not currently offer in-person shopping or pickup at our office, you can place orders through our website and have them delivered to your doorstep anywhere in Bangladesh.

We aim to respond to all emails within 24 hours. For urgent matters, please call our phone support during business hours for immediate assistance.`,
    },
    {
      title: 'Shipping Policy',
      slug: 'shipping-policy',
      status: 'published',
      seoTitle: 'Shipping Policy - ShopNova',
      seoDescription: 'Learn about ShopNova shipping options, delivery times, and shipping fees. Free shipping on orders above ৳5,000.',
      content: `At ShopNova, we strive to deliver your orders as quickly and safely as possible. We partner with leading courier services in Bangladesh to ensure reliable delivery to every corner of the country.

We offer three shipping options to suit your needs: Standard Delivery (3-5 business days for ৳120), Express Delivery (1-2 business days for ৳250), and Inside Dhaka Delivery (1-2 business days for ৳60). Orders above ৳5,000 qualify for free standard shipping across Bangladesh.

Once your order is confirmed and processed, you will receive a shipping confirmation email and SMS with a tracking number. You can use this tracking number to monitor your package in real-time through our website or the courier partner's tracking system.

Please note that delivery times are estimates and may vary based on your location, weather conditions, and courier operational schedules. Orders placed on Fridays or during public holidays may experience slight delays in processing.

For orders delivered outside Dhaka, please allow additional time for the courier to reach your area. Remote areas may take 1-2 extra business days. If you have not received your order within the estimated timeframe, please contact our support team for assistance.`,
    },
    {
      title: 'Return Policy',
      slug: 'return-policy',
      status: 'published',
      seoTitle: 'Return Policy - ShopNova',
      seoDescription: 'ShopNova return and exchange policy. Learn how to return or exchange products within 7 days of delivery.',
      content: `We want you to be completely satisfied with every purchase from ShopNova. If for any reason you are not happy with your order, we offer a straightforward 7-day return and exchange policy from the date of delivery.

To be eligible for a return, items must be unused, unwashed, and in their original condition with all tags, labels, and packaging intact. Products that have been used, altered, or damaged by the customer will not be accepted for return. Certain categories such as fragrances, intimate items, and personalized products are non-returnable for hygiene reasons.

To initiate a return, please contact our support team at support@shopnova.com with your order number and the reason for return. We will provide you with a return shipping label and detailed instructions. Once we receive and inspect the returned item, a refund or exchange will be processed within 5-7 business days.

Refunds will be issued to your original payment method. For Cash on Delivery orders, refunds can be processed via bKash, bank transfer, or store credit. Please note that shipping fees are non-refundable unless the return is due to a defective or incorrect item shipped by us.

If you received a defective, damaged, or incorrect item, please contact us immediately with photos of the issue. We will arrange a replacement or full refund at no additional cost to you.`,
    },
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      status: 'published',
      seoTitle: 'Privacy Policy - ShopNova',
      seoDescription: 'Read ShopNova privacy policy to understand how we collect, use, and protect your personal information.',
      content: `At ShopNova, we take your privacy seriously and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and safeguard your data when you use our website and services.

We collect information that you provide directly to us, including your name, email address, phone number, shipping address, and payment details when you create an account or place an order. We also automatically collect certain information such as your IP address, browser type, device information, and browsing patterns on our website to improve your shopping experience.

Your personal information is used to process orders, communicate with you about your purchases, provide customer support, personalize your shopping experience, and send promotional communications (only with your consent). We never sell your personal data to third parties.

We implement industry-standard security measures including SSL encryption, secure payment processing through SSLCommerz, and regular security audits to protect your information. However, no method of internet transmission is 100% secure, and we cannot guarantee absolute security.

You have the right to access, update, or delete your personal information at any time by contacting us or through your account settings. You can also opt out of marketing communications by clicking the unsubscribe link in any promotional email. For more details, please contact us at privacy@shopnova.com.`,
    },
    {
      title: 'Terms and Conditions',
      slug: 'terms',
      status: 'published',
      seoTitle: 'Terms and Conditions - ShopNova',
      seoDescription: 'Read the terms and conditions for using ShopNova website and services.',
      content: `Welcome to ShopNova. By accessing and using our website and services, you agree to be bound by these Terms and Conditions. Please read them carefully before making any purchase or using our platform.

ShopNova is an online marketplace that connects buyers with various brands and sellers. While we ensure the quality and authenticity of all products listed on our platform, the actual sale is between you and the respective brand or seller. Product descriptions, images, and prices are subject to change without prior notice.

All prices are listed in Bangladeshi Taka (BDT) and include applicable taxes unless stated otherwise. We reserve the right to modify prices at any time. In the event of a pricing error, we will notify you and offer the option to proceed at the correct price or cancel the order.

Users must be at least 18 years old to create an account and make purchases on ShopNova. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Any fraudulent activity, including the use of stolen payment information, will be reported to the relevant authorities.

These terms are governed by the laws of Bangladesh. Any disputes arising from the use of our services shall be resolved through amicable negotiation or, if necessary, through the courts of Dhaka, Bangladesh. We reserve the right to update these terms at any time, and continued use of our platform constitutes acceptance of the updated terms.`,
    },
    {
      title: 'Frequently Asked Questions',
      slug: 'faq',
      status: 'published',
      seoTitle: 'FAQ - ShopNova',
      seoDescription: 'Find answers to commonly asked questions about ShopNova orders, shipping, returns, payments, and more.',
      content: `Welcome to the ShopNova FAQ page! Here you will find answers to the most commonly asked questions about our products, services, and policies.

Ordering & Shipping: Browse our FAQ section below for detailed information about shipping options, delivery times, and order tracking. We offer multiple shipping methods to ensure your order reaches you quickly and safely, with free shipping on orders above ৳5,000.

Returns & Exchanges: Not satisfied with your purchase? We offer a hassle-free 7-day return policy. Check our returns section for step-by-step instructions on how to initiate a return or exchange.

Payments & Pricing: We accept various payment methods including Cash on Delivery, bKash, Nagad, Rocket, and SSLCommerz. All prices are listed in BDT and are inclusive of applicable taxes.

If you cannot find the answer to your question here, please do not hesitate to contact our customer support team at support@shopnova.com or call us at +880 1234-567890. We are always happy to help!`,
    },
    {
      title: 'Help Center',
      slug: 'help',
      status: 'published',
      seoTitle: 'Help Center - ShopNova',
      seoDescription: 'Get help with your ShopNova orders, account, payments, and more. Find guides and resources to resolve common issues.',
      content: `Welcome to the ShopNova Help Center! Our goal is to help you find quick answers and resolve any issues you may encounter while shopping with us.

Getting Started: New to ShopNova? Create an account in just a few steps and start exploring thousands of premium products. You can browse by category, brand, or use our search feature to find exactly what you are looking for.

Placing an Order: Add items to your cart, proceed to checkout, and choose your preferred payment and shipping method. You will receive an order confirmation via email and SMS immediately after placing your order.

Managing Your Account: Log in to your account to view order history, track shipments, manage addresses, update your profile, and manage your wishlist. You can also reset your password if you have forgotten it.

Troubleshooting: If you are experiencing technical issues with our website, try clearing your browser cache, using a different browser, or checking your internet connection. If the problem persists, contact our technical support team with details about the issue and the device/browser you are using. We will work to resolve it as quickly as possible.`,
    },
  ];

  for (const page of cmsPages) {
    await db.cmsPage.create({ data: page });
  }
  console.log('  ✅ 8 CMS pages created.');

  console.log('\n✅ Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Store Settings:   14`);
  console.log(`  Categories:       18 (4 parent + 14 child)`);
  console.log(`  Brands:           10`);
  console.log(`  Products:         ${productsData.length}`);
  console.log(`  Product Images:   ${imageCount}`);
  console.log(`  Product Variants: ${variantCount}`);
  console.log(`  Coupons:          3`);
  console.log(`  Homepage Sections:8`);
  console.log(`  Banners:          3`);
  console.log(`  FAQs:             8`);
  console.log(`  Shipping Methods: 3`);
  console.log(`  Users:            2 (admin + customer)`);
  console.log(`  Addresses:        1`);
  console.log(`  CMS Pages:        8`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
