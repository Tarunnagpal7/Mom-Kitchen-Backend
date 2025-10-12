# Database Seeding Scripts

This directory contains scripts to populate the database with mock data for development and testing.

## Available Scripts

### seedMockData.js
Populates the database with comprehensive mock data including:

- **4 Mom Users** with different specializations
- **25+ Menu Items** across various cuisines (North Indian, South Indian, Gujarati, Punjabi, Bengali, Street Food)
- **4 Sample Menus** with different themes and pricing
- **Menu-Item Mappings** to associate items with menus
- **Mom Profiles** with ratings and experience
- **Addresses** for each mom

## Usage

### Prerequisites
1. Make sure MongoDB is running
2. Set up your environment variables (MONGODB_URI)
3. Ensure all required models are properly configured

### Running the Seeding Script

```bash
# Navigate to backend directory
cd backend

# Run the seeding script
npm run seed

# Or run directly with node
node scripts/seedMockData.js
```

### What Gets Created

#### Mom Users
- Priya Sharma (North Indian Cuisine)
- Sunita Patel (South Indian Cuisine) 
- Kavita Singh (Gujarati Cuisine)
- Meera Joshi (Punjabi Cuisine)

#### Menu Items (25+ items)
- **North Indian**: Dal Makhani, Butter Chicken, Paneer Tikka, Biryani Rice, Naan, Raita
- **South Indian**: Dosa, Sambar, Coconut Chutney, Idli, Vada
- **Gujarati**: Gujarati Thali, Dhokla, Khandvi, Fafda, Jalebi
- **Punjabi**: Sarson da Saag, Makke di Roti, Chole Bhature, Lassi
- **Bengali**: Fish Curry, Mishti Doi, Rasgulla
- **Street Food**: Pani Puri, Samosa, Chaat

#### Sample Menus
1. **North Indian Delight** (₹450) - 6 items
2. **South Indian Special** (₹320) - 5 items  
3. **Gujarati Thali Experience** (₹280) - 5 items
4. **Punjabi Feast** (₹380) - 4 items

## Data Structure

The script creates a complete ecosystem:
- Users with proper roles and verification
- Mom profiles with ratings and experience
- Addresses for each mom
- Menu items with categories and pricing
- Menus with availability windows
- Proper mappings between menus and items

## Clearing Data

The script automatically clears existing data before seeding:
- Removes existing mom users
- Clears all menus, menu items, and mappings
- Removes mom profiles and addresses

## Environment Variables

Make sure these are set in your `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/mom-project
```

## Notes

- The script includes proper error handling and logging
- All data is realistic and follows the application's business logic
- Menu items include both vegetarian and non-vegetarian options
- Pricing is set to realistic Indian market rates
- Availability windows are set for the next 4-7 days
