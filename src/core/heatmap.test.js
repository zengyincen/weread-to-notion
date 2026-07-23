"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const heatmap_1 = require("./heatmap");
strict_1.default.equal((0, heatmap_1.timestampToChinaDate)("1735660800"), "2025-01-01");
strict_1.default.deepEqual((0, heatmap_1.normalizeDailyReadTimes)({
    "1735660800": 600,
    "1735747200": 1200,
    invalid: 999,
}, 2025), {
    "2025-01-01": 600,
    "2025-01-02": 1200,
});
const svg = (0, heatmap_1.renderHeatmapSvg)({ "2025-01-01": 600, "2025-01-02": 3600 }, {
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
});
strict_1.default.match(svg, /测试 &amp; 阅读/);
strict_1.default.match(svg, /2025-01-01 · 10 分钟/);
strict_1.default.match(svg, /2025-01-02 · 1 小时/);
strict_1.default.match(svg, /fill="#ACE7AE"/);
strict_1.default.match(svg, /fill="#69C16E"/);
console.log("heatmap tests passed");
