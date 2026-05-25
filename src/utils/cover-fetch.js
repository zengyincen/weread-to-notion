"use strict";
/**
 * 书籍封面获取服务
 * 用于处理用户导入书籍的封面获取
 * 使用多个API源，按优先级排序
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
exports.isUserImportedBook = isUserImportedBook;
exports.searchBookCoverByGoogleBooks = searchBookCoverByGoogleBooks;
exports.searchBookCoverByOpenLibrary = searchBookCoverByOpenLibrary;
exports.searchBookCoverByISBN = searchBookCoverByISBN;
exports.getBookCoverUrl = getBookCoverUrl;
const axios_1 = __importDefault(require("axios"));
const cover_1 = require("./cover");
/**
 * 检测是否为用户导入的书籍（通过封面URL判断）
 */
function isUserImportedBook(coverUrl) {
    if (!coverUrl)
        return false;
    return coverUrl.includes("res.weread.qq.com/wrepub") && coverUrl.includes("_parsecover");
}
/**
 * 通过 Google Books API 搜索书籍封面
 * 对中文书籍支持更好
 */
function searchBookCoverByGoogleBooks(title, author, isbn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Google Books] 搜索封面: 《${title}》 作者: ${author}`);
            let query = "";
            if (isbn && isbn.trim()) {
                query = `isbn:${isbn}`;
            }
            else {
                const queryParts = [];
                if (title && title.trim()) {
                    queryParts.push(`intitle:${title}`);
                }
                if (author && author.trim()) {
                    queryParts.push(`inauthor:${author}`);
                }
                query = queryParts.join("+");
            }
            if (!query) {
                console.log("[Google Books] 查询参数不足，跳过搜索");
                return null;
            }
            const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
            const response = yield axios_1.default.get(searchUrl, {
                timeout: 10000,
            });
            if (response.data && response.data.items && response.data.items.length > 0) {
                for (const item of response.data.items) {
                    if (item.volumeInfo &&
                        item.volumeInfo.imageLinks) {
                        let coverUrl = item.volumeInfo.imageLinks.thumbnail;
                        if (coverUrl) {
                            coverUrl = coverUrl.replace(/&zoom=\d+/, "").replace(/zoom=\d+/, "");
                            coverUrl = coverUrl.replace("zoom=1", "zoom=2");
                            console.log(`[Google Books] 找到封面: ${coverUrl}`);
                            return coverUrl;
                        }
                    }
                }
            }
            console.log("[Google Books] 未找到匹配的封面");
            return null;
        }
        catch (error) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.warn(`[Google Books] 搜索超时: ${title}`);
            }
            else {
                console.warn(`[Google Books] 搜索失败:`, error.message);
            }
            return null;
        }
    });
}
/**
 * 通过 Open Library API 搜索书籍封面
 * 主要用于英文书籍
 */
function searchBookCoverByOpenLibrary(title, author, isbn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Open Library] 搜索封面: 《${title}》 作者: ${author}`);
            if (isbn && isbn.trim()) {
                const isbnCover = yield searchBookCoverByISBN(isbn);
                if (isbnCover) {
                    return isbnCover;
                }
            }
            const queryParts = [];
            if (title && title.trim()) {
                queryParts.push(title);
            }
            if (author && author.trim()) {
                queryParts.push(author);
            }
            if (queryParts.length === 0) {
                return null;
            }
            const query = queryParts.join(" ");
            const encodedQuery = encodeURIComponent(query);
            const searchUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=5&fields=cover_i,key,title,author_name`;
            const response = yield axios_1.default.get(searchUrl, {
                timeout: 10000,
                headers: {
                    "User-Agent": "weread-to-notion/1.0 (contact@example.com)",
                },
            });
            if (response.data && response.data.docs && response.data.docs.length > 0) {
                const book = response.data.docs[0];
                if (book.cover_i) {
                    const coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
                    console.log(`[Open Library] 找到封面: ${coverUrl}`);
                    return coverUrl;
                }
            }
            console.log("[Open Library] 未找到匹配的封面");
            return null;
        }
        catch (error) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.warn(`[Open Library] 搜索超时: ${title}`);
            }
            else {
                console.warn(`[Open Library] 搜索失败:`, error.message);
            }
            return null;
        }
    });
}
/**
 * 通过 ISBN 搜索书籍封面 (Open Library)
 */
function searchBookCoverByISBN(isbn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!isbn || isbn.trim() === "") {
                return null;
            }
            console.log(`[Open Library ISBN] 搜索: ${isbn}`);
            const searchUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
            const response = yield axios_1.default.get(searchUrl, {
                timeout: 10000,
                headers: {
                    "User-Agent": "weread-to-notion/1.0 (contact@example.com)",
                },
            });
            const key = `ISBN:${isbn}`;
            if (response.data && response.data[key] && response.data[key].cover) {
                const coverUrl = response.data[key].cover.large ||
                    response.data[key].cover.medium ||
                    response.data[key].cover.small;
                if (coverUrl) {
                    console.log(`[Open Library ISBN] 找到封面: ${coverUrl}`);
                    return coverUrl;
                }
            }
            console.log("[Open Library ISBN] 未找到封面");
            return null;
        }
        catch (error) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.warn(`[Open Library ISBN] 搜索超时: ${isbn}`);
            }
            else {
                console.warn(`[Open Library ISBN] 搜索失败:`, error.message);
            }
            return null;
        }
    });
}
/**
 * 获取书籍封面URL
 * 优先使用原有封面，如果不可用则尝试搜索
 * 按优先级尝试多个API源
 */
function getBookCoverUrl(originalCoverUrl, bookTitle, bookAuthor, bookIsbn) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedUrl = (0, cover_1.normalizeCoverUrl)(originalCoverUrl);
        if (normalizedUrl) {
            if (!isUserImportedBook(originalCoverUrl)) {
                return normalizedUrl;
            }
            console.log(`《${bookTitle}》封面不可用，尝试搜索...`);
            const googleCover = yield searchBookCoverByGoogleBooks(bookTitle, bookAuthor, bookIsbn);
            if (googleCover) {
                return googleCover;
            }
            const openLibraryCover = yield searchBookCoverByOpenLibrary(bookTitle, bookAuthor, bookIsbn);
            if (openLibraryCover) {
                return openLibraryCover;
            }
        }
        console.warn(`无法为《${bookTitle}》获取封面`);
        return "";
    });
}
