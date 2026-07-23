"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 获取微信读书每日阅读时长并生成固定文件 heatmap/weread.svg。
 */
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const heatmap_1 = require("./core/heatmap");
dotenv_1.default.config({ path: ".env" });
function currentYearInChina() {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();
}
function parseYear(value) {
    const year = value ? Number(value) : currentYearInChina();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error(`YEAR 必须是 2000 到 2100 之间的整数，当前值：${value}`);
    }
    return year;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const year = parseYear(process.env.YEAR);
        const apiKey = yield (0, heatmap_1.resolveWereadApiKey)(process.env.WEREAD_API_KEY, process.env.WEREAD_COOKIE);
        const dailyReadTimes = yield (0, heatmap_1.getYearlyDailyReadTimes)(apiKey, year);
        const outputPath = path.resolve(process.cwd(), process.env.HEATMAP_OUTPUT || "heatmap/weread.svg");
        const displayName = ((_a = process.env.HEATMAP_NAME) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.NAME) === null || _b === void 0 ? void 0 : _b.trim()) || "微信读书";
        const svg = (0, heatmap_1.renderHeatmapSvg)(dailyReadTimes, {
            year,
            title: `${displayName} · 阅读热力图`,
            theme: {
                background: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_BACKGROUND_COLOR, "#FFFFFF"),
                empty: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_EMPTY_COLOR, "#E5E5EA"),
                low: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_LOW_COLOR, "#D1F2D8"),
                medium: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_MEDIUM_COLOR, "#7EDC8F"),
                high: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_HIGH_COLOR, "#34C759"),
                text: (0, heatmap_1.normalizeColor)(process.env.HEATMAP_TEXT_COLOR, "#1D1D1F"),
            },
        });
        yield fs_1.promises.mkdir(path.dirname(outputPath), { recursive: true });
        yield fs_1.promises.writeFile(outputPath, svg, "utf8");
        const activeDays = Object.values(dailyReadTimes).filter((seconds) => seconds >= 60).length;
        console.log(`已生成 ${path.relative(process.cwd(), outputPath)}`);
        console.log(`统计年份：${year}，阅读日：${activeDays}`);
    });
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`生成阅读热力图失败：${message}`);
    process.exitCode = 1;
});
