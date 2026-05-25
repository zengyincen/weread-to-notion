/**
 * 图片处理服务 - 用于GitHub Actions环境
 */
import axios from "axios";

/**
 * 图片上传配置选项
 */
export interface UploadOptions {
  wereadCookie: string;
  imgurClientId?: string;
  githubToken?: string;
  githubRepository?: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * 下载微信读书封面图片
 */
export async function downloadWereadCover(
  coverUrl: string,
  cookie: string
): Promise<Buffer | null> {
  try {
    console.log(`正在下载封面: ${coverUrl}`);
    const response = await axios.get(coverUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookie,
        "Referer": "https://weread.qq.com/",
      },
    });
    console.log(`封面下载成功，大小: ${response.data.length} bytes`);
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`下载封面失败:`, error.message);
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * 上传图片到 Imgur
 * 需要配置 GITHUB_IMGUR_CLIENT_ID 环境变量
 */
export async function uploadToImgur(
  imageBuffer: Buffer,
  clientId: string
): Promise<UploadResult> {
  try {
    console.log("正在上传图片到 Imgur...");
    const formData = new FormData();
    const blob = new Blob([imageBuffer]);
    formData.append("image", blob);
    
    const response = await axios.post("https://api.imgur.com/3/image", formData, {
      headers: {
        "Authorization": `Client-ID ${clientId}`,
        ...(formData as any).getHeaders?.() || {},
      },
      timeout: 20000,
    });
    
    if (response.data && response.data.success && response.data.data) {
      const imgurUrl = response.data.data.link;
      console.log(`图片上传成功: ${imgurUrl}`);
      return { success: true, url: imgurUrl };
    } else {
      return { success: false, error: "Imgur API 返回错误" };
    }
  } catch (error: any) {
    console.error(`上传到 Imgur 失败:`, error.message);
    if (error.response) {
      console.error(`响应:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

/**
 * 上传图片到 GitHub 仓库作为临时文件
 * 需要配置 GITHUB_TOKEN 和 GITHUB_REPOSITORY 环境变量
 */
export async function uploadToGitHub(
  imageBuffer: Buffer,
  token: string,
  owner: string,
  repo: string,
  fileName: string
): Promise<UploadResult> {
  try {
    console.log(`正在上传图片到 GitHub 仓库: ${owner}/${repo}`);
    const base64Image = imageBuffer.toString("base64");
    const timestamp = Date.now();
    const path = `temp-covers/${timestamp}_${fileName}`;
    
    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: "Add book cover",
        content: base64Image,
      },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "weread-to-notion",
        },
        timeout: 20000,
      }
    );
    
    if (response.data && response.data.content) {
      // 使用 raw.githubusercontent.com 格式访问
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
      console.log(`图片上传成功: ${rawUrl}`);
      return { success: true, url: rawUrl };
    }
    return { success: false, error: "GitHub API 返回格式错误" };
  } catch (error: any) {
    console.error(`上传到 GitHub 失败:`, error.message);
    if (error.response) {
      console.error(`响应:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

/**
 * 处理用户导入书籍的封面（GitHub Actions环境方案）
 * 支持多种图床服务
 */
export async function processImportedBookCover(
  coverUrl: string,
  bookTitle: string,
  options: UploadOptions
): Promise<string | null> {
  console.log(`\n=== 处理用户导入书籍封面: 《${bookTitle}》===`);
  
  // 1. 下载封面
  const imageBuffer = await downloadWereadCover(coverUrl, options.wereadCookie);
  if (!imageBuffer) {
    console.warn("封面下载失败，跳过");
    return null;
  }
  
  // 2. 尝试上传到图床
  let uploadResult: UploadResult | null = null;
  
  // 优先使用 Imgur
  if (options.imgurClientId) {
    uploadResult = await uploadToImgur(imageBuffer, options.imgurClientId);
  }
  
  // Imgur 失败则尝试 GitHub
  if (
    !(uploadResult?.success) &&
    options.githubToken &&
    options.githubRepository
  ) {
    const [owner, repo] = options.githubRepository.split("/");
    const sanitizedTitle = bookTitle
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")
      .substring(0, 50);
    uploadResult = await uploadToGitHub(
      imageBuffer,
      options.githubToken,
      owner,
      repo,
      `${sanitizedTitle}.jpg`
    );
  }
  
  if (uploadResult?.success && uploadResult.url) {
    console.log(`✓ 封面处理完成: ${uploadResult.url}`);
    return uploadResult.url;
  }
  
  console.warn("所有图床上传失败，无法获取可访问的封面");
  return null;
}
