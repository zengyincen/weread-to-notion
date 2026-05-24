"use strict";
/**
 * Notion API 服务模块
 */
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
exports.checkDatabaseProperties = checkDatabaseProperties;
exports.checkBookExistsInNotion = checkBookExistsInNotion;
exports.writeBookToNotion = writeBookToNotion;
exports.updateBookInNotion = updateBookInNotion;
exports.writeHighlightsToNotionPage = writeHighlightsToNotionPage;
exports.writeThoughtsToNotionPage = writeThoughtsToNotionPage;
exports.deleteNotionBlocks = deleteNotionBlocks;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../../config/constants");
const http_1 = require("../../utils/http");
const cover_fetch_1 = require("../../utils/cover-fetch");
/**
 * 检查Notion数据库是否包含所有必要的属性字段
 * @param apiKey Notion API密钥
 * @param databaseId 数据库ID
 * @param requiredProperties 必要属性字段列表
 * @returns 缺少的属性字段列表
 */
function checkDatabaseProperties(apiKey, databaseId, requiredProperties) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`检查数据库属性: ${databaseId}`);
        try {
            // 设置请求头
            const headers = {
                Authorization: `Bearer ${apiKey}`,
                "Notion-Version": constants_1.NOTION_VERSION,
                "Content-Type": "application/json",
            };
            // 获取数据库信息
            const response = yield axios_1.default.get(`${constants_1.NOTION_API_BASE_URL}/databases/${databaseId}`, { headers });
            // 数据库中存在的属性
            const existingProperties = Object.keys(response.data.properties || {});
            console.log(`数据库包含以下属性: ${existingProperties.join(", ")}`);
            // 检查缺少的属性
            const missingProperties = requiredProperties.filter((prop) => !existingProperties.includes(prop));
            return missingProperties;
        }
        catch (error) {
            console.error(`检查数据库属性失败: ${error.message}`);
            if (error.response) {
                console.error(`状态码: ${error.response.status}`);
                console.error(`响应: ${JSON.stringify(error.response.data)}`);
            }
            // 如果无法检查，返回空数组以避免阻止同步
            return [];
        }
    });
}
/**
 * 格式化阅读时间，将秒数转换为可读格式
 * @param seconds 阅读时间秒数
 * @returns 格式化后的时间字符串
 */
