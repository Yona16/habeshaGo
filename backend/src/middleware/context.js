const store = require("../database/demoStore");

function countryContext(req, res, next) {
  try {
    const countryId = req.params.country || req.query.country || "ET";
    const country = store.requireCountry(countryId);
    req.country = country;
    req.countryId = country.id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { countryContext };
