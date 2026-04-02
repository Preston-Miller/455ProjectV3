const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const dbPath = path.join(__dirname, "..", "shop.db");

let db;
let initPromise;

function rowsFromExec(execResult) {
  if (!execResult || !execResult.length) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const o = {};
    columns.forEach((c, i) => {
      o[c] = row[i];
    });
    return o;
  });
}

function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const sqlJsDist = path.dirname(require.resolve("sql.js"));
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(sqlJsDist, file),
    });
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    db.run("PRAGMA foreign_keys = ON");
  })();
  return initPromise;
}

function listCustomers() {
  const r = db.exec(
    `SELECT customer_id, full_name, email FROM customers WHERE is_active = 1 ORDER BY customer_id`
  );
  return rowsFromExec(r);
}

function insertOrder(row) {
  db.run(
    `INSERT INTO orders (
      customer_id, order_datetime, billing_zip, shipping_zip, shipping_state,
      payment_method, device_type, ip_country, promo_used, promo_code,
      order_subtotal, shipping_fee, tax_amount, order_total,
      risk_score, is_fraud
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.customer_id,
      row.order_datetime,
      row.billing_zip,
      row.shipping_zip,
      row.shipping_state,
      row.payment_method,
      row.device_type,
      row.ip_country,
      row.promo_used,
      row.promo_code,
      row.order_subtotal,
      row.shipping_fee,
      row.tax_amount,
      row.order_total,
      row.risk_score,
      row.is_fraud,
    ]
  );
  persist();
  const idRow = db.exec("SELECT last_insert_rowid() AS id");
  return Number(idRow[0].values[0][0]);
}

function listOrdersWithCustomer() {
  const r = db.exec(`
    SELECT
      o.order_id,
      o.customer_id,
      o.order_datetime,
      o.billing_zip,
      o.shipping_zip,
      o.shipping_state,
      o.payment_method,
      o.device_type,
      o.ip_country,
      o.promo_used,
      o.promo_code,
      o.order_subtotal,
      o.shipping_fee,
      o.tax_amount,
      o.order_total,
      o.is_fraud,
      c.full_name AS customer_name,
      c.email AS customer_email
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    ORDER BY o.order_id DESC
  `);
  return rowsFromExec(r);
}

module.exports = {
  initDb,
  listCustomers,
  insertOrder,
  listOrdersWithCustomer,
};
