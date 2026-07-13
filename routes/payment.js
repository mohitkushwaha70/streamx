const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../services/database');

const UPI_ID = process.env.UPI_ID || '9953865995@fam';
const UPI_NAME = 'streamX';

const PLANS = {
  premium_monthly: { amount: 199, label: 'Premium Monthly', plan: 'premium', months: 1 },
  premium_yearly:  { amount: 1999, label: 'Premium Yearly', plan: 'premium', months: 12 },
};

router.get('/upi-info', (req, res) => {
  res.json({ upiId: UPI_ID, name: UPI_NAME });
});

router.post('/create-order', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Please login first' });

    const { planType } = req.body;
    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const txnId = 'SX' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();

    db.payments.add(user.id, plan.amount, plan.plan, 'UPI', 'pending');
    db.logs.add('payment', `UPI order created: ₹${plan.amount} ${plan.label} by ${user.name} (ref: ${txnId})`);

    res.json({
      upiId: UPI_ID,
      upiName: UPI_NAME,
      amount: plan.amount,
      txnId,
      planLabel: plan.label,
      planType,
    });
  } catch (err) {
    console.error('[Payment] Create order error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Please login first' });

    const { txnId, planType } = req.body;
    if (!txnId || txnId.trim().length < 4) {
      return res.status(400).json({ error: 'Enter a valid UPI transaction ID' });
    }

    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    db.users.update(user.id, { plan: plan.plan });
    db.payments.add(user.id, plan.amount, plan.plan, 'UPI');

    db.logs.add('payment', `${user.name} upgraded to ${plan.plan} via UPI (₹${plan.amount}, txn: ${txnId.trim()})`);

    req.session.user.plan = plan.plan;

    res.json({ success: true, plan: plan.plan });
  } catch (err) {
    console.error('[Payment] Verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;
