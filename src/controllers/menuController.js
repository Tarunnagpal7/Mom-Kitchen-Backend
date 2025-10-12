const Menu = require('../models/Menu');
const MenuItem = require('../models/MenuItem');
const MenuItemsMap = require('../models/MenuItemsMap');
const MomProfile = require('../models/MomProfile');
const { getCache, setCache, deleteCache, deleteCachePattern } = require('../utils/cache');

const createMenu = async (req, res) => {
  try {
    const { name, description, total_cost, max_orders, items = [], active } = req.body;

    // Verify user is a mom
    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can create menus'
      });
    }

    // Check if mom profile exists and is active
    const momProfile = await MomProfile.findOne({ user_id: req.user._id, is_active: true });
    if (!momProfile) {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete your mom profile first'
      });
    }

    // Set availability to 2 hours from now
    const now = new Date();
    const available_until = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

    const menu = await Menu.create({
      mom_id: req.user._id,
      name,
      description,
      total_cost,
      available_from: now,
      available_until,
      max_orders: max_orders || 15,
      ...(active !== undefined ? { active } : {}),
      items
    });

    // Clear cache
    await deleteCachePattern(`menus:*`);

    res.status(201).json({
      status: 'success',
      message: 'Menu created successfully',
      data: { menu }
    });
  } catch (error) {
    console.error('Create Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};


const getMenus = async (req, res) => {
  try {
    const role = req.headers["x-user-role"] || "customer";
    const { page = 1, limit = 10, mom_id } = req.query;
    const filter = {};

    if (role === "customer") {
      // Only active + available menus
      filter.active = true;
      // filter.available_from = { $lte: new Date() };
      // filter.$or = [
      //   { available_until: { $exists: false } },
      //   { available_until: { $gte: new Date() } },
      // ];
      if (mom_id) filter.mom_id = mom_id;
    } else if (role === "mom") {
      // For mom, fetch menus created by this mom
      filter.mom_id = req.user?._id || mom_id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

   // Total count for pagination
   const totalCount = await Menu.countDocuments(filter);

   // Step 1: Fetch menus with mom basic info
   const menus = await Menu.find(filter)
     .populate('mom_id', 'name ') // from User collection
     .skip(skip)
     .limit(parseInt(limit))
     .lean();

   // Step 2: Fetch mom profiles using mom user_id
   const momIds = menus.map(m => m.mom_id?._id).filter(Boolean);
   const momProfiles = await MomProfile.find({ user_id: { $in: momIds } })
     .select('user_id business_name description rating profile_pic')
     .lean();

   // Step 3: Map mom profile data
   const profileMap = momProfiles.reduce((acc, profile) => {
     acc[profile.user_id.toString()] = profile;
     return acc;
   }, {});

   // Step 4: Attach mom profile to each menu
   const enrichedMenus = menus.map(menu => ({
     ...menu,
     mom_details: profileMap[menu.mom_id?._id?.toString()] || null
   }));

   // Step 5: Keep your existing response structure
   const result = {
     menus: enrichedMenus,
     pagination: {
       currentPage: parseInt(page),
       totalPages: Math.ceil(totalCount / parseInt(limit)),
       totalCount,
       limit: parseInt(limit),
     },
   };

    console.log(result);

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error("Get Menus Error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};


const getMenuById = async (req, res) => {
  try {
    const { menuId } = req.params;
    
    const cacheKey = `menu:${menuId}`;
    let cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.status(200).json({
        status: 'success',
        data: { menu: cachedData },
        cached: true
      });
    }

    const menu = await Menu.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(menuId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'mom_id',
          foreignField: '_id',
          as: 'mom'
        }
      },
      {
        $lookup: {
          from: 'momprofiles',
          localField: 'mom_id',
          foreignField: 'user_id',
          as: 'mom_profile'
        }
      },
      {
        $lookup: {
          from: 'menuitemsmaps',
          localField: '_id',
          foreignField: 'menu_id',
          as: 'items_map'
        }
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items_map.item_id',
          foreignField: '_id',
          as: 'items'
        }
      },
      {
        $addFields: {
          mom: { $arrayElemAt: ['$mom', 0] },
          mom_profile: { $arrayElemAt: ['$mom_profile', 0] }
        }
      }
    ]);

    if (!menu.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu not found'
      });
    }

    // Cache for 15 minutes
    await setCache(cacheKey, menu[0], 900);

    res.status(200).json({
      status: 'success',
      data: { menu: menu[0] }
    });
  } catch (error) {
    console.error('Get Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { menuId } = req.params;
    const updates = req.body;

    // Ensure the user is a mom
    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can update menus'
      });
    }

    // Find the menu to update (only by the logged-in mom)
    const menu = await Menu.findOne({ _id: menuId, mom_id: req.user._id });
    if (!menu) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu not found or unauthorized'
      });
    }

    // If the update sets this menu to active, deactivate others
    if (updates.active === true) {
      await Menu.updateMany(
        { mom_id: req.user._id, _id: { $ne: menuId } },
        { active: false }
      );
    }

    // Update the requested menu
    Object.assign(menu, updates);
    await menu.save();

    // Clear relevant caches
    await deleteCachePattern(`menus:*`);
    await deleteCache(`menu:${menuId}`);

    res.status(200).json({
      status: 'success',
      message: 'Menu updated successfully',
      data: { menu }
    });
  } catch (error) {
    console.error('Update Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { menuId } = req.params;

    const filter = req.user.role === 'admin' ? 
      { _id: menuId } : 
      { _id: menuId, mom_id: req.user._id };

    const menu = await Menu.findOneAndDelete(filter);

    if (!menu) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu not found or unauthorized'
      });
    }

    // Delete related menu items mapping
    await MenuItemsMap.deleteMany({ menu_id: menuId });

    // Clear cache
    await deleteCachePattern(`menus:*`);
    await deleteCache(`menu:${menuId}`);

    res.status(200).json({
      status: 'success',
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    console.error('Delete Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu
};