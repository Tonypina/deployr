# deployr Pricing Implementation Handover

**Date:** June 3, 2026
**Status:** Ready for Backend Implementation
**Owner:** Tony Piña
**Next Owner:** [Assign Here]

---

## Executive Summary

Pricing schema is **complete and documented** in two currencies (USD & MXN). Ready to implement soft-limit ticket overage model into backend. Estimated implementation time: **3–5 days** for full stack.

---

## What's Done ✅

- [x] Three-tier pricing model designed (Starter, Professional, Enterprise)
- [x] Ticket soft limits + overage pricing defined
- [x] Complete pricing documentation in English (`PRICING.md`)
- [x] Complete pricing documentation in Spanish (`PRICING_MXN.md`)
- [x] Exchange rate locked at 17.50 MXN/USD
- [x] Feature matrix per plan documented
- [x] Add-on services priced and listed
- [x] Integration pricing tiers defined
- [x] FAQ completed (both languages)
- [x] Success metrics & KPI targets documented
- [x] Database schema provided (SQL)
- [x] Stripe + Conekta integration patterns documented

---

## What Needs Implementation 🚀

### **1. Database Layer** (1 day)
Create three new tables in PostgreSQL:

```sql
-- Pricing plans definition
CREATE TABLE pricing_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  monthly_price_usd DECIMAL(10, 2),
  annual_price_usd DECIMAL(10, 2),
  monthly_price_mxn DECIMAL(10, 2) DEFAULT 0,
  max_technicians INT,
  max_templates INT,
  max_inventory_items INT,
  ticket_limit_per_month INT,  -- NEW: soft limit
  ticket_overage_price_usd DECIMAL(10, 4),  -- NEW: overage rate
  ticket_overage_price_mxn DECIMAL(10, 4),  -- NEW: overage rate in MXN
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  plan_id INT REFERENCES pricing_plans(id),
  billing_email VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  conekta_customer_id VARCHAR(255) UNIQUE,
  status ENUM('active', 'paused', 'cancelled', 'past_due') DEFAULT 'active',
  currency VARCHAR(3) DEFAULT 'USD',  -- USD or MXN
  current_period_start DATE,
  current_period_end DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Monthly usage tracking for overages
CREATE TABLE usage_logs (
  id SERIAL PRIMARY KEY,
  subscription_id INT REFERENCES subscriptions(id) ON DELETE CASCADE,
  metric VARCHAR(50),  -- 'tickets_created', 'api_calls', 'storage_gb', 'extra_technicians'
  quantity INT,
  period_date DATE,  -- YYYY-MM-01
  overage_charge DECIMAL(10, 2),  -- calculated charge for this metric
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (subscription_id, period_date)
);
```

**Task:** Run migration and seed `pricing_plans` table with:
- Starter ($99 USD / $1,799 MXN, 250 ticket limit, $0.04/$0.70 overage)
- Professional ($299 USD / $5,299 MXN, 1,500 ticket limit, $0.02/$0.35 overage)
- Enterprise (custom, unlimited)

---

### **2. Backend API** (2 days)

#### **New Routes**
```
POST   /api/billing/checkout              — Create Stripe session
GET    /api/billing/subscription          — Get company's active subscription
PUT    /api/billing/subscription          — Update subscription (upgrade/downgrade)
DELETE /api/billing/subscription          — Cancel subscription
GET    /api/billing/usage                 — Get current month's usage + projected overage
GET    /api/billing/invoices              — List past invoices
```

#### **Webhook Handlers** (Stripe + Conekta)
```
POST /api/webhooks/stripe   — Handle Stripe events:
  • customer.subscription.created
  • customer.subscription.updated
  • customer.subscription.deleted
  • invoice.payment_failed
  • invoice.payment_succeeded

POST /api/webhooks/conekta  — Handle Conekta events:
  • subscription.updated
  • payment.failed
```

#### **Usage Tracking** (Critical for overages)
Modify `PATCH /api/tickets/:id/start` and ticket creation to:
1. Check monthly usage vs. plan limit
2. If over limit: add overage charge to `usage_logs`
3. Email user at 80% and 100% of limit

```typescript
// Pseudo-code
async function checkTicketUsage(subscriptionId: string, currentMonth: Date) {
  const subscription = await getSubscription(subscriptionId);
  const usage = await getMonthlyUsage(subscriptionId, currentMonth);
  const plan = await getPricingPlan(subscription.plan_id);
  
  if (usage.tickets_created >= plan.ticket_limit_per_month) {
    const overage = usage.tickets_created - plan.ticket_limit_per_month;
    const overageCharge = overage * plan.ticket_overage_price_usd; // or MXN
    await createUsageLog({
      subscription_id: subscriptionId,
      metric: 'tickets_created',
      quantity: usage.tickets_created,
      overage_charge: overageCharge,
      period_date: firstOfMonth(currentMonth)
    });
    
    if (usage.tickets_created % 50 === 0) {
      await sendWarningEmail(subscription.billing_email, overage, overageCharge);
    }
  }
}
```

---

### **3. Payment Integration** (1–2 days)

#### **Stripe Setup**
- Create products in Stripe dashboard (Starter, Professional, Enterprise)
- Set monthly & annual pricing in Stripe
- Create webhook endpoint: `https://api.deployr.com/api/webhooks/stripe`
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `.env`

