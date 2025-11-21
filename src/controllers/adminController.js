const User = require("../models/User");
const MomProfile = require("../models/MomProfile");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const { deleteCachePattern } = require("../utils/cache");

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, is_active } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (is_active !== undefined) filter.is_active = is_active === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .select("-otp -otp_expires -jwt_refresh_token")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    //console.log("Number of MOMS: ", users);
    res.status(200).json({
      status: "success",
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { is_active },
      { new: true }
    ).select("-otp -otp_expires -jwt_refresh_token");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // If deactivating a mom, also deactivate their profile
    if (!is_active && user.role === "mom") {
      await MomProfile.findOneAndUpdate(
        { user_id: userId },
        { is_active: false }
      );
    }

    // Clear user cache
    await deleteCachePattern(`user:${userId}`);
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: "success",
      message: `User ${is_active ? "activated" : "deactivated"} successfully`,
      data: { user },
    });
  } catch (error) {
    console.error("Toggle User Status Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getAllMoms = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active, authenticity } = req.query;
    const filter = {};

    if (is_active !== undefined) filter.is_active = is_active === "true";
    if (authenticity) filter.authenticity = new RegExp(authenticity, "i");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [moms, totalCount] = await Promise.all([
      MomProfile.find(filter)
        .populate("user_id", "name phone_number is_active createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MomProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        moms,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get All Moms Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const toggleMomStatus = async (req, res) => {
  try {
    const { momId } = req.params;
    const { is_active } = req.body;

    const mom = await MomProfile.findByIdAndUpdate(
      momId,
      { is_active },
      { new: true }
    ).populate("user_id", "name phone_number");

    if (!mom) {
      return res.status(404).json({
        status: "error",
        message: "Mom profile not found",
      });
    }

    // If deactivating mom, also deactivate their menus
    if (!is_active) {
      await Menu.updateMany({ mom_id: mom.user_id._id }, { active: false });
    }

    // Clear cache
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: "success",
      message: `Mom profile ${
        is_active ? "activated" : "deactivated"
      } successfully`,
      data: { mom },
    });
  } catch (error) {
    console.error("Toggle Mom Status Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getAllMenus = async (req, res) => {
  try {
    const { page = 1, limit = 20, active, mom_id } = req.query;
    const filter = {};

    if (active !== undefined) filter.active = active === "true";
    if (mom_id) filter.mom_id = mom_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [menus, totalCount] = await Promise.all([
      Menu.find(filter)
        .populate("mom_id", "name phone_number")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Menu.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        menus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get All Menus Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const toggleMenuStatus = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { active } = req.body;

    const menu = await Menu.findByIdAndUpdate(
      menuId,
      { active },
      { new: true }
    ).populate("mom_id", "name phone_number");

    if (!menu) {
      return res.status(404).json({
        status: "error",
        message: "Menu not found",
      });
    }

    // Clear cache
    await deleteCachePattern(`menus:*`);
    await deleteCachePattern(`menu:${menuId}`);

    res.status(200).json({
      status: "success",
      message: `Menu ${active ? "activated" : "deactivated"} successfully`,
      data: { menu },
    });
  } catch (error) {
    console.error("Toggle Menu Status Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalMoms,
      activeMoms,
      totalMenus,
      activeMenus,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      User.countDocuments({ is_active: true }),
      User.countDocuments({ role: "customer", is_active: true }),
      User.countDocuments({ role: "mom", is_active: true }),
      MomProfile.countDocuments({ is_active: true }),
      Menu.countDocuments(),
      Menu.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.aggregate([
        { $match: { payment_status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
      ]),
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate("customer_id", "name phone_number")
      .populate("mom_id", "name phone_number")
      .sort({ createdAt: -1 })
      .limit(10);

    // Order stats by month
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1), // This year
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "delivered"] }, "$total_amount", 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        overview: {
          totalUsers,
          totalCustomers,
          totalMoms,
          activeMoms,
          totalMenus,
          activeMenus,
          totalOrders,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        recentOrders,
        monthlyStats,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllUsers,
  toggleUserStatus,
  getAllMoms,
  toggleMomStatus,
  getAllMenus,
  toggleMenuStatus,
  getDashboardStats,
};
