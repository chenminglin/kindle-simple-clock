module.exports = function handler(req, res) {
  var cfg = {
    apiKey: process.env.QWEATHER_API_KEY || "",
    apiHost: process.env.QWEATHER_API_HOST || "",
    cityQuery: process.env.QWEATHER_CITY_QUERY || "深圳",
    displayCity: process.env.QWEATHER_DISPLAY_CITY || ""
  };
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(cfg));
};