function formatReadingTime(seconds) {
    if (seconds <= 0)
        return "未阅读";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ""}`;
    }
    else {
        return `${minutes}分钟`;
    }
}
/**
 * 检查书籍是否已存在于Notion数据库中
 */
function checkBookExistsInNotion(apiKey, databaseId, bookTitle, bookAuthor) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`检查书籍《${bookTitle}》是否已存在于Notion数据库...`);
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 构建查询 - 通过书名和作者来匹配
            const queryData = {
                filter: {
                    and: [
                        {
                            property: "书名",
                            title: {
                                contains: bookTitle,
                            },
                        },
                        {
                            property: "作者",
                            rich_text: {
                                contains: bookAuthor || "未知作者",
                            },
                        },
                    ],
                },
            };
            // 发送查询请求
            const response = yield axios_1.default.post(`${constants_1.NOTION_API_BASE_URL}/databases/${databaseId}/query`, queryData, { headers });
            const results = response.data.results;
            if (results && results.length > 0) {
                console.log(`书籍已存在于Notion，页面ID: ${results[0].id}`);
                return { exists: true, pageId: results[0].id };
            }
            console.log("书籍尚未添加到Notion");
            return { exists: false };
        }
        catch (error) {
            const axiosError = error;
            console.error("检查书籍存在性失败:", axiosError.message);
            return { exists: false };
        }
    });
}
/**
 * 将书籍数据写入Notion数据库
 */
function writeBookToNotion(apiKey, databaseId, bookData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            console.log(`\n写入书籍《${bookData.title}》到Notion...`);
            // 首先检查是否已存在
            const existCheck = yield checkBookExistsInNotion(apiKey, databaseId, bookData.title, bookData.author || "未知作者");
            if (existCheck.exists && existCheck.pageId) {
                console.log(`书籍已存在，将更新现有页面: ${existCheck.pageId}`);
                const updateResult = yield updateBookInNotion(apiKey, existCheck.pageId, bookData);
                if (updateResult) {
                    console.log(`成功更新书籍《${bookData.title}》`);
                }
                else {
                    console.warn(`更新书籍《${bookData.title}》失败`);
                }
                return { success: true, pageId: existCheck.pageId };
            }
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 从bookData中提取译者信息 (通常不在基本元数据中，可能需要单独处理)
            const translator = bookData.translator || "";
            const coverUrl = yield (0, cover_fetch_1.getBookCoverUrl)(bookData.cover, bookData.title, bookData.author || "未知作者", bookData.isbn);
            // 构建要写入的数据
            const data = {
                parent: {
                    database_id: databaseId,
                },
                properties: {
                    // 书名是title类型
                    书名: {
                        title: [
                            {
                                type: "text",
                                text: {
                                    content: bookData.title,
                                },
                            },
                        ],
                    },
                    // 作者是rich_text类型
                    作者: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: bookData.author || "未知作者",
                                },
                            },
                        ],
                    },
                    // 译者是rich_text类型
                    译者: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: translator,
                                },
                            },
                        ],
                    },
                    // ISBN是rich_text类型
                    ISBN: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: bookData.isbn || "",
                                },
                            },
                        ],
                    },
                    // 出版社是rich_text类型
                    出版社: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: bookData.publisher || "",
                                },
                            },
                        ],
                    },
                    // 分类是rich_text类型
                    分类: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: bookData.category || "",
                                },
                            },
                        ],
                    },
                    // 阅读状态是select类型
                    阅读状态: {
                        select: {
                            name: bookData.finishReadingStatus ||
                                (bookData.finishReading
                                    ? "✅已读"
                                    : bookData.progress && bookData.progress > 0
                                        ? "📖在读"
                                        : "📕未读"),
                        },
                    },
                    // 开始阅读日期 - 如果有startReadingTime则转换为可读日期
                    开始阅读: {
                        date: ((_a = bookData.progressData) === null || _a === void 0 ? void 0 : _a.startReadingTime)
                            ? {
                                start: new Date(bookData.progressData.startReadingTime * 1000)
                                    .toISOString()
                                    .split("T")[0],
                            }
                            : null,
                    },
                    // 完成阅读日期 - 如果有finishTime则转换为可读日期
                    完成阅读: {
                        date: ((_b = bookData.progressData) === null || _b === void 0 ? void 0 : _b.finishTime)
                            ? {
                                start: new Date(bookData.progressData.finishTime * 1000)
                                    .toISOString()
                                    .split("T")[0],
                            }
                            : null,
                    },
                    // 阅读总时长 - 转换为小时和分钟格式
                    阅读总时长: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: ((_c = bookData.progressData) === null || _c === void 0 ? void 0 : _c.readingTime)
                                        ? formatReadingTime(bookData.progressData.readingTime)
                                        : "未记录",
                                },
                            },
                        ],
                    },
                    // 阅读进度 - 数字类型，直接使用API返回的progress值
                    阅读进度: {
                        number: ((_d = bookData.progressData) === null || _d === void 0 ? void 0 : _d.progress) || bookData.progress || 0,
                    },
                },
            };
            // 添加封面属性（如果有封面URL）
            if (coverUrl) {
                data.properties.封面 = {
                    files: [
                        {
                            type: "external",
                            name: `${bookData.title}-封面`,
                            external: {
                                url: coverUrl,
                            },
                        },
                    ],
                };
            }
            // 发送请求创建页面
            const response = yield axios_1.default.post(`${constants_1.NOTION_API_BASE_URL}/pages`, data, {
                headers,
            });
            console.log(`请求成功，响应状态码: ${response.status}`);
            console.log(`新创建页面ID: ${response.data.id}`);
            return { success: true, pageId: response.data.id };
        }
        catch (error) {
            const axiosError = error;
            console.error("写入数据失败:", axiosError.message);
            if (axiosError.response) {
                console.error("响应状态:", axiosError.response.status);
                console.error("响应数据:", JSON.stringify(axiosError.response.data, null, 2));
            }
            return { success: false };
        }
    });
}
/**
 * 更新Notion数据库中的书籍属性
 */
function updateBookInNotion(apiKey, pageId, bookData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            console.log(`\n更新书籍《${bookData.title}》的属性...`);
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            const translator = bookData.translator || "";
            const coverUrl = yield (0, cover_fetch_1.getBookCoverUrl)(bookData.cover, bookData.title, bookData.author || "未知作者", bookData.isbn);
            const properties = {
                书名: {
                    title: [
                        {
                            type: "text",
                            text: {
                                content: bookData.title,
                            },
                        },
                    ],
                },
                作者: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: bookData.author || "未知作者",
                            },
                        },
                    ],
                },
                译者: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: translator,
                            },
                        },
                    ],
                },
                ISBN: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: bookData.isbn || "",
                            },
                        },
                    ],
                },
                出版社: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: bookData.publisher || "",
                            },
                        },
                    ],
                },
                分类: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: bookData.category || "",
                            },
                        },
                    ],
                },
                阅读状态: {
                    select: {
                        name: bookData.finishReadingStatus ||
                            (bookData.finishReading
                                ? "✅已读"
                                : bookData.progress && bookData.progress > 0
                                    ? "📖在读"
                                    : "📕未读"),
                    },
                },
                开始阅读: {
                    date: ((_a = bookData.progressData) === null || _a === void 0 ? void 0 : _a.startReadingTime)
                        ? {
                            start: new Date(bookData.progressData.startReadingTime * 1000)
                                .toISOString()
                                .split("T")[0],
                        }
                        : null,
                },
                完成阅读: {
                    date: ((_b = bookData.progressData) === null || _b === void 0 ? void 0 : _b.finishTime)
                        ? {
                            start: new Date(bookData.progressData.finishTime * 1000)
                                .toISOString()
                                .split("T")[0],
                        }
                        : null,
                },
                阅读总时长: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: ((_c = bookData.progressData) === null || _c === void 0 ? void 0 : _c.readingTime)
                                    ? formatReadingTime(bookData.progressData.readingTime)
                                    : "未记录",
                            },
                        },
                    ],
                },
                阅读进度: {
                    number: ((_d = bookData.progressData) === null || _d === void 0 ? void 0 : _d.progress) || bookData.progress || 0,
                },
            };
            if (coverUrl) {
                properties.封面 = {
                    files: [
                        {
                            type: "external",
                            name: `${bookData.title}-封面`,
                            external: {
                                url: coverUrl,
                            },
                        },
                    ],
                };
            }
            const response = yield axios_1.default.patch(`${constants_1.NOTION_API_BASE_URL}/pages/${pageId}`, { properties }, { headers });
            console.log(`更新成功，响应状态码: ${response.status}`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error("更新书籍属性失败:", axiosError.message);
            if (axiosError.response) {
                console.error("响应状态:", axiosError.response.status);
                console.error("响应数据:", JSON.stringify(axiosError.response.data, null, 2));
            }
            return false;
        }
    });
}
/**
 * 将划线数据写入到Notion页面
 */
function writeHighlightsToNotionPage(apiKey_1, pageId_1, bookInfo_1, highlights_1) {
    return __awaiter(this, arguments, void 0, function* (apiKey, pageId, bookInfo, highlights, organizeByChapter = false) {
        try {
            console.log(`\n写入划线数据到Notion页面 ${pageId}...`);
            console.log(`划线数据数组长度: ${highlights.length}`);
            console.log(`按章节组织: ${organizeByChapter ? "是" : "否"}`);
            // 先删除页面中已有的划线区块
            const deleteResult = yield deleteNotionBlocks(apiKey, pageId, "highlights");
            if (!deleteResult) {
                console.warn("删除旧划线区块失败，可能会导致内容重复");
            }
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 创建页面内容的blocks - 只添加划线区域标题
            const blocks = [
                // 添加"划线"标题
                {
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "📌 划线",
                                },
                            },
                        ],
                    },
                },
                // 添加分隔符
                {
                    object: "block",
                    type: "divider",
                    divider: {},
                },
            ];
            // 如果没有划线，添加提示
            if (highlights.length === 0) {
                console.log(`无划线数据，添加提示信息`);
                blocks.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "该书暂无划线内容",
                                },
                                annotations: {
                                    italic: true,
                                },
                            },
                        ],
                    },
                });
            }
            else {
                console.log(`开始处理 ${highlights.length} 个章节的划线`);
                // 将章节按照 chapterUid 正序排列
                const sortedHighlights = [...highlights].sort((a, b) => a.chapterUid - b.chapterUid);
                console.log(`已将章节按顺序排列，从小到大`);
                // 按章节添加划线
                for (const chapter of sortedHighlights) {
                    console.log(`处理章节 "${chapter.chapterTitle}"，包含 ${chapter.highlights.length} 条划线`);
                    // 如果按章节组织，添加章节标题
                    if (organizeByChapter) {
                        blocks.push({
                            object: "block",
                            type: "heading_2",
                            heading_2: {
                                rich_text: [
                                    {
                                        type: "text",
                                        text: {
                                            content: chapter.chapterTitle || `章节 ${chapter.chapterUid}`,
                                        },
                                    },
                                ],
                            },
                        });
                    }
                    // 添加每条划线
                    for (const highlight of chapter.highlights) {
                        // 添加划线内容
                        blocks.push({
                            object: "block",
                            type: "quote",
                            quote: {
                                rich_text: [
                                    {
                                        type: "text",
                                        text: {
                                            content: highlight.text,
                                        },
                                    },
                                ],
                            },
                        });
                        // 如果不按章节组织，添加分隔符
                        if (!organizeByChapter) {
                            blocks.push({
                                object: "block",
                                type: "divider",
                                divider: {},
                            });
                        }
                    }
                    // 如果按章节组织，在章节结束后添加分隔符
                    if (organizeByChapter) {
                        blocks.push({
                            object: "block",
                            type: "divider",
                            divider: {},
                        });
                    }
                }
            }
            return yield addBlocksToNotion(apiKey, pageId, blocks);
        }
        catch (error) {
            const axiosError = error;
            console.error("写入划线数据失败:", axiosError.message);
            return false;
        }
    });
}
/**
 * 将想法数据写入到Notion页面
 */
function writeThoughtsToNotionPage(apiKey_1, pageId_1, bookInfo_1, thoughts_1) {
    return __awaiter(this, arguments, void 0, function* (apiKey, pageId, bookInfo, thoughts, incrementalUpdate = false, organizeByChapter = false) {
        try {
            console.log(`\n写入想法数据到Notion页面 ${pageId}...`);
            console.log(`想法数据数组长度: ${thoughts.length}`);
            console.log(`按章节组织: ${organizeByChapter ? "是" : "否"}`);
            // 只有在非增量更新或有新想法时才删除旧内容
            const shouldDeleteOldThoughts = !incrementalUpdate || thoughts.length > 0;
            if (shouldDeleteOldThoughts) {
                // 先删除页面中已有的想法区块
                const deleteResult = yield deleteNotionBlocks(apiKey, pageId, "thoughts");
                if (!deleteResult) {
                    console.warn("删除旧想法区块失败，可能会导致内容重复");
                }
            }
            else {
                console.log("增量更新模式且没有新想法，保留现有想法区块");
            }
            // 如果在增量模式下没有新想法，则跳过写入步骤
            if (incrementalUpdate && thoughts.length === 0) {
                console.log("增量更新模式下没有新想法，跳过写入步骤");
                return true;
            }
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 创建页面内容的blocks - 只添加想法区域标题
            const blocks = [
                // 添加"想法"标题
                {
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "💭 想法",
                                },
                            },
                        ],
                    },
                },
                // 添加分隔符
                {
                    object: "block",
                    type: "divider",
                    divider: {},
                },
            ];
            // 按章节对想法进行分组
            const thoughtsByChapter = thoughts.reduce((acc, thought) => {
                const chapterUid = thought.chapterUid || 0;
                if (!acc[chapterUid]) {
                    acc[chapterUid] = {
                        chapterTitle: thought.chapterTitle || `章节 ${chapterUid}`,
                        thoughts: [],
                    };
                }
                acc[chapterUid].thoughts.push(thought);
                return acc;
            }, {});
            // 将章节按UID排序
            const sortedChapterUids = Object.keys(thoughtsByChapter).sort((a, b) => parseInt(a) - parseInt(b));
            console.log(`想法已按 ${sortedChapterUids.length} 个章节分组`);
            // 遍历每个章节
            for (const chapterUid of sortedChapterUids) {
                const chapterData = thoughtsByChapter[chapterUid];
                const chapterThoughts = chapterData.thoughts;
                console.log(`处理章节 ${chapterUid} 中的 ${chapterThoughts.length} 条想法`);
                // 如果按章节组织，添加章节标题
                if (organizeByChapter) {
                    blocks.push({
                        object: "block",
                        type: "heading_2",
                        heading_2: {
                            rich_text: [
                                {
                                    type: "text",
                                    text: {
                                        content: chapterData.chapterTitle,
                                    },
                                },
                            ],
                        },
                    });
                }
                // 添加每条想法
                for (const thought of chapterThoughts) {
                    // 添加原文（使用引用块）
                    if (thought.abstract) {
                        blocks.push({
                            object: "block",
                            type: "quote",
                            quote: {
                                rich_text: [
                                    {
                                        type: "text",
                                        text: {
                                            content: thought.abstract,
                                        },
                                    },
                                ],
                            },
                        });
                    }
                    // 添加想法内容（使用段落块，加粗显示）
                    if (thought.content) {
                        blocks.push({
                            object: "block",
                            type: "paragraph",
                            paragraph: {
                                rich_text: [
                                    {
                                        type: "text",
                                        text: {
                                            content: `💭 ${thought.content}`,
                                        },
                                        annotations: {
                                            bold: true,
                                            color: "blue",
                                        },
                                    },
                                ],
                            },
                        });
                    }
                    // 如果不按章节组织，添加分隔符
                    if (!organizeByChapter) {
                        blocks.push({
                            object: "block",
                            type: "divider",
                            divider: {},
                        });
                    }
                }
                // 如果按章节组织，在章节结束后添加分隔符
                if (organizeByChapter) {
                    blocks.push({
                        object: "block",
                        type: "divider",
                        divider: {},
                    });
                }
            }
            return yield addBlocksToNotion(apiKey, pageId, blocks);
        }
        catch (error) {
            const axiosError = error;
            console.error("写入想法数据失败:", axiosError.message);
            return false;
        }
    });
}
/**
 * 批量添加Blocks到Notion
 */
function addBlocksToNotion(apiKey, pageId, blocks) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`共准备了 ${blocks.length} 个 blocks 用于添加到 Notion 页面`);
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 一次请求最多只能添加100个block，所以可能需要分批添加
            const MAX_BLOCKS_PER_REQUEST = 100;
            for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
                const batchBlocks = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
                console.log(`添加第 ${i + 1} 到 ${i + batchBlocks.length} 个block...`);
                try {
                    // 调用Notion API添加blocks
                    const response = yield axios_1.default.patch(`${constants_1.NOTION_API_BASE_URL}/blocks/${pageId}/children`, {
                        children: batchBlocks,
                    }, { headers });
                    console.log(`API响应状态: ${response.status}`);
                }
                catch (error) {
                    console.error(`添加blocks批次失败:`, error.message);
                    if (error.response) {
                        console.error(`响应状态: ${error.response.status}`);
                        console.error(`响应数据: ${JSON.stringify(error.response.data).substring(0, 300)}...`);
                    }
                    throw error; // 重新抛出错误以便外层捕获
                }
                // 如果还有更多blocks要添加，等待一下避免请求过快
                if (i + MAX_BLOCKS_PER_REQUEST < blocks.length) {
                    console.log(`等待500毫秒后继续添加下一批次...`);
                    yield new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
            console.log(`数据已成功写入到Notion页面`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error("写入数据失败:", axiosError.message);
            return false;
        }
    });
}
/**
 * 删除Notion页面中特定类型的内容块
 */
function deleteNotionBlocks(apiKey, pageId, blockType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            console.log(`查找并删除页面 ${pageId} 中的${blockType === "highlights" ? "划线" : "想法"}区块...`);
            // 设置请求头
            const headers = (0, http_1.getNotionHeaders)(apiKey, constants_1.NOTION_VERSION);
            // 查找页面中的所有区块
            const response = yield axios_1.default.get(`${constants_1.NOTION_API_BASE_URL}/blocks/${pageId}/children?page_size=100`, { headers });
            const blocks = response.data.results;
            console.log(`获取到 ${blocks.length} 个顶级区块`);
            // 查找特定标题的区块和其后的内容
            let foundHeader = false;
            let blocksToDelete = [];
            const headerText = blockType === "highlights" ? "📌 划线" : "💭 想法";
            for (const block of blocks) {
                // 检查是否是我们要找的标题
                if (block.type === "heading_1" &&
                    ((_d = (_c = (_b = (_a = block.heading_1) === null || _a === void 0 ? void 0 : _a.rich_text) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text) === null || _d === void 0 ? void 0 : _d.content) === headerText) {
                    foundHeader = true;
                    blocksToDelete.push(block.id);
                    console.log(`找到${blockType === "highlights" ? "划线" : "想法"}标题区块: ${block.id}`);
                    continue;
                }
                // 如果已找到标题，收集后续区块直到找到另一个标题
                if (foundHeader) {
                    if (block.type === "heading_1") {
                        const text = ((_h = (_g = (_f = (_e = block.heading_1) === null || _e === void 0 ? void 0 : _e.rich_text) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text) === null || _h === void 0 ? void 0 : _h.content) || "";
                        // 如果遇到另一个标题，停止收集
                        if (text === "📌 划线" || text === "💭 想法") {
                            console.log(`遇到新标题 "${text}", 停止收集区块`);
                            foundHeader = false;
                            continue;
                        }
                    }
                    // 收集这个区块
                    blocksToDelete.push(block.id);
                }
            }
            // 删除收集到的区块
            if (blocksToDelete.length > 0) {
                console.log(`将删除 ${blocksToDelete.length} 个与${blockType === "highlights" ? "划线" : "想法"}相关的区块`);
                // 删除所有收集到的区块
                // Notion API要求一次只能删除一个区块，所以需要循环调用
                for (const blockId of blocksToDelete) {
                    try {
                        yield axios_1.default.delete(`${constants_1.NOTION_API_BASE_URL}/blocks/${blockId}`, {
                            headers,
                        });
                        // 为避免API限流，加一点延迟
                        yield new Promise((resolve) => setTimeout(resolve, 100));
                    }
                    catch (error) {
                        console.error(`删除区块 ${blockId} 失败:`, error.message);
                        // 继续删除其它区块
                    }
                }
                console.log(`成功删除旧的${blockType === "highlights" ? "划线" : "想法"}区块`);
            }
            else {
                console.log(`未找到需要删除的${blockType === "highlights" ? "划线" : "想法"}区块`);
            }
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error(`删除Notion区块失败:`, axiosError.message);
            return false;
        }
    });
}