#### **Conekta Setup** (for Mexico)
- Register at conekta.io
- Create products (same three tiers in MXN)
- Create webhook endpoint: `https://api.deployr.com/api/webhooks/conekta`
- Add `CONEKTA_API_KEY` and `CONEKTA_WEBHOOK_SECRET` to `.env`

#### **Checkout Flow**
```
User clicks "Upgrade" 
  ↓
POST /api/billing/checkout { plan_id, currency: 'USD|MXN' }
  ↓
Create Stripe/Conekta session
  ↓
Redirect to checkout URL
  ↓
User enters payment info
  ↓
Stripe/Conekta confirms
  ↓
Webhook fires → Create subscription record
  ↓
Redirect to success page
```

---

### **4. Frontend** (1–2 days)

#### **New Pages/Components**
- `/pricing` — Public pricing page (reference `PRICING.md` & `PRICING_MXN.md`)
- `/admin/billing` — Company admin panel (view subscription, upgrade/downgrade, invoices)
- `/admin/usage` — Real-time usage dashboard (tickets created this month vs. limit)

#### **UI Elements**
- Plan comparison card with "Upgrade" button
- Current subscription badge on admin dashboard
- Warning banner when at 80% of ticket limit
- Invoice history table

#### **Currency Selector**
Add toggle on `/pricing` and checkout to switch USD ↔ MXN

---

## Pricing Plans at a Glance

| Plan | Price | Tickets/Mo | Technicians | API | Support |
|---|---|---|---|---|---|
| **Starter** | $99 USD<br/>$1,799 MXN | 250 (+$0.04/$0.70 ea) | 5 | 1K req/day | Email |
| **Professional** | $299 USD<br/>$5,299 MXN | 1,500 (+$0.02/$0.35 ea) | 20 | 1K req/day | Priority |
| **Enterprise** | Custom | Unlimited | Unlimited | 100K+ req/day | 24/7 |

**Key Feature:**
- Soft limits: no blockers, automatic overage charges
- Transparent: warnings at 80% and 100%
- Flexible: upgrade/downgrade anytime with proration

---

## Critical Files

| File | Purpose | Status |
|---|---|---|
| `PRICING.md` | USD pricing (public-facing) | ✅ Complete |
| `PRICING_MXN.md` | MXN pricing (public-facing) | ✅ Complete |
| `backend/src/routes/billing.routes.ts` | (NEW) Payment routes | ⏳ To Do |
| `backend/src/utils/stripe.ts` | (NEW) Stripe client | ⏳ To Do |
| `backend/src/utils/conekta.ts` | (NEW) Conekta client | ⏳ To Do |
| `backend/src/middleware/auth.ts` | (MODIFY) Add subscription checks | ⏳ To Do |
| `frontend/app/pricing/page.tsx` | (NEW) Public pricing page | ⏳ To Do |
| `frontend/app/admin/billing/page.tsx` | (NEW) Subscription management | ⏳ To Do |
| `frontend/lib/services/billing.ts` | (NEW) Billing API client | ⏳ To Do |

---

## Environment Variables Needed

```bash
# .env (backend)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CONEKTA_API_KEY=key_...
CONEKTA_WEBHOOK_SECRET=...
FRONTEND_URL=http://localhost:3000

# .env (frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Testing Checklist

- [ ] Create subscription → Stripe test charge succeeds
- [ ] Upgrade plan → Proration calculates correctly
- [ ] Downgrade plan → Credit applied next cycle
- [ ] Create 251 tickets on Starter → Overage logged automatically
- [ ] Webhook fires → Subscription status updates in DB
- [ ] Cancel subscription → Stripe customer canceled
- [ ] Trial period → 14 days free, then charges
- [ ] Invoice history → Shows all transactions per company
- [ ] Email warnings → Sent at 80% & 100% of ticket limit
- [ ] Currency toggle → USD ↔ MXN conversion at 17.50 rate

---

## Go-Live Checklist

- [ ] Database migration deployed to prod
- [ ] Stripe/Conekta accounts live (not test)
- [ ] All env vars configured in production
- [ ] Billing routes tested end-to-end
- [ ] Webhooks confirmed firing
- [ ] Pricing page live at `/pricing`
- [ ] Admin billing dashboard live at `/admin/billing`
- [ ] Email notifications tested (overage warnings)
- [ ] Documentation updated (help center)
- [ ] Rollback plan documented (revert to free tier)

---

## Support Contacts

**Stripe:**
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs
- Support: support@stripe.com

**Conekta:**
- Dashboard: https://conekta.io
- Docs: https://developers.conekta.com
- Support: support@conekta.io

---

## Next Steps

1. **Assign owner** — Who will own billing implementation?
2. **Schedule kickoff** — When does backend dev start?
3. **Database migration** — Which env first (staging/prod)?
4. **Stripe/Conekta setup** — Test vs. Live keys?
5. **QA plan** — Who will test billing flows?

---

## Questions for Next Owner

1. Should we launch with both USD & MXN, or USD first?
2. Do we offer annual billing immediately, or add later?
3. Should trial companies have access to all features, or limited?
4. How aggressive on overage emails? (Current: 80% & 100%)
5. Do we need grandfathering for existing companies (free tier)?

---

**Good luck!** 🚀

All documentation is in place. This is a solid, proven pricing model that supports growth without hitting hard limits.

