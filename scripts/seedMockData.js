const mongoose = require('mongoose');
const User = require('../src/models/User');
const Menu = require('../src/models/Menu');
const MenuItem = require('../src/models/MenuItem');
const MenuItemsMap = require('../src/models/MenuItemsMap');
const MomProfile = require('../src/models/MomProfile');
const Address = require('../src/models/Address');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://tarunnagpal:tarunnagpal@cluster0.tjwcmwl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample menu items data
const menuItemsData = [
  // North Indian Items
  {
    item_name: "Dal Makhani",
    description: "Creamy black lentils cooked with butter and cream",
    price: 180,
    veg: true,
    category: "Main Course"
  },
  {
    item_name: "Butter Chicken",
    description: "Tender chicken in rich tomato and cream sauce",
    price: 220,
    veg: false,
    category: "Main Course"
  },
  {
    item_name: "Paneer Tikka",
    description: "Grilled cottage cheese with spices",
    price: 160,
    veg: true,
    category: "Appetizer"
  },
  {
    item_name: "Biryani Rice",
    description: "Fragrant basmati rice with aromatic spices",
    price: 120,
    veg: true,
    category: "Rice"
  },
  {
    item_name: "Naan Bread",
    description: "Soft leavened bread baked in tandoor",
    price: 25,
    veg: true,
    category: "Bread"
  },
  {
    item_name: "Raita",
    description: "Yogurt with cucumber and spices",
    price: 40,
    veg: true,
    category: "Side Dish"
  },

  // South Indian Items
  {
    item_name: "Dosa",
    description: "Crispy fermented crepe made from rice and lentils",
    price: 80,
    veg: true,
    category: "Main Course"
  },
  {
    item_name: "Sambar",
    description: "Spicy lentil soup with vegetables",
    price: 60,
    veg: true,
    category: "Soup"
  },
  {
    item_name: "Coconut Chutney",
    description: "Fresh coconut ground with spices",
    price: 30,
    veg: true,
    category: "Side Dish"
  },
  {
    item_name: "Idli",
    description: "Soft steamed rice cakes",
    price: 50,
    veg: true,
    category: "Main Course"
  },
  {
    item_name: "Vada",
    description: "Crispy fried lentil donuts",
    price: 40,
    veg: true,
    category: "Appetizer"
  },

  // Gujarati Items
  {
    item_name: "Gujarati Thali",
    description: "Complete meal with dal, sabzi, roti, rice, and sweets",
    price: 150,
    veg: true,
    category: "Thali"
  },
  {
    item_name: "Dhokla",
    description: "Steamed savory cake made from gram flour",
    price: 70,
    veg: true,
    category: "Snack"
  },
  {
    item_name: "Khandvi",
    description: "Rolled gram flour snack with yogurt",
    price: 60,
    veg: true,
    category: "Snack"
  },
  {
    item_name: "Fafda",
    description: "Crispy gram flour strips",
    price: 50,
    veg: true,
    category: "Snack"
  },
  {
    item_name: "Jalebi",
    description: "Sweet spiral dessert in sugar syrup",
    price: 40,
    veg: true,
    category: "Dessert"
  },

  // Punjabi Items
  {
    item_name: "Sarson da Saag",
    description: "Mustard greens curry with corn bread",
    price: 140,
    veg: true,
    category: "Main Course"
  },
  {
    item_name: "Makke di Roti",
    description: "Corn flour flatbread",
    price: 30,
    veg: true,
    category: "Bread"
  },
  {
    item_name: "Chole Bhature",
    description: "Spicy chickpeas with fried bread",
    price: 100,
    veg: true,
    category: "Main Course"
  },
  {
    item_name: "Lassi",
    description: "Sweet yogurt drink",
    price: 50,
    veg: true,
    category: "Beverage"
  },

  // Bengali Items
  {
    item_name: "Fish Curry",
    description: "Traditional Bengali fish in mustard sauce",
    price: 200,
    veg: false,
    category: "Main Course"
  },
  {
    item_name: "Mishti Doi",
    description: "Sweet yogurt dessert",
    price: 60,
    veg: true,
    category: "Dessert"
  },
  {
    item_name: "Rasgulla",
    description: "Spongy cottage cheese balls in sugar syrup",
    price: 80,
    veg: true,
    category: "Dessert"
  },

  // Street Food Items
  {
    item_name: "Pani Puri",
    description: "Crispy shells filled with spiced water and potatoes",
    price: 60,
    veg: true,
    category: "Street Food"
  },
  {
    item_name: "Samosa",
    description: "Fried pastry with spiced potato filling",
    price: 25,
    veg: true,
    category: "Snack"
  },
  {
    item_name: "Chaat",
    description: "Tangy street food with yogurt and chutneys",
    price: 80,
    veg: true,
    category: "Street Food"
  }
];

