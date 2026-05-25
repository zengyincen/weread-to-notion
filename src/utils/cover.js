"use strict";
/**
 * 封面URL处理工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCoverUrl = normalizeCoverUrl;
exports.getCoverUrlWithSize = getCoverUrlWithSize;
const constants_1 = require("../config/constants");
/**
 * 检查URL是否有效
 */
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === "https:" && urlObj.hostname.includes("weread");
    }
    catch (_a) {
        return false;
    }
}
/**
 * 规范化微信读书封面URL
 * 微信读书API返回的封面URL可能有多种格式：
 * - 完整URL: https://weread.qq.com/cover/xxx.jpg
 * - 相对路径: /cover/xxx.jpg
 * - 不带协议的URL: //weread.qq.com/cover/xxx.jpg
 * - 用户导入书籍的特殊格式: /reader/cover?id=xxx 或其他格式
 *
 * @param coverUrl 原始封面URL
 * @returns 规范化后的完整URL，无效则返回空字符串
 */
function normalizeCoverUrl(coverUrl) {
    if (!coverUrl || typeof coverUrl !== "string") {
        return "";
    }
    const trimmedUrl = coverUrl.trim();
    // 如果是空字符串或空白，返回空
    if (!trimmedUrl) {
        return "";
    }
    // 如果已经是完整的https URL，验证后返回
    if (trimmedUrl.startsWith("https://")) {
        if (isValidUrl(trimmedUrl)) {
            return trimmedUrl;
        }
        // 检查是否是weread相关的有效URL
        if (trimmedUrl.includes("weread.qq.com") || trimmedUrl.includes("qpic.cn")) {
            return trimmedUrl;
        }
        // 其他https URL可能不是有效的封面
        console.warn(`无效的封面URL: ${trimmedUrl}`);
        return "";
    }
    // 如果是不带协议的URL（以//开头）
    if (trimmedUrl.startsWith("//")) {
        const fullUrl = `https:${trimmedUrl}`;
        if (isValidUrl(fullUrl)) {
            return fullUrl;
        }
        // 对于用户导入的书籍，可能使用qpic.cn域名
        if (trimmedUrl.includes("qpic.cn")) {
            return fullUrl;
        }
        return "";
    }
    // 如果是相对路径（以/开头）
    if (trimmedUrl.startsWith("/")) {
        // 检查是否是特殊的reader/cover路径（用户导入书籍的封面）
        if (trimmedUrl.startsWith("/reader/cover")) {
            return `${constants_1.WEREAD_BASE_URL}${trimmedUrl}`;
        }
        // 普通的cover路径
        return `${constants_1.WEREAD_BASE_URL}${trimmedUrl}`;
    }
    // 如果是其他相对路径格式，尝试拼接
    if (!trimmedUrl.startsWith("http")) {
        // 检查是否是bookId格式（用户导入书籍可能只有ID）
        if (trimmedUrl.length > 0 && !trimmedUrl.includes("/")) {
            // 尝试构造标准封面URL
            return `${constants_1.WEREAD_BASE_URL}/cover/${trimmedUrl}`;
        }
        return `${constants_1.WEREAD_BASE_URL}/cover/${trimmedUrl}`;
    }
    // 其他情况返回空
    return "";
}
/**
 * 获取微信读书书籍封面的标准尺寸URL
 * 微信读书封面支持多种尺寸：
 * - s: 小图 120x150
 * - m: 中图 240x300
 * - l: 大图 480x600
 *
 * @param coverUrl 原始封面URL
 * @param size 尺寸类型: 's' | 'm' | 'l'
 * @returns 指定尺寸的封面URL
 */
function getCoverUrlWithSize(coverUrl, size = "m") {
    const normalizedUrl = normalizeCoverUrl(coverUrl);
    if (!normalizedUrl) {
        return "";
    }
    // 检查是否已经有尺寸参数
    if (normalizedUrl.includes("/s/") || normalizedUrl.includes("/m/") || normalizedUrl.includes("/l/")) {
        // 替换尺寸参数
        return normalizedUrl.replace(/\/[sml]\//, `/${size}/`);
    }
    // 找到cover/后的部分并插入尺寸
    const coverIndex = normalizedUrl.indexOf("/cover/");
    if (coverIndex !== -1) {
        return normalizedUrl.replace("/cover/", `/cover/${size}/`);
    }
    return normalizedUrl;
}
