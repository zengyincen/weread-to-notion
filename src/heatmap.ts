/**
 * 获取微信读书每日阅读时长并生成固定文件 heatmap/weread.svg。
 */
import dotenv from "dotenv";
import { promises as fs } from "fs";
import * as path from "path";
import {
  getYearlyDailyReadTimes,
  normalizeColor,
  renderHeatmapSvg,
  resolveWereadApiKey,
} from "./core/heatmap";

dotenv.config({ path: ".env" });

function currentYearInChina(): number {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();
}

function parseYear(value: string | undefined): number {
  const year = value ? Number(value) : currentYearInChina();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`YEAR 必须是 2000 到 2100 之间的整数，当前值：${value}`);
  }
  return year;
}

async function main(): Promise<void> {
  const year = parseYear(process.env.YEAR);
  const apiKey = await resolveWereadApiKey(
    process.env.WEREAD_API_KEY,
    process.env.WEREAD_COOKIE
  );
  const dailyReadTimes = await getYearlyDailyReadTimes(apiKey, year);
  const outputPath = path.resolve(
    process.cwd(),
    process.env.HEATMAP_OUTPUT || "heatmap/weread.svg"
  );
  const displayName =
    process.env.HEATMAP_NAME?.trim() || process.env.NAME?.trim() || "微信读书";
  const svg = renderHeatmapSvg(dailyReadTimes, {
    year,
    title: `${displayName} · 阅读热力图`,
    theme: {
      background: normalizeColor(process.env.HEATMAP_BACKGROUND_COLOR, "#FFFFFF"),
      empty: normalizeColor(process.env.HEATMAP_EMPTY_COLOR, "#EBEDF0"),
      low: normalizeColor(process.env.HEATMAP_LOW_COLOR, "#ACE7AE"),
      medium: normalizeColor(process.env.HEATMAP_MEDIUM_COLOR, "#69C16E"),
      high: normalizeColor(process.env.HEATMAP_HIGH_COLOR, "#549F57"),
      text: normalizeColor(process.env.HEATMAP_TEXT_COLOR, "#24292F"),
    },
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, "utf8");

  const activeDays = Object.values(dailyReadTimes).filter(
    (seconds) => seconds >= 60
  ).length;
  console.log(`已生成 ${path.relative(process.cwd(), outputPath)}`);
  console.log(`统计年份：${year}，阅读日：${activeDays}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`生成阅读热力图失败：${message}`);
  process.exitCode = 1;
});
