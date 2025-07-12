const express = require("express");
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  togglePopular,
  getSupplierServices,
  getSupplierBalance,
  deleteAllServices,
} = require("../controllers/services");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getServices);

// Admin only routes
router.use(protect, authorize("admin"));
router.post("/", createService);

// This route needs to come before the /:id route to prevent conflicts
router.delete("/all", deleteAllServices);

// Supplier routes (need to be before /:id routes)
router.get("/supplier/services", getSupplierServices);
router.get("/supplier/balance", getSupplierBalance);

// ID-specific routes
router.get("/:id", getService);
router.put("/:id", updateService);
router.delete("/:id", deleteService);
router.put("/:id/toggle", toggleServiceStatus);
router.put("/:id/popular", togglePopular);

module.exports = router;
