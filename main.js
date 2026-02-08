(function () {
  var DEFAULT_CONFIG = {
    API_KEY: "",
    API_HOST: "",
    CITY_QUERY: "深圳",
    DISPLAY_CITY: ""
  };
  var APP_CONFIG = window.APP_CONFIG || null;

  var KEY_QWEATHER = DEFAULT_CONFIG.API_KEY;
  var API_HOST = DEFAULT_CONFIG.API_HOST;
  var CITY_QUERY = DEFAULT_CONFIG.CITY_QUERY;
  var DISPLAY_CITY = DEFAULT_CONFIG.DISPLAY_CITY;

  var IP_API = "https://ipapi.co/json?languages=zh-CN";
  var GEO_RANGE = "cn";
  var GEO_PATH = "/geo/v2/city/lookup";
  var DAILY_PATH = "/v7/weather/7d";
  var FORECAST_DAYS = 7;
  var QWEATHER_JWT = ""; // optional, if you use JWT auth
  var LOCATION_ID = null;
  var CITY_DISPLAY = CITY_QUERY;
  var LANG = "zh";
  var UNIT = "m"; // metric
  var WEATHER_INTERVAL = 20 * 60 * 1000;
  var timezoneOffsetMinutes = null;
  var DEFAULT_THEME = "dark";
  var DEFAULT_FORECAST_DAYS = 3;
  var currentTheme = DEFAULT_THEME;
  var forecastDays = DEFAULT_FORECAST_DAYS;
  var settingsBtn = null;
  var settingsHideTimer = null;
  var configReady = false;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function getStore(key) {
    try {
      if (window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {}
    var match = document.cookie.match(new RegExp("(?:^|; )" + key + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setStore(key, value) {
    try {
      if (window.localStorage) {
        localStorage.setItem(key, value);
        return;
      }
    } catch (e) {}
    document.cookie = key + "=" + encodeURIComponent(value) + ";max-age=" + (60 * 60 * 24 * 365) + ";path=/";
  }

  function parseForecastDays(val) {
    var n = parseInt(val, 10);
    if (isNaN(n)) return DEFAULT_FORECAST_DAYS;
    if (n < 1) n = 1;
    if (n > 7) n = 7;
    return n;
  }

  function applyTheme(theme) {
    var body = document.body;
    var cls = body.className || "";
    cls = cls.replace(/\btheme-dark\b/g, "");
    cls = cls.replace(/\btheme-light\b/g, "");
    cls = cls.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    if (theme !== "light") {
      theme = "dark";
    }
    if (cls) {
      cls += " ";
    }
    body.className = cls + "theme-" + theme;
    currentTheme = theme;
  }

  function normalizeConfig(cfg) {
    var c = cfg || {};
    function normalizeHost(host) {
      if (!host) return "";
      var h = ("" + host).trim();
      if (!h) return "";
      if (h.indexOf("http://") === 0 || h.indexOf("https://") === 0) {
        return h.replace(/\/+$/, "");
      }
      return ("https://" + h).replace(/\/+$/, "");
    }
    return {
      API_KEY: c.API_KEY || c.apiKey || DEFAULT_CONFIG.API_KEY,
      API_HOST: normalizeHost(c.API_HOST || c.apiHost || DEFAULT_CONFIG.API_HOST),
      CITY_QUERY: c.CITY_QUERY || c.cityQuery || DEFAULT_CONFIG.CITY_QUERY,
      DISPLAY_CITY: c.DISPLAY_CITY || c.displayCity || DEFAULT_CONFIG.DISPLAY_CITY
    };
  }

  function applyConfig(cfg) {
    KEY_QWEATHER = cfg.API_KEY || "";
    API_HOST = cfg.API_HOST || "";
    CITY_QUERY = cfg.CITY_QUERY || "深圳";
    DISPLAY_CITY = cfg.DISPLAY_CITY || "";
    CITY_DISPLAY = DISPLAY_CITY || CITY_QUERY;
    LOCATION_ID = null;
  }

  function loadRemoteConfig(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/config?t=" + new Date().getTime(), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) {
        callback(null);
        return;
      }
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        callback(null);
        return;
      }
      callback(data);
    };
    xhr.send(null);
  }

  function startWeather() {
    if (DISPLAY_CITY) {
      setCity(DISPLAY_CITY);
    } else {
      setCity("城市查询中...");
    }
    lookupCity();
  }

  function initConfig() {
    var localCfg = normalizeConfig(APP_CONFIG);
    applyConfig(localCfg);
    if (localCfg.API_KEY && localCfg.API_HOST) {
      configReady = true;
      startWeather();
      return;
    }
    loadRemoteConfig(function (remoteCfg) {
      if (remoteCfg) {
        applyConfig(normalizeConfig(remoteCfg));
      }
      configReady = true;
      startWeather();
    });
  }

  function updateForecastTitle() {
    var title = document.getElementById("forecast_title");
    if (title) {
      title.innerHTML = "未来" + forecastDays + "天";
    }
  }

  function showSettingsButton() {
    if (!settingsBtn) return;
    var dialog = document.getElementById("settings_dialog");
    if (dialog && dialog.style.display === "block") return;
    settingsBtn.style.display = "block";
    if (settingsHideTimer) {
      clearTimeout(settingsHideTimer);
    }
    settingsHideTimer = setTimeout(function () {
      if (settingsBtn) {
        settingsBtn.style.display = "none";
      }
    }, 3000);
  }

  function hideSettingsButton() {
    if (!settingsBtn) return;
    settingsBtn.style.display = "none";
    if (settingsHideTimer) {
      clearTimeout(settingsHideTimer);
      settingsHideTimer = null;
    }
  }

  function getAdjustedDate() {
    var now = new Date();
    if (timezoneOffsetMinutes === null) {
      return now;
    }
    var localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (localOffset + timezoneOffsetMinutes) * 60000);
  }

  function updateTime() {
    var now = getAdjustedDate();
    var h = now.getHours();
    var m = now.getMinutes();
    document.getElementById("time").innerHTML = pad(h) + ":" + pad(m);

    var week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    var dateStr = (now.getMonth() + 1) + "月" + now.getDate() + "日 " + week[now.getDay()];
    var dateEl = document.getElementById("date_text");
    if (dateEl) {
      dateEl.innerHTML = dateStr;
    }
  }

  function setForecastText(text) {
    var body = document.getElementById("forecast_body");
    if (!body) return;
    body.innerHTML = "<tr><td colspan=\"3\">" + text + "</td></tr>";
  }

  function formatFxDate(fxDate) {
    if (!fxDate) return "";
    var parts = fxDate.split("-");
    if (parts.length < 3) return fxDate;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return fxDate;
    return m + "/" + d;
  }

  function buildGeoUrl() {
    var url = API_HOST + GEO_PATH +
      "?location=" + encodeURIComponent(CITY_QUERY) +
      "&range=" + encodeURIComponent(GEO_RANGE) +
      "&lang=" + encodeURIComponent(LANG);
    if (!QWEATHER_JWT) {
      url += "&key=" + encodeURIComponent(KEY_QWEATHER);
    }
    return url;
  }

  function buildDailyUrl() {
    var url = API_HOST + DAILY_PATH +
      "?location=" + encodeURIComponent(LOCATION_ID) +
      "&lang=" + encodeURIComponent(LANG) +
      "&unit=" + encodeURIComponent(UNIT);
    if (!QWEATHER_JWT) {
      url += "&key=" + encodeURIComponent(KEY_QWEATHER);
    }
    return url;
  }

  function lookupCity() {
    if (!KEY_QWEATHER || !API_HOST || API_HOST.indexOf("http") !== 0) {
      setWeatherText("请在 config.js 或环境变量配置 API_HOST 和 KEY_QWEATHER");
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", buildGeoUrl(), true);
    if (QWEATHER_JWT) {
      xhr.setRequestHeader("Authorization", "Bearer " + QWEATHER_JWT);
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) {
        setWeatherText("城市查询失败: " + xhr.status);
        return;
      }
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        setWeatherText("城市解析失败");
        return;
      }
      if (!data || data.code !== "200" || !data.location || !data.location.length) {
        setWeatherText("城市返回码: " + (data ? data.code : "--"));
        return;
      }
      var loc = data.location[0];
      LOCATION_ID = loc.id;
      var resolvedName = loc.name || CITY_QUERY;
      CITY_DISPLAY = DISPLAY_CITY || resolvedName;
      setCity(CITY_DISPLAY);
      updateWeather();
      updateDaily();
    };
    xhr.send(null);
  }

  function syncIpInfo() {
    if (!IP_API || IP_API.indexOf("http") !== 0) {
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", IP_API, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) return;
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        return;
      }
      if (!data) return;
      if (data.utc_offset) {
        var offset = parseInt(data.utc_offset || "+0800", 10);
        if (!isNaN(offset)) {
          timezoneOffsetMinutes = offset * 0.6;
        }
      }
      updateTime();
    };
    xhr.send(null);
  }

  function setCity(text) {
    var el = document.getElementById("city_text");
    if (el) {
      el.innerHTML = text;
    }
  }

  function setWeatherText(text) {
    var desc = document.getElementById("weather_desc");
    if (desc) {
      desc.innerHTML = text;
    }
    var temp = document.getElementById("weather_temp");
    if (temp) {
      temp.innerHTML = "";
    }
    var extra = document.getElementById("weather_extra");
    if (extra) {
      extra.innerHTML = "";
    }
    var iconEl = document.getElementById("weather_icon");
    if (iconEl) {
      iconEl.className = "";
    }
  }

  function updateWeather() {
    if (!KEY_QWEATHER || !API_HOST || API_HOST.indexOf("http") !== 0) {
      setWeatherText("请在 config.js 或环境变量配置 API_HOST 和 KEY_QWEATHER");
      return;
    }

    if (!LOCATION_ID) {
      setWeatherText("城市查询中...");
      return;
    }

    var url = API_HOST + "/v7/weather/now" +
      "?location=" + encodeURIComponent(LOCATION_ID) +
      "&lang=" + encodeURIComponent(LANG) +
      "&unit=" + encodeURIComponent(UNIT);
    if (!QWEATHER_JWT) {
      url += "&key=" + encodeURIComponent(KEY_QWEATHER);
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    if (QWEATHER_JWT) {
      xhr.setRequestHeader("Authorization", "Bearer " + QWEATHER_JWT);
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      if (xhr.status !== 200) {
        setWeatherText("天气请求失败: " + xhr.status);
        return;
      }

      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        setWeatherText("天气解析失败");
        return;
      }

      if (data.code !== "200" || !data.now) {
        setWeatherText("天气返回码: " + data.code);
        return;
      }

      var now = data.now;
      var iconEl = document.getElementById("weather_icon");
      if (iconEl && now.icon) {
        iconEl.className = "qi-" + now.icon;
      }
      var desc = document.getElementById("weather_desc");
      if (desc) {
        desc.innerHTML = now.text;
      }
      var temp = document.getElementById("weather_temp");
      if (temp) {
        temp.innerHTML = now.temp + "℃";
      }
      var extra = document.getElementById("weather_extra");
      if (extra) {
        extra.innerHTML = "湿度 " + now.humidity + "% | 风 " + now.windDir + " " + now.windScale + "级";
      }
    };
    xhr.send(null);
  }

  function updateDaily() {
    if (!KEY_QWEATHER || !API_HOST || API_HOST.indexOf("http") !== 0) {
      setForecastText("请在 config.js 或环境变量配置 API_HOST 和 KEY_QWEATHER");
      return;
    }

    if (!LOCATION_ID) {
      setForecastText("城市查询中...");
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", buildDailyUrl(), true);
    if (QWEATHER_JWT) {
      xhr.setRequestHeader("Authorization", "Bearer " + QWEATHER_JWT);
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) {
        setForecastText("预报请求失败: " + xhr.status);
        return;
      }

      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        setForecastText("预报解析失败");
        return;
      }

      if (!data || data.code !== "200" || !data.daily || !data.daily.length) {
        setForecastText("预报返回码: " + (data ? data.code : "--"));
        return;
      }

      var html = "";
      var list = data.daily;
      var count = list.length < forecastDays ? list.length : forecastDays;
      for (var i = 0; i < count; i += 2) {
        html += "<tr>";
        for (var j = 0; j < 2; j++) {
          var idx = i + j;
          if (idx < count) {
            var d = list[idx];
            var dayLabel = formatFxDate(d.fxDate);
            var text = d.textDay || "";
            if (d.textNight && d.textNight !== d.textDay) {
              text = text + "/" + d.textNight;
            }
            var icon = d.iconDay || "";
            var iconHtml = icon ? "<span class=\"f_icon qi-" + icon + "\"></span>" : "";
            var textHtml = iconHtml + "<span class=\"f_text_label\">" + text + "</span>";
            var temp = d.tempMin + "～" + d.tempMax + "℃";
            html += "<td class=\"f_col\"><table class=\"f_item\"><tr><td class=\"f_date\">" + dayLabel + "</td><td class=\"f_text\">" + textHtml + "</td><td class=\"f_temp\">" + temp + "</td></tr></table></td>";
          } else {
            html += "<td class=\"f_col\"></td>";
          }
          if (j === 0) {
            html += "<td class=\"f_sep\"><span class=\"f_sep_line\"></span></td>";
          }
        }
        html += "</tr>";
      }

      if (!html) {
        setForecastText("暂无预报");
        return;
      }
      var body = document.getElementById("forecast_body");
      if (body) {
        body.innerHTML = html;
      }
    };
    xhr.send(null);
  }

  function openSettings() {
    var dialog = document.getElementById("settings_dialog");
    var themeSelect = document.getElementById("theme_select");
    var daysSelect = document.getElementById("days_select");
    if (themeSelect) themeSelect.value = currentTheme;
    if (daysSelect) daysSelect.value = "" + forecastDays;
    hideSettingsButton();
    if (dialog) dialog.style.display = "block";
  }

  function closeSettings() {
    var dialog = document.getElementById("settings_dialog");
    if (dialog) dialog.style.display = "none";
  }

  function saveSettings() {
    var themeSelect = document.getElementById("theme_select");
    var daysSelect = document.getElementById("days_select");
    var newTheme = themeSelect ? themeSelect.value : DEFAULT_THEME;
    var newDays = daysSelect ? parseForecastDays(daysSelect.value) : DEFAULT_FORECAST_DAYS;
    setStore("theme", newTheme);
    setStore("forecast_days", "" + newDays);
    forecastDays = newDays;
    applyTheme(newTheme);
    updateForecastTitle();
    updateDaily();
    closeSettings();
  }

  var storedTheme = getStore("theme");
  var storedDays = getStore("forecast_days");
  forecastDays = parseForecastDays(storedDays);
  applyTheme(storedTheme || DEFAULT_THEME);
  updateForecastTitle();

  settingsBtn = document.getElementById("settings_button");
  var settingsClose = document.getElementById("settings_close");
  var settingsSave = document.getElementById("settings_save");
  var settingsBackdrop = document.getElementById("settings_backdrop");
  if (settingsBtn) {
    settingsBtn.onclick = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      openSettings();
    };
  }
  if (settingsClose) settingsClose.onclick = closeSettings;
  if (settingsSave) settingsSave.onclick = saveSettings;
  if (settingsBackdrop) settingsBackdrop.onclick = closeSettings;
  if (document.body) {
    document.body.onclick = function (e) {
      if (e && e.target && e.target.id === "settings_button") return;
      showSettingsButton();
    };
    document.body.ontouchstart = function (e) {
      if (e && e.target && e.target.id === "settings_button") return;
      showSettingsButton();
    };
  }

  updateTime();
  syncIpInfo();
  initConfig();
  showSettingsButton();

  setInterval(updateTime, 60 * 1000);
  setInterval(function () {
    if (!configReady) return;
    if (LOCATION_ID) {
      updateWeather();
      updateDaily();
    } else {
      lookupCity();
    }
  }, WEATHER_INTERVAL);
}());
