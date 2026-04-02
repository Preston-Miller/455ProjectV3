const path = require("path");
const express = require("express");
const { initDb, listCustomers, insertOrder, listOrdersWithCustomer } = require("./lib/db");

const PAYMENT_METHODS = ["card", "paypal", "bank", "crypto"];
const DEVICE_TYPES = ["mobile", "desktop", "tablet"];

function defaultOrderDatetimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  initDb()
    .then(() => next())
    .catch(next);
});

function adminAuth(req, res, next) {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return next();
  if (req.query.token === required) return next();
  res.status(401).send("Unauthorized: set admin URL ?token=… or unset ADMIN_TOKEN for local dev.");
}

function parseOptionalText(v) {
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}

function parseMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

app.get("/order", (req, res) => {
  const customers = listCustomers();
  res.render("order", {
    title: "Place order",
    customers,
    error: null,
    success: req.query.success === "1",
    values: {},
    defaultOrderDatetime: defaultOrderDatetimeLocal(),
  });
});

app.post("/order", (req, res) => {
  const customers = listCustomers();
  const body = req.body;

  const customer_id = Number.parseInt(body.customer_id, 10);
  if (!Number.isInteger(customer_id) || customer_id < 1) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "Choose a valid customer.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  const order_datetime = parseOptionalText(body.order_datetime);
  if (!order_datetime) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "Order date/time is required.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  const payment_method = body.payment_method;
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "Invalid payment method.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  const device_type = body.device_type;
  if (!DEVICE_TYPES.includes(device_type)) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "Invalid device type.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  const ip_country = parseOptionalText(body.ip_country);
  if (!ip_country) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "IP country is required.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  const promo_used = body.promo_used === "1" ? 1 : 0;

  const order_subtotal = parseMoney(body.order_subtotal);
  const shipping_fee = parseMoney(body.shipping_fee);
  const tax_amount = parseMoney(body.tax_amount);
  const order_total = parseMoney(body.order_total);
  if ([order_subtotal, shipping_fee, tax_amount, order_total].some((n) => Number.isNaN(n))) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: "Enter valid numbers for subtotal, shipping, tax, and total.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  try {
    insertOrder({
      customer_id,
      order_datetime,
      billing_zip: parseOptionalText(body.billing_zip),
      shipping_zip: parseOptionalText(body.shipping_zip),
      shipping_state: parseOptionalText(body.shipping_state),
      payment_method,
      device_type,
      ip_country,
      promo_used,
      promo_code: parseOptionalText(body.promo_code),
      order_subtotal,
      shipping_fee,
      tax_amount,
      order_total,
      risk_score: 0,
      is_fraud: 0,
    });
  } catch (e) {
    return res.status(400).render("order", {
      title: "Place order",
      customers,
      error: e.message || "Could not save order.",
      success: false,
      values: body,
      defaultOrderDatetime: defaultOrderDatetimeLocal(),
    });
  }

  res.redirect("/order?success=1");
});

app.get("/admin", adminAuth, (req, res) => {
  const orders = listOrdersWithCustomer();
  res.render("admin", {
    title: "Orders (admin)",
    orders,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
}

module.exports = app;
