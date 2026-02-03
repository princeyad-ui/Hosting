const API = "http://localhost:5000/api";

/**
 * Opens Razorpay & resolves after payment success
 */
export async function payForDeployment(siteId) {
  // ✅ Validate token exists
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Authentication required. Please login first.");
  }

  // 1️⃣ Ask backend to create order
  try {
    const res = await fetch(`${API}/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include", // ✅ Include cookies if needed
      body: JSON.stringify({
        siteId,
      }),
    });

    const order = await res.json();

    if (!res.ok) {
      console.error("Payment order error:", {
        status: res.status,
        error: order.error,
      });
      throw new Error(
        order.error ||
          `Failed to create order (${res.status}). Please try again.`
      );
    }

    console.log("✅ Order created:", order);
    if (!window.Razorpay && order.key.includes("test")) {
      // TEST MODE: Simulate successful payment
      console.log("🧪 TEST MODE: Simulating payment success");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            razorpay_payment_id: `pay_${Date.now()}`,
            razorpay_order_id: order.orderId,
            razorpay_signature: "test_signature_" + Date.now(),
          });
        }, 1500); // Simulate payment processing
      });
    }

    // 3️⃣ PRODUCTION: Open real Razorpay popup
    return new Promise((resolve, reject) => {
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "Your Hosting Platform",
        description: "Project Deployment Fee",
        order_id: order.orderId,

        handler: function (response) {
          console.log("✅ Payment successful:", response);
          resolve(response);
        },

        theme: {
          color: "#2563eb",
        },
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.open();

        razorpay.on("payment.failed", (error) => {
          console.error("Payment failed:", error);
          reject(error);
        });
      } catch (err) {
        console.error("Razorpay error:", err);
        reject(err);
      }
    });

    // ✅ After Razorpay payment succeeds, verify with backend
    // The handler function above resolves the promise with payment response
  } catch (error) {
    console.error("Payment service error:", error);
    throw error;
  }
}

/**
 * Verify payment with backend after Razorpay payment success
 */
export async function verifyPaymentWithBackend(siteId) {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${API}/payment/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ siteId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Payment verification failed");
  }

  return await res.json();
}
