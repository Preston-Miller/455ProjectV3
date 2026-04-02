const path = require("path");
const express = require("express");
const { initDb, listOrdersAdmin } = require("./lib/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  initDb()
    .then(() => next())
    .catch(next);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/styles.css", (req, res) => {
  res.type("css");
  res.sendFile(path.join(__dirname, "styles.css"));
});

app.get("/admin", (req, res) => {
  const orders = listOrdersAdmin();
  res.render("admin", { orders });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Server error (check shop.db path and dependencies).");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Open http://localhost:${PORT}/ — Admin: http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
