const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const store = require("./database/demoStore");
const { countryContext } = require("./middleware/context");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "HabeshaGo API", countries: store.countries.length, demo_store: env.enableDemoStore });
});

app.use("/api/v1/countries", require("./countries/routes"));
app.use("/api/:country/v1", countryContext);
app.use("/api/:country/v1/auth", require("./auth/routes"));
app.use("/api/:country/v1/cities", require("./cities/routes"));
app.use("/api/:country/v1/customers", require("./customers/routes"));
app.use("/api/:country/v1/merchants", require("./merchants/routes"));
app.use("/api/:country/v1/products", require("./products/routes"));
app.use("/api/:country/v1/cart", require("./cart/routes"));
app.use("/api/:country/v1/orders", require("./orders/routes"));
app.use("/api/:country/v1/drivers", require("./drivers/routes"));
app.use("/api/:country/v1/wallet", require("./wallet/routes"));
app.use("/api/:country/v1/payments", require("./payments/routes"));
app.use("/api/:country/v1/admin", require("./admin/routes"));
app.use("/api/:country/v1/support", require("./support/routes"));
app.use("/api/:country/v1/audit", require("./audit/routes"));
app.use("/api/:country/v1/feature-flags", require("./featureFlags/routes"));
app.use("/api/:country/v1/voice", require("./voice/routes"));
app.use("/api/:country/v1/referrals", require("./referrals/routes"));
app.use("/api/:country/v1/community-delivery", require("./communityDelivery/routes"));
app.use("/api/:country/v1/neighborhoods", require("./neighborhoods/routes"));
app.use("/api/:country/v1/address", require("./addressIntelligence/routes"));
app.use("/api/:country/v1/senior", require("./senior/routes"));
app.use("/api/:country/v1/child-delivery", require("./childDelivery/routes"));
app.use("/api/:country/v1/night-safety", require("./nightSafety/routes"));
app.use("/api/:country/v1/marketplace", require("./marketplace/routes"));
app.use("/api/:country/v1/feed", require("./socialFeed/routes"));

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`HabeshaGo API listening on http://localhost:${env.port}`);
  });
}

module.exports = app;