// Sample mom users data
const momUsersData = [
  {
    name: "Priya Sharma",
    phone_number: "+919876543210",
    role: "mom",
    is_verified: true,
    is_active: true
  },
  {
    name: "Sunita Patel",
    phone_number: "+919876543211",
    role: "mom",
    is_verified: true,
    is_active: true
  },
  {
    name: "Kavita Singh",
    phone_number: "+919876543212",
    role: "mom",
    is_verified: true,
    is_active: true
  },
  {
    name: "Meera Joshi",
    phone_number: "+919876543213",
    role: "mom",
    is_verified: true,
    is_active: true
  }
];

// Sample mom profiles data
const momProfilesData = [
  {
    business_name: "Priya's North Indian Kitchen",
    description: "Expert in traditional North Indian cooking with 15 years of experience. Specializing in rich curries, biryanis, and authentic tandoor dishes.",
    authenticity: "Traditional",
    food_type: "both",
    rating: { average: 4.8, count: 1200 }
  },
  {
    business_name: "Sunita's South Indian Delights",
    description: "Specialist in authentic South Indian dishes and traditional recipes. From crispy dosas to flavorful sambars, experience the taste of South India.",
    authenticity: "Traditional",
    food_type: "veg",
    rating: { average: 4.7, count: 950 }
  },
  {
    business_name: "Kavita's Gujarati Thali House",
    description: "Master of Gujarati vegetarian cooking and traditional thali. Experience the authentic taste of Gujarat with our complete meal offerings.",
    authenticity: "Traditional",
    food_type: "veg",
    rating: { average: 4.9, count: 800 }
  },
  {
    business_name: "Meera's Punjabi Dhaba",
    description: "Expert in Punjabi cooking with focus on traditional recipes. From sarson da saag to chole bhature, taste the real Punjab.",
    authenticity: "Traditional",
    food_type: "both",
    rating: { average: 4.6, count: 1500 }
  }
];

// Sample addresses for moms
const momAddressesData = [
  {
    address_line: "123 Sector 15, Gurgaon",
    city: "Gurgaon",
    state: "Haryana",
    pincode: "122001",
    is_default: true
  },
  {
    address_line: "456 Koramangala, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560034",
    is_default: true
  },
  {
    address_line: "789 Satellite, Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    is_default: true
  },
  {
    address_line: "321 Model Town, Delhi",
    city: "Delhi",
    state: "Delhi",
    pincode: "110009",
    is_default: true
  }
];

