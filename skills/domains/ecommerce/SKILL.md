---
name: ecommerce
description: Design, build, and operate scalable e-commerce platforms with product catalogs, shopping carts, payments, inventory, and order management.
version: 1.0.0
author: AI Business OS
license: MIT
category: domain
priority: required
---

# E-commerce Domain

## Purpose

This skill defines best practices for designing, building, and operating modern e-commerce platforms.

The objective is to support complete online commerce workflows including product management, customer experience, inventory, checkout, payment, fulfillment, and post-purchase operations.

---

# When to Use

Execute when:

- Building an online store
- Developing a marketplace storefront
- Selling physical or digital products
- Implementing commerce workflows

---

# Objectives

Build e-commerce platforms that are:

- Reliable
- Secure
- Scalable
- Conversion-focused
- Customer-centric

---

# Inputs

Expected inputs:

- Business Requirements
- Product Catalog
- Pricing Strategy
- Shipping Rules
- Tax Requirements
- Payment Requirements

---

# Core Capabilities

Support:

- Product Catalog
- Categories
- Search
- Shopping Cart
- Checkout
- Payments
- Orders
- Customer Accounts
- Reviews
- Promotions

---

# Product Management

Define:

- Products
- Variants
- Categories
- Attributes
- Images
- Pricing
- Inventory

Maintain accurate catalog information.

---

# Customer Experience

Provide:

- Product Search
- Filtering
- Recommendations
- Wishlists
- Reviews
- Personalized Content

Optimize for conversion and usability.

---

# Shopping Cart

Support:

- Add to Cart
- Update Quantity
- Save for Later
- Coupon Codes
- Shipping Estimation

Persist cart across sessions where appropriate.

---

# Checkout

Implement:

- Address Collection
- Shipping Options
- Payment Selection
- Order Review
- Confirmation

Minimize checkout friction.

---

# Payment

Support:

- Credit Cards
- Digital Wallets
- Bank Transfers
- Local Payment Methods
- Refunds

Verify every payment server-side.

---

# Inventory Management

Track:

- Stock Levels
- Reservations
- Low Stock Alerts
- Backorders
- Warehouse Availability

Prevent overselling.

---

# Order Management

Manage:

- Order Creation
- Fulfillment
- Shipment
- Returns
- Refunds
- Cancellation

Track every order state.

---

# Promotions

Support:

- Coupons
- Discounts
- Campaigns
- Bundles
- Loyalty Programs
- Gift Cards

Ensure promotion rules are validated consistently.

---

# Analytics

Measure:

- Conversion Rate
- Average Order Value (AOV)
- Cart Abandonment
- Revenue
- Customer Lifetime Value (CLV)
- Repeat Purchase Rate

Use metrics to optimize growth.

---

# Workflow

```text
Define Catalog

↓

Configure Inventory

↓

Design Shopping Experience

↓

Implement Checkout

↓

Configure Payments

↓

Manage Orders

↓

Measure Performance

↓

Optimize Conversion
```

---

# Outputs

Generate:

- Product Catalog Model
- Checkout Flow
- Inventory Strategy
- Order Workflow
- Payment Integration
- Commerce KPI Dashboard

---

# Validation Checklist

Before completion verify:

- Product catalog validated
- Inventory synchronized
- Checkout tested
- Payments verified
- Order lifecycle complete
- Analytics configured

---

# Failure Conditions

Stop and request clarification if:

- Product catalog is incomplete
- Pricing rules are undefined
- Inventory strategy is missing
- Payment requirements are unclear
- Shipping rules are unavailable

---

# Rules

- Prioritize customer experience.
- Never trust client-side payment status.
- Prevent inventory inconsistencies.
- Keep checkout simple.
- Measure conversion continuously.

---

# Success Criteria

This skill succeeds when:

- customers can discover products
- checkout completes successfully
- payments are processed securely
- inventory remains accurate
- orders are fulfilled reliably

---

# Related Skills

- saas
- payment
- database
- integration
- monitoring
- analytics

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |