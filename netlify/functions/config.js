exports.handler = async function (event, context) {
  const cfg = {
    apiKey: process.env.QWEATHER_API_KEY || "",
    apiHost: process.env.QWEATHER_API_HOST || "",
    cityQuery: process.env.QWEATHER_CITY_QUERY || "深圳",
    displayCity: process.env.QWEATHER_DISPLAY_CITY || ""
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(cfg)
  };
};
