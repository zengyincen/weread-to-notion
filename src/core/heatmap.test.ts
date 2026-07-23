import assert from "node:assert/strict";
import {
  normalizeDailyReadTimes,
  renderHeatmapSvg,
  timestampToChinaDate,
} from "./heatmap";

assert.equal(timestampToChinaDate("1735660800"), "2025-01-01");
assert.deepEqual(
  normalizeDailyReadTimes(
    {
      "1735660800": 600,
      "1735747200": 1200,
      invalid: 999,
    },
    2025
  ),
  {
    "2025-01-01": 600,
    "2025-01-02": 1200,
  }
);

const svg = renderHeatmapSvg(
  { "2025-01-01": 600, "2025-01-02": 3600 },
  {
    year: 2025,
    title: "测试 & 阅读",
    theme: {
      background: "#FFFFFF",
      empty: "#EBEDF0",
      low: "#ACE7AE",
      medium: "#69C16E",
      high: "#549F57",
      text: "#24292F",
    },
  }
);

assert.match(svg, /测试 &amp; 阅读/);
assert.match(svg, /2025-01-01 · 10 分钟/);
assert.match(svg, /2025-01-02 · 1 小时/);
assert.match(svg, /fill="#ACE7AE"/);
assert.match(svg, /fill="#69C16E"/);

console.log("heatmap tests passed");
