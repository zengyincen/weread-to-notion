/**
 * 书籍封面获取服务
 * 用于处理用户导入书籍的封面获取
 */

import axios from "axios";
import { WEREAD_BASE_URL } from "../config/constants";
import { normalizeCoverUrl } from "./cover";

/**
 * 检测是否为用户导入的书籍（通过封面URL判断）
 */
export function isUserImportedBook(coverUrl: string): boolean {
  if (!coverUrl) return false;
  return coverUrl.includes("res.weread.qq.com/wrepub") && coverUrl.includes("_parsecover");
}

/**
 * 通过书名和作者搜索书籍封面
 * 使用 Open Library API（免费、公开的书籍数据库）
 */
export async function searchBookCover(
  title: string,
  author: string
): Promise<string | null> {
  try {
    console.log(`搜索书籍封面: 《${title}》 作者: ${author}`);

    // 构建搜索查询
    const queryParts = [title];
    if (author && author.trim()) {
      queryParts.push(author);
    }
    const query = queryParts.join(" ");

    // URL编码
    const encodedQuery = encodeURIComponent(query);

    // 使用 Open Library Search API
    const searchUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=5&fields=cover_i,key,title,author_name`;

    const response = await axios.get(searchUrl, {
      timeout: 10000, // 增加超时时间到10秒
      headers: {
        "User-Agent": "weread-to-notion/1.0 (contact@example.com)",
      },
    });

    if (response.data && response.data.docs && response.data.docs.length > 0) {
      // 找到匹配的书籍
      const book = response.data.docs[0];

      if (book.cover_i) {
        // Open Library 的封面ID，构造不同尺寸的URL
        const coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        console.log(`找到封面: ${coverUrl}`);
        return coverUrl;
      }
    }

    console.log("未找到匹配的封面");
    return null;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn(`搜索封面超时: ${title}`);
    } else {
      console.error(`搜索封面失败:`, error.message);
    }
    return null;
  }
}

/**
 * 通过 ISBN 搜索书籍封面
 * 如果书籍有 ISBN，搜索成功率更高
 */
export async function searchBookCoverByISBN(
  isbn: string
): Promise<string | null> {
  try {
    if (!isbn || isbn.trim() === "") {
      return null;
    }

    console.log(`通过 ISBN 搜索封面: ${isbn}`);

    const searchUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await axios.get(searchUrl, {
      timeout: 10000, // 增加超时时间到10秒
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
        console.log(`通过 ISBN 找到封面: ${coverUrl}`);
        return coverUrl;
      }
    }

    console.log("通过 ISBN 未找到封面");
    return null;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn(`通过 ISBN 搜索封面超时: ${isbn}`);
    } else {
      console.error(`通过 ISBN 搜索封面失败:`, error.message);
    }
    return null;
  }
}

/**
 * 获取书籍封面URL
 * 优先使用原有封面，如果不可用则尝试搜索
 */
export async function getBookCoverUrl(
  originalCoverUrl: string,
  bookTitle: string,
  bookAuthor: string,
  bookIsbn?: string
): Promise<string> {
  // 首先检查原有封面是否可用
  const normalizedUrl = normalizeCoverUrl(originalCoverUrl);
  if (normalizedUrl) {
    // 如果不是用户导入的书籍，直接返回原有封面
    if (!isUserImportedBook(originalCoverUrl)) {
      return normalizedUrl;
    }

    // 对于用户导入的书籍，尝试搜索封面
    console.log(`《${bookTitle}》封面不可用，尝试搜索...`);

    // 如果有 ISBN，优先使用 ISBN 搜索
    if (bookIsbn && bookIsbn.trim()) {
      const isbnCover = await searchBookCoverByISBN(bookIsbn);
      if (isbnCover) {
        return isbnCover;
      }
    }

    // 使用书名和作者搜索
    const titleAuthorCover = await searchBookCover(bookTitle, bookAuthor);
    if (titleAuthorCover) {
      return titleAuthorCover;
    }
  }

  // 如果都失败了，返回空字符串
  console.warn(`无法为《${bookTitle}》获取封面`);
  return "";
}

/**
 * 生成默认书籍封面 SVG
 * 这是一个简单的书籍图标 SVG，可以转换为图片URL
 * 注意：Notion 可能不支持 SVG 作为封面图片
 */
export function generateDefaultCoverSVG(
  title: string,
  author: string
): string {
  const truncatedTitle = title.length > 20 ? title.substring(0, 20) + "..." : title;
  const truncatedAuthor = author.length > 15 ? author.substring(0, 15) + "..." : author;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="400" fill="#4A90E2"/>
  <rect x="20" y="50" width="260" height="300" rx="5" fill="white" opacity="0.9"/>
  <text x="150" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#333">${truncatedTitle}</text>
  <text x="150" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">${truncatedAuthor}</text>
  <text x="150" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">本地导入书籍</text>
</svg>`;
}
