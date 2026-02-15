const pool = require("./db");
const bcrypt = require("bcrypt");

async function seed() {
  try {
    const fs = require("fs");
    const schema = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    await pool.query(schema);
    console.log("Tables created");

    const hash = await bcrypt.hash("demo1234", 10);
    const users = await Promise.all([
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["sneakerhead", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["kicksdealer", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["solecollector", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["hypeking", hash]),
      pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id, username", ["retrorunner", hash]),
    ]);
    console.log("Users seeded");

    const s1 = users[0].rows[0]?.id || 1;
    const s2 = users[1].rows[0]?.id || 2;
    const s3 = users[2].rows[0]?.id || 3;
    const s4 = users[3].rows[0]?.id || 4;
    const s5 = users[4].rows[0]?.id || 5;

    const sneakers = [
      // Nike
      { name: "Air Jordan 1 Retro High OG Chicago", brand: "Nike", description: "The iconic Chicago colorway. White, black, and varsity red leather upper.", image_url: "https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-2015.jpg", retail_price: 170, size: "10", category: "sneakers", seller_id: s1 },
      { name: "Nike Dunk Low Panda", brand: "Nike", description: "Clean black and white colorway. Leather upper with classic Dunk styling.", image_url: "https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021.jpg", retail_price: 100, size: "9.5", category: "sneakers", seller_id: s2 },
      { name: "Air Force 1 Low White", brand: "Nike", description: "The classic all-white AF1. Full-grain leather upper.", image_url: "https://images.stockx.com/images/Nike-Air-Force-1-Low-White-07.jpg", retail_price: 90, size: "10.5", category: "sneakers", seller_id: s3 },
      { name: "Jordan 4 Retro Bred", brand: "Nike", description: "Black cement grey and fire red. Iconic Jordan 4 colorway.", image_url: "https://images.stockx.com/images/Air-Jordan-4-Retro-Bred-2019.jpg", retail_price: 200, size: "10", category: "sneakers", seller_id: s1 },
      { name: "Nike SB Dunk Low Travis Scott", brand: "Nike", description: "Cactus Jack collaboration. Paisley print with mismatched Swooshes.", image_url: "https://images.stockx.com/images/Nike-SB-Dunk-Low-Travis-Scott.jpg", retail_price: 150, size: "9", category: "sneakers", seller_id: s4 },
      { name: "Air Jordan 11 Retro Bred", brand: "Nike", description: "Patent leather mudguard with black and red upper. Holiday 2019 release.", image_url: "https://images.stockx.com/images/Air-Jordan-11-Retro-Bred-2019.jpg", retail_price: 220, size: "11", category: "sneakers", seller_id: s2 },
      { name: "Nike Air Max 90 Infrared", brand: "Nike", description: "OG infrared colorway. Mesh and suede upper with visible Air unit.", image_url: "https://images.stockx.com/images/Nike-Air-Max-90-Infrared-2020.jpg", retail_price: 140, size: "10", category: "sneakers", seller_id: s1 },
      { name: "Air Jordan 1 Low Travis Scott Reverse Mocha", brand: "Nike", description: "Reverse mocha colorway with Cactus Jack branding and backwards Swoosh.", image_url: "https://images.stockx.com/images/Air-Jordan-1-Low-OG-SP-Travis-Scott-Reverse-Mocha.jpg", retail_price: 150, size: "10", category: "sneakers", seller_id: s5 },
      { name: "Nike Dunk Low Grey Fog", brand: "Nike", description: "Grey and white leather construction with classic Dunk lines.", image_url: "https://images.stockx.com/images/Nike-Dunk-Low-Grey-Fog.jpg", retail_price: 100, size: "9", category: "sneakers", seller_id: s3 },
      { name: "Air Jordan 3 Retro White Cement Reimagined", brand: "Nike", description: "Reimagined version of the iconic White Cement colorway with no Nike Air on the heel.", image_url: "https://images.stockx.com/images/Air-Jordan-3-Retro-White-Cement-Reimagined.jpg", retail_price: 200, size: "10.5", category: "sneakers", seller_id: s4 },
      { name: "Nike Air Max 1 Patta Waves Monarch", brand: "Nike", description: "Collaboration with Patta featuring wavy mudguard and premium materials.", image_url: "https://images.stockx.com/images/Nike-Air-Max-1-Patta-Waves-Monarch.jpg", retail_price: 160, size: "9.5", category: "sneakers", seller_id: s1 },
      { name: "Air Jordan 5 Retro Fire Red", brand: "Nike", description: "OG Fire Red colorway with reflective tongue and shark teeth midsole.", image_url: "https://images.stockx.com/images/Air-Jordan-5-Retro-Fire-Red-Silver-Tongue-2020.jpg", retail_price: 200, size: "11", category: "sneakers", seller_id: s2 },

      // Adidas
      { name: "Yeezy Boost 350 V2 Zebra", brand: "Adidas", description: "White and core black Primeknit upper with red SPLY-350 branding.", image_url: "https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra.jpg", retail_price: 220, size: "10", category: "sneakers", seller_id: s2 },
      { name: "Adidas Samba OG White", brand: "Adidas", description: "Classic indoor soccer shoe. White leather with gum sole.", image_url: "https://images.stockx.com/images/Adidas-Samba-OG-Cloud-White.jpg", retail_price: 100, size: "10", category: "sneakers", seller_id: s1 },
      { name: "Yeezy Boost 350 V2 Beluga Reflective", brand: "Adidas", description: "Grey and solar red Primeknit with reflective stripe.", image_url: "https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Beluga-Reflective.jpg", retail_price: 230, size: "10.5", category: "sneakers", seller_id: s4 },
      { name: "Adidas Campus 00s Grey", brand: "Adidas", description: "Retro campus silhouette in grey suede with white stripes.", image_url: "https://images.stockx.com/images/Adidas-Campus-00s-Grey-White.jpg", retail_price: 100, size: "9", category: "sneakers", seller_id: s3 },
      { name: "Yeezy Slide Onyx", brand: "Adidas", description: "All-black injected EVA foam slide. Minimal and comfortable.", image_url: "https://images.stockx.com/images/Adidas-Yeezy-Slide-Onyx.jpg", retail_price: 70, size: "10", category: "sandals", seller_id: s5 },
      { name: "Adidas Gazelle Bold Pink Glow", brand: "Adidas", description: "Platform Gazelle in pink glow suede with cream sole.", image_url: "https://images.stockx.com/images/Adidas-Gazelle-Bold-Pink-Glow.jpg", retail_price: 120, size: "8", category: "sneakers", seller_id: s2 },

      // New Balance
      { name: "New Balance 550 White Green", brand: "New Balance", description: "Retro basketball silhouette with white leather and green accents.", image_url: "https://images.stockx.com/images/New-Balance-550-White-Green.jpg", retail_price: 110, size: "11", category: "sneakers", seller_id: s1 },
      { name: "New Balance 2002R Protection Pack Rain Cloud", brand: "New Balance", description: "Deconstructed upper with raw edges. Rain Cloud grey colorway.", image_url: "https://images.stockx.com/images/New-Balance-2002R-Protection-Pack-Rain-Cloud.jpg", retail_price: 130, size: "10", category: "sneakers", seller_id: s3 },
      { name: "New Balance 990v6 Grey", brand: "New Balance", description: "Made in USA. Premium grey suede and mesh upper with ENCAP midsole.", image_url: "https://images.stockx.com/images/New-Balance-990v6-Made-in-USA-Grey.jpg", retail_price: 200, size: "10.5", category: "sneakers", seller_id: s4 },
      { name: "New Balance 530 White Silver", brand: "New Balance", description: "Retro running shoe with mesh and synthetic upper. ABZORB cushioning.", image_url: "https://images.stockx.com/images/New-Balance-530-White-Silver-Navy.jpg", retail_price: 100, size: "9.5", category: "sneakers", seller_id: s5 },

      // Converse / Vans / Other
      { name: "Converse Chuck Taylor All Star Low White", brand: "Converse", description: "The original. Canvas upper, rubber toe cap, All Star patch.", image_url: "https://images.stockx.com/images/Converse-Chuck-Taylor-All-Star-Low-White.jpg", retail_price: 55, size: "10", category: "sneakers", seller_id: s1 },
      { name: "Vans Old Skool Black White", brand: "Vans", description: "Classic skate shoe. Suede and canvas with the iconic side stripe.", image_url: "https://images.stockx.com/images/Vans-Old-Skool-Black-White.jpg", retail_price: 65, size: "10", category: "sneakers", seller_id: s2 },
      { name: "Puma Suede Classic Black", brand: "Puma", description: "Suede upper with Formstrip and Puma logo. Classic since 1968.", image_url: "https://images.stockx.com/images/Puma-Suede-Classic-XXI-Black-White.jpg", retail_price: 70, size: "10", category: "sneakers", seller_id: s3 },
      { name: "Reebok Club C 85 Vintage White", brand: "Reebok", description: "Clean white leather tennis shoe with off-white midsole for vintage look.", image_url: "https://images.stockx.com/images/Reebok-Club-C-85-Vintage-White.jpg", retail_price: 75, size: "10", category: "sneakers", seller_id: s4 },
      { name: "ASICS Gel-Kayano 14 Silver", brand: "ASICS", description: "Y2K running silhouette. GEL cushioning with metallic silver upper.", image_url: "https://images.stockx.com/images/ASICS-Gel-Kayano-14-White-Midnight.jpg", retail_price: 150, size: "10", category: "sneakers", seller_id: s5 },
    ];

    for (const s of sneakers) {
      await pool.query(
        "INSERT INTO products (name, brand, description, image_url, retail_price, size, category, seller_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [s.name, s.brand, s.description, s.image_url, s.retail_price, s.size, s.category, s.seller_id]
      );
    }
    console.log("Products seeded: " + sneakers.length + " sneakers");

    // Add bids and asks for most products
    const products = await pool.query("SELECT id, retail_price FROM products");
    for (const p of products.rows) {
      const price = Number(p.retail_price);
      // Random bid below retail
      const bidPrice = Math.round(price * (0.8 + Math.random() * 0.3));
      // Random ask above retail
      const askPrice = Math.round(price * (1.1 + Math.random() * 0.5));
      // Pick random users for bid and ask
      const bidUser = [s1, s2, s3, s4, s5][Math.floor(Math.random() * 5)];
      const askUser = [s1, s2, s3, s4, s5][Math.floor(Math.random() * 5)];
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'bid', 'active')",
        [p.id, bidUser, bidPrice]
      );
      await pool.query(
        "INSERT INTO bids (product_id, user_id, amount, type, status) VALUES ($1, $2, $3, 'ask', 'active')",
        [p.id, askUser, askPrice]
      );
    }
    console.log("Bids/asks seeded for all products");

    // Create some completed orders for price history
    const prods = await pool.query("SELECT id, retail_price FROM products LIMIT 10");
    for (const p of prods.rows) {
      const price = Number(p.retail_price);
      const salePrice = Math.round(price * (0.9 + Math.random() * 0.4));
      const buyer = [s1, s2, s3, s4, s5][Math.floor(Math.random() * 5)];
      const seller = [s1, s2, s3, s4, s5][Math.floor(Math.random() * 5)];
      if (buyer !== seller) {
        await pool.query(
          "INSERT INTO orders (product_id, buyer_id, seller_id, price, status) VALUES ($1, $2, $3, $4, 'completed')",
          [p.id, buyer, seller, salePrice]
        );
      }
    }
    console.log("Sample orders seeded for price history");

    console.log("Seed complete! " + sneakers.length + " products loaded.");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
