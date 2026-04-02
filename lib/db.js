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

function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (db) return;
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

/** Read-only: orders joined to customers for admin table. */
function listOrdersAdmin() {
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
    LIMIT 500
  `);
  return rowsFromExec(r);
}

module.exports = { initDb, listOrdersAdmin };
