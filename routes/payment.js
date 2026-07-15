const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../services/database');

function getRazorpay() {
  const isLive = process.env.RAZORPAY_MODE === 'live';
  const keyId = isLive ? process.env.RAZORPAY_LIVE_KEY_ID : process.env.RAZORPAY_KEY_ID;
  const keySecret = isLive ? process.env.RAZORPAY_LIVE_KEY_SECRET : process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function getKeyId() {
  const isLive = process.env.RAZORPAY_MODE === 'live';
  return isLive ? process.env.RAZORPAY_LIVE_KEY_ID : process.env.RAZORPAY_KEY_ID;
}

const PLANS = {
  premium_monthly: { amount: 19900, label: 'Premium Monthly', plan: 'premium', months: 1, payType: 'monthly' },
  premium_yearly:  { amount: 199900, label: 'Premium Yearly', plan: 'premium', months: 12, payType: 'yearly' },
};

router.get('/key', (req, res) => {
  res.json({ keyId: getKeyId() || '' });
});

router.post('/create-order', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Please login first' });

    const { planType } = req.body;
    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const razorpay = getRazorpay();
    if (!razorpay) return res.status(500).json({ error: 'Payment gateway not configured. Admin needs to add Razorpay keys.' });

    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `rcpt_${user.id}_${Date.now()}`,
      notes: { userId: String(user.id), planType, label: plan.label },
    });

    db.logs.add('payment', `Order created: ${order.id} for ${plan.label} by ${user.name}`);

    res.json({
      orderId: order.id,
      amount: plan.amount,
      currency: 'INR',
      planLabel: plan.label,
      keyId: getKeyId(),
      userName: user.name,
      userEmail: user.email,
    });
  } catch (err) {
    console.error('[Payment] Create order error:', err.message);
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Please login first' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const keySecret = process.env.RAZORPAY_MODE === 'live'
      ? process.env.RAZORPAY_LIVE_KEY_SECRET
      : process.env.RAZORPAY_KEY_SECRET;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      db.logs.add('payment', `Payment verification FAILED for order ${razorpay_order_id}`);
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ error: 'Invalid plan type' });

    db.users.update(user.id, { plan: plan.plan, plan_chosen: 1 });

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + plan.months);

    db.payments.add(user.id, plan.amount / 100, plan.payType, 'Razorpay');
    db.logs.add('payment', `${user.name} upgraded to ${plan.plan} (${plan.label}) via Razorpay — ₹${plan.amount / 100}`);

    req.session.user.plan = plan.plan;
    req.session.user.plan_chosen = 1;

    res.json({ success: true, plan: plan.plan, expiryDate: expiryDate.toISOString() });
  } catch (err) {
    console.error('[Payment] Verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;
