const express = require("express");
const { body, param, query } = require("express-validator");
const { authenticate, authorize } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  createRating,
  getRatingsByMom,
  getMyRatings,
  updateRating,
  deleteRating,
} = require("../controllers/ratingController");

const router = express.Router();

// Create rating (customer only)
router.post(
  "/",
  authenticate,
  authorize("customer"),
  [
    body("mom_id").isMongoId().withMessage("Invalid mom ID"),
    body("order_id").isMongoId().withMessage("Invalid order ID"),
    body("rate")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment cannot be longer than 500 characters"),
  ],
  validateRequest,
  createRating
);

// Get ratings by mom
router.get(
  "/mom/:momId",
  authenticate,
  [
    param("momId").isMongoId().withMessage("Invalid mom ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validateRequest,
  getRatingsByMom
);

// Get my ratings (customer)
router.get(
  "/my-ratings",
  authenticate,
  authorize("customer"),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validateRequest,
  getMyRatings
);

// Update rating (customer only)
router.put(
  "/:ratingId",
  authenticate,
  authorize("customer"),
  [
    param("ratingId").isMongoId().withMessage("Invalid rating ID"),
    body("rate")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment cannot be longer than 500 characters"),
  ],
  validateRequest,
  updateRating
);

// Delete rating (customer only)
router.delete(
  "/:ratingId",
  authenticate,
  authorize("customer"),
  [param("ratingId").isMongoId().withMessage("Invalid rating ID")],
  validateRequest,
  deleteRating
);

module.exports = router;
