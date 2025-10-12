const User = require('../models/User');
const Address = require('../models/Address');
const Preferences = require('../models/Preferences');
const MomProfile = require('../models/MomProfile');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { setCache, deleteCache } = require('../utils/cache');
const fs = require('fs');
const { use } = require('../routes/auth');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp -otp_expires -jwt_refresh_token');
    const addresses = await Address.find({ user_id: req.user._id });
    const preferences = await Preferences.findOne({ user_id: req.user._id });

    let momProfile = null;
    if (user.role === 'mom') {
      momProfile = await MomProfile.findOne({ user_id: req.user._id });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        addresses,
        preferences,
        momProfile
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, momProfile, preferences } = req.body;

    // 1. Update user name if provided
    const userUpdates = {};
    if (name) userUpdates.name = name;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      userUpdates,
      { new: true, runValidators: true }
    ).select("-otp -otp_expires -jwt_refresh_token");

    // 2. Update MomProfile if momProfile object is provided
    let momProfileUpdated = null;
    if (req.user.role === "mom" && momProfile) {
      momProfileUpdated = await MomProfile.findOneAndUpdate(
        { user_id: req.user._id },
        momProfile,
        { new: true, upsert: true, runValidators: true }
      );
    }

    // 3. Update Preferences if preferences object provided
    let preferencesUpdated = null;
    if (preferences) {
      preferencesUpdated = await Preferences.findOneAndUpdate(
        { user_id: req.user._id },
        preferences,
        { new: true, upsert: true, runValidators: true }
      );
    }

    // Clear cache
    await deleteCache(`user:${req.user._id}`);
    await deleteCache(`momProfile:${req.user._id}`);
    await deleteCache(`preferences:${req.user._id}`);

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user, momProfile: momProfileUpdated, preferences: preferencesUpdated }
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const setupMomProfile = async (req, res) => {
  try {
    console.log("role :", req.user.role)
    if (req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Only moms can setup mom profile'
      });
    }

    const { business_name, description, authenticity, food_type = 'both' } = req.body;

    if (!business_name || !description || !authenticity) {
      return res.status(400).json({
        status: 'error',
        message: 'Business name, description, and authenticity are required'
      });
    }

    let profile_pic = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path, 'mom-profiles');
        profile_pic = {
          url: result.url,
          public_id: result.public_id
        };
        // Delete temp file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        if (req.file) fs.unlinkSync(req.file.path);
        throw uploadError;
      }
    }

    const momProfile = await MomProfile.findOneAndUpdate(
      { user_id: req.user._id },
      {
        business_name,
        description,
        authenticity,
        food_type,
        ...(profile_pic && { profile_pic })
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Mom profile setup successfully',
      data: { momProfile }
    });
  } catch (error) {
    // Clean up file if upload fails
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Setup Mom Profile Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const addAddress = async (req, res) => {
  try {
    const { address_line, city, state, pincode } = req.body;

    // Step 1️⃣: Make all previous addresses non-default
    await Address.updateMany(
      { user_id: req.user._id },
      { is_default: false }
    );

    // Step 2️⃣: Create new address as default
    const address = await Address.create({
      user_id: req.user._id,
      address_line,
      city,
      state,
      pincode,
      is_default: true
    });

    res.status(201).json({
      status: 'success',
      message: 'Address added successfully and set as default',
      data: { address }
    });
  } catch (error) {
    console.error('Add Address Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;

    const address = await Address.findOneAndUpdate(
      { _id: addressId, user_id: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    console.log(address)

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Address updated successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Update Address Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const toggleDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findOneAndUpdate(
      { _id: addressId, user_id: req.user._id },
      { is_default: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found'
      });
    }

    // Make others non-default
    await Address.updateMany(
      { user_id: req.user._id, _id: { $ne: addressId } },
      { is_default: false }
    );

    res.status(200).json({
      status: 'success',
      message: 'Default address updated successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Toggle Default Address Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findOneAndDelete({
      _id: addressId,
      user_id: req.user._id
    });

    if(address.length==1 && address[0].is_default){
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete the only default address'
      });
    }

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Address not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete Address Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const addPreferences = async (req, res) => {
  try {
    const updates = req.body;

    const preferences = await Preferences.findOneAndUpdate(
      { user_id: req.user._id },
      updates,
      { new: true, upsert: true, runValidators: true }
    );
    
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { is_active: true } },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: { preferences }
    });
  } catch (error) {
    console.error('Update Preferences Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  setupMomProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addPreferences,
  toggleDefaultAddress
};