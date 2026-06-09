require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  adminSignupCode: process.env.ADMIN_SIGNUP_CODE || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8085,http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8085",
  databaseUrl: process.env.DATABASE_URL,
  defaultCountry: process.env.DEFAULT_COUNTRY || "ET",
  enableDemoStore: process.env.ENABLE_DEMO_STORE !== "false",
  flags: {
    DRIVER_AGENT_ENABLED: process.env.DRIVER_AGENT_ENABLED === "true",
    MERCHANT_ADVANCE_ENABLED: process.env.MERCHANT_ADVANCE_ENABLED === "true",
    DIASPORA_FUNDING_ENABLED: process.env.DIASPORA_FUNDING_ENABLED === "true",
    CROSS_BORDER_WALLET_ENABLED: process.env.CROSS_BORDER_WALLET_ENABLED === "true",
    SOCIAL_FEED_ENABLED: process.env.SOCIAL_FEED_ENABLED === "true",
    VOICE_ORDERING_ENABLED: process.env.VOICE_ORDERING_ENABLED === "true",
    NIGHT_SAFETY_ENABLED: process.env.NIGHT_SAFETY_ENABLED === "true",
    CHILD_DELIVERY_ENABLED: process.env.CHILD_DELIVERY_ENABLED === "true"
  }
};

module.exports = env;
