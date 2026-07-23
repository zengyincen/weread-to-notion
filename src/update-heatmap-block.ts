/**
 * 将 Notion 中已有的 image/embed 块更新为最新热力图 URL。
 */
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { NOTION_API_BASE_URL, NOTION_VERSION } from "./config/constants";
import { getNotionHeaders } from "./utils/http";

dotenv.config({ path: ".env" });

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length
  );
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
  const block = blockResponse.data;
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
    throw new Error(
      `HEATMAP_BLOCK_ID 对应的是 ${block.type || "未知"} 块，请在 Notion 中先创建 image 或 embed 块。`
    );
  }

  await axios.patch(`${NOTION_API_BASE_URL}/blocks/${blockId}`, body, {
    headers,
    timeout: 20_000,
  });
  console.log(`Notion 热力图块已更新（${block.type}）`);
}

main().catch((error: unknown) => {
  const axiosError = error as AxiosError<any>;
  const message =
    axiosError.response?.data?.message ||
    (error instanceof Error ? error.message : String(error));
  console.error(`更新 Notion 热力图失败：${message}`);
  process.exitCode = 1;
});
