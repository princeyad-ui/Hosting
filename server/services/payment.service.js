let Razorpay;
try {
  Razorpay = require("razorpay");
} catch (err) {
  console.error("⚠️ Warning: Razorpay module not loaded properly:", err.message);
  Razorpay = null;
}

// Check if we're in test mode (credentials are not real)
const isTestMode = !process.env.RAZORPAY_KEY_ID || 
                   process.env.RAZORPAY_KEY_ID.includes('xxxxx') ||
                   process.env.RAZORPAY_KEY_ID === 'rzp_test_xxxxx';

console.log("💳 Payment Mode:", isTestMode ? "TEST (Mock)" : "PRODUCTION (Real Razorpay)");

let razorpay;
if (!isTestMode && Razorpay) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize Razorpay:", err.message);
    razorpay = null;
  }
}

exports.createOrder = async ({ amount, receipt }) => {
  try {
    if (isTestMode) {
      // Mock Razorpay response for testing
      console.log("🧪 TEST MODE: Creating mock order");
      const mockOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entity: "order",
        amount: amount * 100, // paise
        amount_paid: 0,
        amount_due: amount * 100,
        currency: "INR",
        receipt: receipt,
        offer_id: null,
        status: "created",
        attempts: 0,
        notes: {},
        created_at: Math.floor(Date.now() / 1000),
      };
      console.log("✅ Mock order created:", mockOrder.id);
      return mockOrder;
    }

    // Real Razorpay
    if (!razorpay) {
      throw new Error("Razorpay not initialized. Please check your credentials.");
    }
    
    console.log("💳 Creating real Razorpay order...");
    return razorpay.orders.create({
      amount: amount * 100, // ₹10 → 1000 paise
      currency: "INR",
      receipt,
    });
  } catch (err) {
    console.error("❌ createOrder error:");
    console.error("Error:", err);
    throw err;
  }
};
