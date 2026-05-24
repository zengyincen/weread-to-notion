/**
 * 封面获取功能测试
 */

import {
  isUserImportedBook,
  searchBookCover,
  searchBookCoverByISBN,
  getBookCoverUrl,
} from "./utils/cover-fetch";

async function testCoverFetching() {
  console.log("=== 测试封面获取功能 ===\n");

  // 测试1: 检测用户导入书籍
  console.log("测试1: 检测用户导入书籍");
  const importedUrl = "https://res.weread.qq.com/wrepub/CB_3UF7Pr7OL1GK73Y71YBeL2dd_parsecover";
  const normalUrl = "https://weread.qq.com/cover/123456.jpg";

  console.log(`  "${importedUrl}" 是用户导入书籍: ${isUserImportedBook(importedUrl)}`);
  console.log(`  "${normalUrl}" 是用户导入书籍: ${isUserImportedBook(normalUrl)}`);
  console.log();

  // 测试2: 通过书名和作者搜索封面
  console.log("测试2: 通过书名和作者搜索封面");
  const testCases = [
    { title: "The Pragmatic Programmer", author: "David Thomas" },
    { title: "Clean Code", author: "Robert C. Martin" },
    { title: "设计模式", author: "Gang of Four" },
  ];

  for (const testCase of testCases) {
    console.log(`  搜索: 《${testCase.title}》 作者: ${testCase.author}`);
    const coverUrl = await searchBookCover(testCase.title, testCase.author);
    if (coverUrl) {
      console.log(`  ✓ 找到封面: ${coverUrl}`);
    } else {
      console.log(`  ✗ 未找到封面`);
    }
    console.log();
  }

  // 测试3: 通过 ISBN 搜索封面
  console.log("测试3: 通过 ISBN 搜索封面");
  const isbn = "9780132350884"; // Clean Code 的 ISBN
  console.log(`  搜索 ISBN: ${isbn}`);
  const isbnCover = await searchBookCoverByISBN(isbn);
  if (isbnCover) {
    console.log(`  ✓ 通过 ISBN 找到封面: ${isbnCover}`);
  } else {
    console.log(`  ✗ 通过 ISBN 未找到封面`);
  }
  console.log();

  // 测试4: 获取书籍封面 URL（主函数）
  console.log("测试4: 获取书籍封面 URL（主函数）");

  // 测试普通书籍
  console.log("  4a. 普通书籍:");
  const normalBookCover = await getBookCoverUrl(
    normalUrl,
    "Clean Code",
    "Robert C. Martin"
  );
  console.log(`  结果: ${normalBookCover || "(空)"}`);
  console.log();

  // 测试用户导入书籍（无 ISBN）
  console.log("  4b. 用户导入书籍（无 ISBN）:");
  const importedBookCover = await getBookCoverUrl(
    importedUrl,
    "我的测试书籍",
    "测试作者"
  );
  console.log(`  结果: ${importedBookCover || "(空)"}`);
  console.log();

  // 测试用户导入书籍（有 ISBN）
  console.log("  4c. 用户导入书籍（有 ISBN）:");
  const importedWithIsbnCover = await getBookCoverUrl(
    importedUrl,
    "Clean Code",
    "Robert C. Martin",
    isbn
  );
  console.log(`  结果: ${importedWithIsbnCover || "(空)"}`);
  console.log();

  console.log("=== 测试完成 ===");
}

// 运行测试
testCoverFetching().catch(console.error);
