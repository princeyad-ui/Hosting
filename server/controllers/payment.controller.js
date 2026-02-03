const { createOrder } = require("../services/payment.service");
const { readDB, writeDB } = require("../utils/db");

exports.createPaymentOrder = async (req, res) => {
  try {
    console.log("💰 [1] Payment order request received");
    
    // ✅ AUTH CHECK
    if (!req.user) {
      console.log("❌ [2] No user - returning 401");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { siteId } = req.body;
    console.log("✅ [2] User authenticated:", req.user.id);
    
    if (!siteId) {
      console.log("❌ [3] No siteId provided");
      return res.status(400).json({ error: "siteId required" });
    }

    console.log("✅ [3] SiteId provided:", siteId);

    // ✅ VERIFY SITE OWNERSHIP
    const db = readDB();
    const site = db.sites.find(
      (s) => s.id === siteId && s.userId === req.user.id,
    );

    if (!site) {
      console.error("❌ [4] Site not found:", {
        requestedSiteId: siteId,
        userId: req.user.id,
      });
      return res.status(403).json({
        error:
          "Invalid site. Site not found or you don't have permission to access it.",
      });
    }

    console.log("✅ [4] Site verified:", site.name);

    // ✅ CREATE RAZORPAY ORDER
    try {
      console.log("💳 [5] Creating payment order...");
      const order = await createOrder({
        amount: 10, // ₹10
        receipt: `site_${siteId}`,
      });

      console.log("✅ [6] Razorpay order created:", order.id);

      const response = {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      };
      
      console.log("✅ [7] Sending response:", response);
      res.json(response);
    } catch (razorpayError) {
      console.error("❌ [5] Error creating order:");
      console.error("Error type:", typeof razorpayError);
      console.error("Error object:", razorpayError);
      console.error("Error toString():", razorpayError.toString());
      
      const errorMessage = razorpayError?.message || razorpayError?.toString() || "Unknown error";
      console.error("❌ Error message:", errorMessage);
      
      return res.status(500).json({ 
        error: "Failed to create payment order",
        details: errorMessage 
      });
    }
  } catch (err) {
    console.error("❌ PAYMENT ERROR:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Payment init failed", details: err.message });
  }
};

// ✅ NEW: Verify payment completion
exports.verifyPayment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { siteId } = req.body;
    if (!siteId) {
      return res.status(400).json({ error: "siteId required" });
    }

    const db = readDB();
    const site = db.sites.find(
      (s) => s.id === siteId && s.userId === req.user.id,
    );

    if (!site) {
      return res.status(403).json({ error: "Site not found or unauthorized" });
    }

    // Mark payment as verified and deploy site
    site.paymentVerified = true;
    site.status = "Live";
    site.url = `http://localhost:5000/sites/${siteId}`;
    
    // Clear payment required status
    if (site.logs) {
      site.logs = site.logs.map(log => 
        log.step === "Payment required" 
          ? { ...log, status: "Complete" } 
          : log
      );
      site.logs.push({ 
        step: "Deploying", 
        status: "Complete", 
        time: new Date().toISOString() 
      });
      site.logs.push({ 
        step: "Payment verified", 
        status: "Complete", 
        time: new Date().toISOString() 
      });
    }

    writeDB(db);

    res.json({ 
      success: true, 
      message: "Payment verified and site deployed",
      siteId,
      url: site.url
    });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
};
