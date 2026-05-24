"use strict";
/**
 * 封面URL处理工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCoverUrl = normalizeCoverUrl;
exports.getCoverUrlWithSize = getCoverUrlWithSize;
const constants_1 = require("../config/constants");
/**
 * 规范化微信读书封面URL
 * 微信读书API返回的封面URL可能有多种格式：
 * - 完整URL: https://weread.qq.com/cover/xxx.jpg
 * - 相对路径: /cover/xxx.jpg
 * - 不带协议的URL: //weread.qq.com/cover/xxx.jpg
 *
 * @param coverUrl 原始封面URL
 * @returns 规范化后的完整URL
 */
function normalizeCoverUrl(coverUrl) {
    if (!coverUrl || typeof coverUrl !== "string") {
        return "";
    }
    const trimmedUrl = coverUrl.trim();
    // 如果已经是完整的https URL，直接返回
    if (trimmedUrl.startsWith("https://")) {
        return trimmedUrl;
    }
    // 如果是不带协议的URL（以//开头）
    if (trimmedUrl.startsWith("//")) {
        return `https:${trimmedUrl}`;
    }
    // 如果是相对路径（以/开头）
    if (trimmedUrl.startsWith("/")) {
        return `${constants_1.WEREAD_BASE_URL}${trimmedUrl}`;
    }
    // 如果是其他相对路径格式，尝试拼接
    if (!trimmedUrl.startsWith("http")) {
        return `${constants_1.WEREAD_BASE_URL}/cover/${trimmedUrl}`;
    }
    return trimmedUrl;
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
