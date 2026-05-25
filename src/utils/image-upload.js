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
exports.downloadWereadCover = downloadWereadCover;
exports.uploadToImgur = uploadToImgur;
exports.uploadToGitHub = uploadToGitHub;
exports.processImportedBookCover = processImportedBookCover;
/**
 * 图片处理服务 - 用于GitHub Actions环境
 */
const axios_1 = __importDefault(require("axios"));
/**
 * 下载微信读书封面图片
 */
function downloadWereadCover(coverUrl, cookie) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`正在下载封面: ${coverUrl}`);
            const response = yield axios_1.default.get(coverUrl, {
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Cookie": cookie,
                    "Referer": "https://weread.qq.com/",
                },
            });
            console.log(`封面下载成功，大小: ${response.data.length} bytes`);
            return Buffer.from(response.data);
        }
        catch (error) {
            console.error(`下载封面失败:`, error.message);
            if (error.response) {
                console.error(`状态码: ${error.response.status}`);
            }
            return null;
        }
    });
}
/**
 * 上传图片到 Imgur
 * 需要配置 GITHUB_IMGUR_CLIENT_ID 环境变量
 */
function uploadToImgur(imageBuffer, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            console.log("正在上传图片到 Imgur...");
            const formData = new FormData();
            const blob = new Blob([imageBuffer]);
            formData.append("image", blob);
            const response = yield axios_1.default.post("https://api.imgur.com/3/image", formData, {
                headers: Object.assign({ "Authorization": `Client-ID ${clientId}` }, ((_b = (_a = formData).getHeaders) === null || _b === void 0 ? void 0 : _b.call(_a)) || {}),
                timeout: 20000,
            });
            if (response.data && response.data.success && response.data.data) {
                const imgurUrl = response.data.data.link;
                console.log(`图片上传成功: ${imgurUrl}`);
                return { success: true, url: imgurUrl };
            }
            else {
                return { success: false, error: "Imgur API 返回错误" };
            }
        }
        catch (error) {
            console.error(`上传到 Imgur 失败:`, error.message);
            if (error.response) {
                console.error(`响应:`, JSON.stringify(error.response.data, null, 2));
            }
            return { success: false, error: error.message };
        }
    });
}
/**
 * 上传图片到 GitHub 仓库作为临时文件
 * 需要配置 GITHUB_TOKEN 和 GITHUB_REPOSITORY 环境变量
 */
function uploadToGitHub(imageBuffer, token, owner, repo, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`正在上传图片到 GitHub 仓库: ${owner}/${repo}`);
            const base64Image = imageBuffer.toString("base64");
            const timestamp = Date.now();
            const path = `temp-covers/${timestamp}_${fileName}`;
            const response = yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                message: "Add book cover",
                content: base64Image,
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                    "User-Agent": "weread-to-notion",
                },
                timeout: 20000,
            });
            if (response.data && response.data.content) {
                // 使用 raw.githubusercontent.com 格式访问
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
                console.log(`图片上传成功: ${rawUrl}`);
                return { success: true, url: rawUrl };
            }
            return { success: false, error: "GitHub API 返回格式错误" };
        }
        catch (error) {
            console.error(`上传到 GitHub 失败:`, error.message);
            if (error.response) {
                console.error(`响应:`, JSON.stringify(error.response.data, null, 2));
            }
            return { success: false, error: error.message };
        }
    });
}
/**
 * 尝试直接修改URL获取可访问的图片
 * 有些情况下，简单地添加图片后缀就能让服务器返回正确的图片
 */
function tryDirectUrlFix(coverUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 尝试几种常见的图片后缀
            const extensions = [".jpg", ".jpeg", ".png", ".webp"];
            for (const ext of extensions) {
                // 移除可能存在的后缀
                let fixedUrl = coverUrl.replace(/_parsecover$/, "");
                // 添加新后缀
                fixedUrl = fixedUrl + ext;
                console.log(`尝试直接URL修复: ${fixedUrl}`);
                // 检查URL是否可访问
                const response = yield axios_1.default.head(fixedUrl, {
                    timeout: 5000,
                    headers: {
                        "Referer": "https://weread.qq.com/",
                    },
                });
                // 如果状态码是200，说明可以访问
                if (response.status === 200) {
                    console.log(`✓ 直接URL修复成功: ${fixedUrl}`);
                    return fixedUrl;
                }
            }
        }
        catch (error) {
            // 忽略错误，继续尝试其他方法
            console.log("直接URL修复失败，继续尝试下载上传方案");
        }
        return null;
    });
}
/**
 * 处理用户导入书籍的封面（GitHub Actions环境方案）
 * 支持多种图床服务
 */
function processImportedBookCover(coverUrl, bookTitle, options) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n=== 处理用户导入书籍封面: 《${bookTitle}》===`);
        // 方案1: 先尝试直接修改URL
        const directUrl = yield tryDirectUrlFix(coverUrl);
        if (directUrl) {
            return directUrl;
        }
        // 方案2: 下载并上传到图床
        console.log("使用下载上传方案...");
        // 1. 下载封面
        const imageBuffer = yield downloadWereadCover(coverUrl, options.wereadCookie);
        if (!imageBuffer) {
            console.warn("封面下载失败，跳过");
            return null;
        }
        // 2. 尝试上传到图床
        let uploadResult = null;
        // 优先使用 Imgur
        if (options.imgurClientId) {
            uploadResult = yield uploadToImgur(imageBuffer, options.imgurClientId);
        }
        // Imgur 失败则尝试 GitHub
        if (!(uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.success) &&
            options.githubToken &&
            options.githubRepository) {
            const [owner, repo] = options.githubRepository.split("/");
            const sanitizedTitle = bookTitle
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")
                .substring(0, 50);
            uploadResult = yield uploadToGitHub(imageBuffer, options.githubToken, owner, repo, `${sanitizedTitle}.jpg`);
        }
        if ((uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.success) && uploadResult.url) {
            console.log(`✓ 封面处理完成: ${uploadResult.url}`);
            return uploadResult.url;
        }
        console.warn("所有图床上传失败，无法获取可访问的封面");
        return null;
    });
}
