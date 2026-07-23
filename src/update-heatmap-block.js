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
 * 如果传入页面（child_page）ID，则自动查找或创建热力图图片块。
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
function getBlockUrl(block) {
    var _a, _b, _c, _d, _e;
    if (block.type === "image") {
        return ((_b = (_a = block.image) === null || _a === void 0 ? void 0 : _a.external) === null || _b === void 0 ? void 0 : _b.url) || ((_d = (_c = block.image) === null || _c === void 0 ? void 0 : _c.file) === null || _d === void 0 ? void 0 : _d.url);
    }
    if (block.type === "embed")
        return (_e = block.embed) === null || _e === void 0 ? void 0 : _e.url;
    return undefined;
}
function isHeatmapBlock(block) {
    const url = getBlockUrl(block);
    return Boolean(url === null || url === void 0 ? void 0 : url.includes("/heatmap/weread.svg"));
}
function updateMediaBlock(block, heatmapUrl, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            throw new Error(`无法更新 ${block.type} 类型的 Notion 块`);
        }
        yield axios_1.default.patch(`${constants_1.NOTION_API_BASE_URL}/blocks/${block.id}`, body, {
            headers,
            timeout: 20000,
        });
    });
}
function findHeatmapChild(parentId, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        let startCursor;
        do {
            const response = yield axios_1.default.get(`${constants_1.NOTION_API_BASE_URL}/blocks/${parentId}/children`, {
                headers,
                timeout: 20000,
                params: Object.assign({ page_size: 100 }, (startCursor ? { start_cursor: startCursor } : {})),
            });
            const heatmapBlock = response.data.results.find(isHeatmapBlock);
            if (heatmapBlock)
                return heatmapBlock;
            startCursor = response.data.has_more
                ? response.data.next_cursor || undefined
                : undefined;
        } while (startCursor);
        return undefined;
    });
}
function appendHeatmapImage(parentId, heatmapUrl, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default.patch(`${constants_1.NOTION_API_BASE_URL}/blocks/${parentId}/children`, {
            children: [
                {
                    object: "block",
                    type: "image",
                    image: {
                        type: "external",
                        external: { url: heatmapUrl },
                    },
                },
            ],
        }, { headers, timeout: 20000 });
        const createdBlock = response.data.results[0];
        if (!createdBlock)
            throw new Error("Notion 没有返回新创建的图片块");
        return createdBlock;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
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
        if (block.type === "image" || block.type === "embed") {
            yield updateMediaBlock(block, heatmapUrl, headers);
            console.log(`Notion 热力图块已更新（${block.type}）`);
        }
        else if (block.type === "child_page") {
            const existingBlock = yield findHeatmapChild(block.id, headers);
            if (existingBlock) {
                yield updateMediaBlock(existingBlock, heatmapUrl, headers);
                console.log(`已在 Notion 页面中更新热力图（${existingBlock.type}）`);
            }
            else {
                const createdBlock = yield appendHeatmapImage(block.id, heatmapUrl, headers);
                console.log(`已在 Notion 页面中创建热力图图片块（${createdBlock.id}）`);
            }
        }
        else {
            throw new Error(`HEATMAP_BLOCK_ID 对应的是 ${block.type || "未知"} 块，请填写页面、image 或 embed 块 ID。`);
        }
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