// Sample menus data
const menusData = [
  {
    name: "North Indian Delight",
    description: "Authentic North Indian cuisine with rich flavors and traditional recipes",
    total_cost: 450,
    available_from: new Date(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    max_orders: 15
  },
  {
    name: "South Indian Special",
    description: "Traditional South Indian meals with authentic taste",
    total_cost: 320,
    available_from: new Date(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    max_orders: 12
  },
  {
    name: "Gujarati Thali Experience",
    description: "Complete Gujarati meal with traditional dishes",
    total_cost: 280,
    available_from: new Date(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    max_orders: 10
  },
  {
    name: "Punjabi Feast",
    description: "Hearty Punjabi meal with rich and flavorful dishes",
    total_cost: 380,
    available_from: new Date(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    max_orders: 8
  }
];

// Menu-item mappings (which items go in which menu)
const menuItemMappings = [
  // North Indian Delight menu
  { menuIndex: 0, itemIndices: [0, 1, 2, 3, 4, 5] }, // Dal Makhani, Butter Chicken, Paneer Tikka, Biryani Rice, Naan, Raita
  
  // South Indian Special menu
  { menuIndex: 1, itemIndices: [6, 7, 8, 9, 10] }, // Dosa, Sambar, Coconut Chutney, Idli, Vada
  
  // Gujarati Thali Experience menu
  { menuIndex: 2, itemIndices: [11, 12, 13, 14, 15] }, // Gujarati Thali, Dhokla, Khandvi, Fafda, Jalebi
  
  // Punjabi Feast menu
  { menuIndex: 3, itemIndices: [16, 17, 18, 19] } // Sarson da Saag, Makke di Roti, Chole Bhature, Lassi
];

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    console.log('Clearing existing data...');
    await MenuItemsMap.deleteMany({});
    await Menu.deleteMany({});
    await MenuItem.deleteMany({});
    await MomProfile.deleteMany({});
    await Address.deleteMany({});
    await User.deleteMany({ role: 'mom' });

    // Create mom users
    console.log('Creating mom users...');
    const momUsers = [];
    for (let i = 0; i < momUsersData.length; i++) {
      const user = await User.create(momUsersData[i]);
      momUsers.push(user);
      console.log(`Created mom user: ${user.name}`);
    }

    // Create mom profiles
    console.log('Creating mom profiles...');
    for (let i = 0; i < momProfilesData.length; i++) {
      const profile = await MomProfile.create({
        user_id: momUsers[i]._id,
        ...momProfilesData[i],
        is_active: true
      });
      console.log(`Created mom profile: ${profile.business_name} for ${momUsers[i].name}`);
    }

    // Create addresses for moms
    console.log('Creating addresses...');
    for (let i = 0; i < momAddressesData.length; i++) {
      const address = await Address.create({
        user_id: momUsers[i]._id,
        ...momAddressesData[i]
      });
      console.log(`Created address for: ${momUsers[i].name}`);
    }

    // Create menu items
    console.log('Creating menu items...');
    const menuItems = [];
    for (const itemData of menuItemsData) {
      const item = await MenuItem.create(itemData);
      menuItems.push(item);
      console.log(`Created menu item: ${item.item_name}`);
    }

    // Create menus
    console.log('Creating menus...');
    const menus = [];
    for (let i = 0; i < menusData.length; i++) {
      const menu = await Menu.create({
        mom_id: momUsers[i]._id,
        ...menusData[i]
      });
      menus.push(menu);
      console.log(`Created menu: ${menu.name} for ${momUsers[i].name}`);
    }

    // Create menu-item mappings
    console.log('Creating menu-item mappings...');
    for (const mapping of menuItemMappings) {
      const menu = menus[mapping.menuIndex];
      for (const itemIndex of mapping.itemIndices) {
        const item = menuItems[itemIndex];
        await MenuItemsMap.create({
          menu_id: menu._id,
          item_id: item._id,
          quantity: 1
        });
        console.log(`Mapped ${item.item_name} to ${menu.name}`);
      }
    }

    console.log('\n=== SEEDING COMPLETE ===');
    console.log(`Created ${momUsers.length} mom users`);
    console.log(`Created ${menuItems.length} menu items`);
    console.log(`Created ${menus.length} menus`);
    console.log(`Created menu-item mappings`);

    // Display summary
    console.log('\n=== MENU SUMMARY ===');
    for (let i = 0; i < menus.length; i++) {
      const menu = menus[i];
      const mappings = await MenuItemsMap.find({ menu_id: menu._id }).populate('item_id');
      console.log(`\n${menu.name} (₹${menu.total_cost})`);
      console.log(`Mom: ${momUsers[i].name} (${momProfilesData[i].business_name})`);
      console.log(`Max Orders: ${menu.max_orders} | Available for 2 hours`);
      console.log(`Items:`);
      mappings.forEach(mapping => {
        console.log(`  - ${mapping.item_id.item_name} (₹${mapping.item_id.price})`);
      });
    }

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedDatabase();
});
