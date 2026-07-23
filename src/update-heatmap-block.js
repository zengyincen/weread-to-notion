"use strict";
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
 * 将 Notion 中已有的 image/embed 块更新为最新热力图 URL。
 */
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const constants_1 = require("./config/constants");
const http_1 = require("./utils/http");
dotenv_1.default.config({ path: ".env" });
function getArgument(name) {
    var _a;
    const prefix = `--${name}=`;
    return (_a = process.argv.find((argument) => argument.startsWith(prefix))) === null || _a === void 0 ? void 0 : _a.slice(prefix.length);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const apiKey = process.env.NOTION_INTEGRATIONS;
        const blockId = process.env.HEATMAP_BLOCK_ID;
        const heatmapUrl = getArgument("url") || process.env.HEATMAP_URL;
        if (!apiKey)
            throw new Error("缺少 NOTION_INTEGRATIONS");
        if (!blockId)
            throw new Error("缺少 HEATMAP_BLOCK_ID");
        if (!heatmapUrl || !/^https:\/\//.test(heatmapUrl)) {
            throw new Error("缺少有效的 HTTPS 热力图地址（--url=... 或 HEATMAP_URL）");
        }
        const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
        const blockResponse = yield axios_1.default.get(`${constants_1.NOTION_API_BASE_URL}/blocks/${blockId}`, { headers, timeout: 20000 });
        const block = blockResponse.data;
        let body;
        if (block.type === "image") {
            body = {
                image: {
                    type: "external",
                    external: { url: heatmapUrl },
                    caption: ((_a = block.image) === null || _a === void 0 ? void 0 : _a.caption) || [],
                },
            };
        }
        else if (block.type === "embed") {
            body = { embed: { url: heatmapUrl } };
        }
        else {
            throw new Error(`HEATMAP_BLOCK_ID 对应的是 ${block.type || "未知"} 块，请在 Notion 中先创建 image 或 embed 块。`);
        }
        yield axios_1.default.patch(`${constants_1.NOTION_API_BASE_URL}/blocks/${blockId}`, body, {
            headers,
            timeout: 20000,
        });
        console.log(`Notion 热力图块已更新（${block.type}）`);
    });
}
main().catch((error) => {
    var _a, _b;
    const axiosError = error;
    const message = ((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) ||
        (error instanceof Error ? error.message : String(error));
    console.error(`更新 Notion 热力图失败：${message}`);
    process.exitCode = 1;
});
