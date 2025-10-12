const MenuItem = require('../models/MenuItem');
const MenuItemsMap = require('../models/MenuItemsMap');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { deleteCachePattern } = require('../utils/cache');
const fs = require('fs');

const createItem = async (req, res) => {
  try {
    const { item_name, description, price, veg = true, category } = req.body;

    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can create items'
      });
    }

    let image = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path, 'menu-items');
        image = {
          url: result.url,
          public_id: result.public_id
        };
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        if (req.file) fs.unlinkSync(req.file.path);
        throw uploadError;
      }
    }

    const item = await MenuItem.create({
      item_name,
      description,
      price,
      veg: veg === 'true' || veg === true,
      category,
      ...(image && { image })
    });

    // Clear menu cache
    await deleteCachePattern(`menus:*`);

    res.status(201).json({
      status: 'success',
      message: 'Item created successfully',
      data: { item }
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Create Item Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, veg, category, search } = req.query;
    const filter = {};

    if (veg !== undefined) filter.veg = veg === 'true';
    if (category) filter.category = new RegExp(category, 'i');
    if (search) filter.item_name = new RegExp(search, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, totalCount] = await Promise.all([
      MenuItem.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      MenuItem.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get Items Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await MenuItem.findById(itemId);

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    console.error('Get Item Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = { ...req.body };

    if (updates.veg !== undefined) {
      updates.veg = updates.veg === 'true' || updates.veg === true;
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    // Handle image upload
    if (req.file) {
      try {
        // Delete old image if exists
        if (item.image && item.image.public_id) {
          await deleteFromCloudinary(item.image.public_id);
        }

        const result = await uploadToCloudinary(req.file.path, 'menu-items');
        updates.image = {
          url: result.url,
          public_id: result.public_id
        };
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        if (req.file) fs.unlinkSync(req.file.path);
        throw uploadError;
      }
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(
      itemId,
      updates,
      { new: true, runValidators: true }
    );

    // Clear cache
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: 'success',
      message: 'Item updated successfully',
      data: { item: updatedItem }
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Update Item Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    // Delete image from cloudinary
    if (item.image && item.image.public_id) {
      await deleteFromCloudinary(item.image.public_id);
    }

    await MenuItem.findByIdAndDelete(itemId);
    
    // Delete from menu mappings
    await MenuItemsMap.deleteMany({ item_id: itemId });

    // Clear cache
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: 'success',
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete Item Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const addItemToMenu = async (req, res) => {
  try {
    const { menuId, itemId, quantity = 1 } = req.body;

    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can add items to menu'
      });
    }

    // Check if mapping already exists
    const existingMapping = await MenuItemsMap.findOne({ menu_id: menuId, item_id: itemId });
    if (existingMapping) {
      return res.status(400).json({
        status: 'error',
        message: 'Item already exists in this menu'
      });
    }

    const mapping = await MenuItemsMap.create({
      menu_id: menuId,
      item_id: itemId,
      quantity
    });

    // Clear cache
    await deleteCachePattern(`menus:*`);
    await deleteCachePattern(`menu:${menuId}`);

    res.status(201).json({
      status: 'success',
      message: 'Item added to menu successfully',
      data: { mapping }
    });
  } catch (error) {
    console.error('Add Item to Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const removeItemFromMenu = async (req, res) => {
  try {
    const { menuId, itemId } = req.params;

    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can remove items from menu'
      });
    }

    const mapping = await MenuItemsMap.findOneAndDelete({
      menu_id: menuId,
      item_id: itemId
    });

    if (!mapping) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found in menu'
      });
    }

    // Clear cache
    await deleteCachePattern(`menus:*`);
    await deleteCachePattern(`menu:${menuId}`);

    res.status(200).json({
      status: 'success',
      message: 'Item removed from menu successfully'
    });
  } catch (error) {
    console.error('Remove Item from Menu Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  addItemToMenu,
  removeItemFromMenu
};