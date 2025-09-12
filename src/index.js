// const express = require('express');
// const cors = require('cors');
// // const Razorpay = require('razorpay');
// const crypto = require('crypto');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // Create Order Endpoint
// app.post('/api/create-razorpay-order', async (req, res) => {
//   try {
//     const { amount, currency, receipt } = req.body;
    
//     const options = {
//       amount: amount * 100, // Convert to paise (multiply by 100)
//       currency: currency || 'INR',
//       receipt: receipt || `receipt_${Date.now()}`,
//     };
    
//     const order = await razorpay.orders.create(options);
//     res.json({ 
//       success: true, 
//       orderId: order.id, 
//       amount: order.amount,
//       currency: order.currency
//     });
//   } catch (error) {
//     console.error('Error creating order:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to create order' 
//     });
//   }
// });

// // Verify Payment Endpoint
// app.post('/api/verify-payment', async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
//     // Create SHA256 hash
//     const body = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(body.toString())
//       .digest('hex');
    
//     const isAuthentic = expectedSignature === razorpay_signature;
    
//     if (isAuthentic) {
//       // Payment is authentic
//       // Here you would typically:
//       // 1. Save payment details to your database
//       // 2. Update order status
//       // 3. Send confirmation email, etc.
      
//       res.json({ 
//         success: true, 
//         message: 'Payment verified successfully',
//         paymentId: razorpay_payment_id
//       });
//     } else {
//       res.status(400).json({ 
//         success: false, 
//         error: 'Invalid signature' 
//       });
//     }
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to verify payment' 
//     });
//   }
// });

// // Get Razorpay Key Endpoint (for frontend)
// app.get('/api/get-razorpay-key', (req, res) => {
//   res.json({ 
//     key: process.env.RAZORPAY_KEY_ID 
//   });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });