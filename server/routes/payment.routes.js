const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createPaymentOrder, verifyPayment } = require("../controllers/payment.controller");

router.post(
  "/payment/create-order",
  authMiddleware,
  createPaymentOrder
);

router.post(
  "/payment/verify",
  authMiddleware,
  verifyPayment
); // ✅ New endpoint

module.exports = router;


