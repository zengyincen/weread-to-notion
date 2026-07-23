/**
 * 将 Notion 中已有的 image/embed 块更新为最新热力图 URL。
 * 如果传入页面（child_page）ID，则自动查找或创建热力图图片块。
 */
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { NOTION_API_BASE_URL, NOTION_VERSION } from "./config/constants";
import { getNotionHeaders } from "./utils/http";

dotenv.config({ path: ".env" });

interface NotionBlock {
  id: string;
  type: string;
  image?: {
    type?: string;
    external?: { url?: string };
    file?: { url?: string };
    caption?: Array<{ plain_text?: string }>;
  };
  embed?: { url?: string };
}

interface NotionChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor?: string | null;
}

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length
  );
}

function getBlockUrl(block: NotionBlock): string | undefined {
  if (block.type === "image") {
    return block.image?.external?.url || block.image?.file?.url;
  }
  if (block.type === "embed") return block.embed?.url;
  return undefined;
}

function isHeatmapBlock(block: NotionBlock): boolean {
  const url = getBlockUrl(block);
  return Boolean(url?.includes("/heatmap/weread.svg"));
}

async function updateMediaBlock(
  block: NotionBlock,
  heatmapUrl: string,
  headers: Record<string, string>
): Promise<void> {
  let body: Record<string, unknown>;
  if (block.type === "image") {
    body = {
      image: {
        type: "external",
        external: { url: heatmapUrl },
        caption: block.image?.caption || [],
      },
    };
  } else if (block.type === "embed") {
    body = { embed: { url: heatmapUrl } };
  } else {
    throw new Error(`无法更新 ${block.type} 类型的 Notion 块`);
  }

  await axios.patch(`${NOTION_API_BASE_URL}/blocks/${block.id}`, body, {
    headers,
    timeout: 20_000,
  });
}

async function findHeatmapChild(
  parentId: string,
  headers: Record<string, string>
): Promise<NotionBlock | undefined> {
  let startCursor: string | undefined;

  do {
    const response = await axios.get<NotionChildrenResponse>(
      `${NOTION_API_BASE_URL}/blocks/${parentId}/children`,
      {
        headers,
        timeout: 20_000,
        params: {
          page_size: 100,
          ...(startCursor ? { start_cursor: startCursor } : {}),
        },
      }
    );
    const heatmapBlock = response.data.results.find(isHeatmapBlock);
    if (heatmapBlock) return heatmapBlock;
    startCursor = response.data.has_more
      ? response.data.next_cursor || undefined
      : undefined;
  } while (startCursor);

  return undefined;
}

async function appendHeatmapImage(
  parentId: string,
  heatmapUrl: string,
  headers: Record<string, string>
): Promise<NotionBlock> {
  const response = await axios.patch<NotionChildrenResponse>(
    `${NOTION_API_BASE_URL}/blocks/${parentId}/children`,
    {
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
    },
    { headers, timeout: 20_000 }
  );
  const createdBlock = response.data.results[0];
  if (!createdBlock) throw new Error("Notion 没有返回新创建的图片块");
  return createdBlock;
}

async function main(): Promise<void> {
  const apiKey = process.env.NOTION_INTEGRATIONS;
  const blockId = process.env.HEATMAP_BLOCK_ID;
  const heatmapUrl = getArgument("url") || process.env.HEATMAP_URL;

  if (!apiKey) throw new Error("缺少 NOTION_INTEGRATIONS");
  if (!blockId) throw new Error("缺少 HEATMAP_BLOCK_ID");
  if (!heatmapUrl || !/^https:\/\//.test(heatmapUrl)) {
    throw new Error("缺少有效的 HTTPS 热力图地址（--url=... 或 HEATMAP_URL）");
  }

  const headers = getNotionHeaders(apiKey, NOTION_VERSION);
  const blockResponse = await axios.get(
    `${NOTION_API_BASE_URL}/blocks/${blockId}`,
    { headers, timeout: 20_000 }
  );
  const block = blockResponse.data as NotionBlock;

  if (block.type === "image" || block.type === "embed") {
    await updateMediaBlock(block, heatmapUrl, headers);
    console.log(`Notion 热力图块已更新（${block.type}）`);
  } else if (block.type === "child_page") {
    const existingBlock = await findHeatmapChild(block.id, headers);
    if (existingBlock) {
      await updateMediaBlock(existingBlock, heatmapUrl, headers);
      console.log(`已在 Notion 页面中更新热力图（${existingBlock.type}）`);
    } else {
      const createdBlock = await appendHeatmapImage(
        block.id,
        heatmapUrl,
        headers
      );
      console.log(`已在 Notion 页面中创建热力图图片块（${createdBlock.id}）`);
    }
  } else {
    throw new Error(
      `HEATMAP_BLOCK_ID 对应的是 ${
        block.type || "未知"
      } 块，请填写页面、image 或 embed 块 ID。`
    );
  }
}

main().catch((error: unknown) => {
  const axiosError = error as AxiosError<any>;
  const message =
    axiosError.response?.data?.message ||
    (error instanceof Error ? error.message : String(error));
  console.error(`更新 Notion 热力图失败：${message}`);
  process.exitCode = 1;
});
