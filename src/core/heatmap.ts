import axios, { AxiosError } from "axios";
import { getHeaders } from "../utils/http";

const WEREAD_API_KEY_URL = "https://weread.qq.com/api/skills/apikeyGet";
const WEREAD_AGENT_GATEWAY = "https://i.weread.qq.com/api/agent/gateway";
const DEFAULT_SKILL_VERSION = "1.0.3";
const CHINA_TIME_OFFSET_SECONDS = 8 * 60 * 60;

export interface ReadingStatsResponse {
  errcode?: number;
  errCode?: number;
  errmsg?: string;
  errMsg?: string;
  upgrade_info?: {
    message?: string;
  };
  readTimes?: Record<string, number>;
  dailyReadTimes?: Record<string, number>;
}

export interface HeatmapTheme {
  background: string;
  empty: string;
  low: string;
  medium: string;
  high: string;
  text: string;
}

export interface HeatmapOptions {
  year: number;
  title: string;
  theme: HeatmapTheme;
  lowThresholdMinutes?: number;
  mediumThresholdMinutes?: number;
}

function getApiError(data: ReadingStatsResponse): string | undefined {
  const code = data.errcode ?? data.errCode;
  if (code === undefined || code === 0) return undefined;
  return `${code}: ${data.errmsg || data.errMsg || "未知错误"}`;
}

/**
 * 优先使用显式配置的官方 API Key；未配置时尝试用现有网页登录 Cookie 获取。
 */
export async function resolveWereadApiKey(
  explicitApiKey?: string,
  cookie?: string
): Promise<string> {
  if (explicitApiKey?.trim()) {
    return explicitApiKey.trim();
  }

  if (!cookie?.trim()) {
    throw new Error(
      "缺少微信读书认证。请配置 WEREAD_API_KEY，或保留可用的 WEREAD_COOKIE 以自动获取 API Key。"
    );
  }

  try {
    const response = await axios.get(WEREAD_API_KEY_URL, {
      headers: getHeaders(cookie),
      timeout: 20_000,
    });
    const apiKey = response.data?.apikey;
    if (typeof apiKey === "string" && apiKey.startsWith("wrk-")) {
      console.log("已通过 WEREAD_COOKIE 获取微信读书官方 API Key");
      return apiKey;
    }

    throw new Error(response.data?.errmsg || "响应中没有 apikey");
  } catch (error: unknown) {
    const axiosError = error as AxiosError<any>;
    const detail =
      axiosError.response?.data?.errmsg ||
      axiosError.response?.data?.errMsg ||
      axiosError.message;
    throw new Error(
      `无法通过 WEREAD_COOKIE 获取官方 API Key：${detail}。请更新 Cookie，或在仓库 Secret 中配置 WEREAD_API_KEY（获取地址：https://weread.qq.com/r/weread-skills）。`
    );
  }
}

async function fetchReadingStats(
  apiKey: string,
  mode: "annually" | "monthly",
  baseTime: number,
  skillVersion = process.env.WEREAD_SKILL_VERSION || DEFAULT_SKILL_VERSION
): Promise<ReadingStatsResponse> {
  const response = await axios.post<ReadingStatsResponse>(
    WEREAD_AGENT_GATEWAY,
    {
      api_name: "/readdata/detail",
      skill_version: skillVersion,
      mode,
      baseTime,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const apiError = getApiError(response.data);
  if (apiError) {
    const upgradeMessage = response.data.upgrade_info?.message;
    throw new Error(
      `微信读书阅读统计接口返回错误 ${apiError}${
        upgradeMessage ? `；${upgradeMessage}` : ""
      }`
    );
  }

  return response.data;
}

function timestampForMonth(year: number, monthIndex: number): number {
  // 取每月 15 日中午，避免服务端按时区归一化时跨月。
  return Math.floor(Date.UTC(year, monthIndex, 15, 4, 0, 0) / 1000);
}

export function timestampToChinaDate(rawTimestamp: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawTimestamp)) {
    return rawTimestamp;
  }

  let timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp)) return undefined;
  if (timestamp > 10_000_000_000) timestamp = Math.floor(timestamp / 1000);

  return new Date((timestamp + CHINA_TIME_OFFSET_SECONDS) * 1000)
    .toISOString()
    .slice(0, 10);
}

export function normalizeDailyReadTimes(
  source: Record<string, number> | undefined,
  year: number
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!source) return result;

  for (const [timestamp, rawSeconds] of Object.entries(source)) {
    const date = timestampToChinaDate(timestamp);
    const seconds = Number(rawSeconds);
    if (!date?.startsWith(`${year}-`) || !Number.isFinite(seconds)) continue;
    result[date] = (result[date] || 0) + Math.max(0, seconds);
  }

  return result;
}

/**
 * 获取某一自然年的每日阅读时长。年度接口优先；若未返回日级明细，则按月补齐。
 */
export async function getYearlyDailyReadTimes(
  apiKey: string,
  year: number
): Promise<Record<string, number>> {
  const annual = await fetchReadingStats(
    apiKey,
    "annually",
    timestampForMonth(year, 0)
  );
  const annualDaily = normalizeDailyReadTimes(annual.dailyReadTimes, year);
  if (Object.keys(annualDaily).length > 0) {
    return annualDaily;
  }

  console.log("年度接口未返回日级明细，改为按月获取阅读时长");
  const nowInChina = new Date(
    Date.now() + CHINA_TIME_OFFSET_SECONDS * 1000
  );
  const currentYear = nowInChina.getUTCFullYear();
  const monthCount =
    year < currentYear
      ? 12
      : year === currentYear
      ? nowInChina.getUTCMonth() + 1
      : 0;

  if (monthCount === 0) {
    return {};
  }

  const monthlyResults: ReadingStatsResponse[] = [];
  for (let monthIndex = 0; monthIndex < monthCount; monthIndex += 1) {
    monthlyResults.push(
      await fetchReadingStats(
        apiKey,
        "monthly",
        timestampForMonth(year, monthIndex)
      )
    );
  }

  return monthlyResults.reduce<Record<string, number>>((result, monthly) => {
    const days = normalizeDailyReadTimes(
      monthly.dailyReadTimes || monthly.readTimes,
      year
    );
    for (const [date, seconds] of Object.entries(days)) {
      result[date] = (result[date] || 0) + seconds;
    }
    return result;
  }, {});
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

export function normalizeColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} 小时${remainder ? ` ${remainder} 分钟` : ""}`;
}

function getLevel(
  seconds: number,
  lowThresholdMinutes: number,
  mediumThresholdMinutes: number
): 0 | 1 | 2 | 3 {
  if (seconds <= 0) return 0;
  const minutes = seconds / 60;
  if (minutes <= lowThresholdMinutes) return 1;
  if (minutes <= mediumThresholdMinutes) return 2;
  return 3;
}

export function renderHeatmapSvg(
  dailyReadTimes: Record<string, number>,
  options: HeatmapOptions
): string {
  const { year, title, theme } = options;
  const lowThresholdMinutes = options.lowThresholdMinutes ?? 15;
  const mediumThresholdMinutes = options.mediumThresholdMinutes ?? 60;
  const cellSize = 12;
  const gap = 3;
  const left = 46;
  const top = 72;
  const bottom = 34;
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const lastDay = new Date(Date.UTC(year, 11, 31));
  const dayCount =
    Math.floor((lastDay.getTime() - firstDay.getTime()) / 86_400_000) + 1;
  const weekCount = Math.ceil((firstDay.getUTCDay() + dayCount) / 7);
  const width = left + weekCount * (cellSize + gap) + 24;
  const height = top + 7 * (cellSize + gap) + bottom;
  const totalSeconds = Object.values(dailyReadTimes).reduce(
    (sum, seconds) => sum + seconds,
    0
  );
  const activeDays = Object.values(dailyReadTimes).filter(
    (seconds) => seconds >= 60
  ).length;
  const colors = [theme.empty, theme.low, theme.medium, theme.high];

  const monthLabels: string[] = [];
  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];
  for (let month = 0; month < 12; month += 1) {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const offset = Math.floor(
      (monthStart.getTime() - firstDay.getTime()) / 86_400_000
    );
    const week = Math.floor((firstDay.getUTCDay() + offset) / 7);
    monthLabels.push(
      `<text x="${left + week * (cellSize + gap)}" y="58">${
        monthNames[month]
      }</text>`
    );
  }

  const cells: string[] = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = new Date(firstDay.getTime() + offset * 86_400_000);
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    const week = Math.floor((firstDay.getUTCDay() + offset) / 7);
    const seconds = dailyReadTimes[dateKey] || 0;
    const level = getLevel(
      seconds,
      lowThresholdMinutes,
      mediumThresholdMinutes
    );
    const tooltip = `${dateKey} · ${formatDuration(seconds)}`;
    cells.push(
      `<rect x="${left + week * (cellSize + gap)}" y="${
        top + weekday * (cellSize + gap)
      }" width="${cellSize}" height="${cellSize}" rx="2" fill="${
        colors[level]
      }"><title>${escapeXml(tooltip)}</title></rect>`
    );
  }

  const legendX = width - 146;
  const legend = colors
    .map(
      (color, index) =>
        `<rect x="${legendX + index * 17}" y="${
          height - 22
        }" width="12" height="12" rx="2" fill="${color}"/>`
    )
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="description">${year} 年阅读时长热力图，共 ${activeDays} 个阅读日，累计 ${escapeXml(
      formatDuration(totalSeconds)
    )}</desc>`,
    `<rect width="100%" height="100%" rx="10" fill="${theme.background}"/>`,
    `<g fill="${theme.text}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif">`,
    `<text x="18" y="28" font-size="16" font-weight="600">${escapeXml(
      title
    )}</text>`,
    `<text x="18" y="47" font-size="11" opacity="0.72">${year} · ${activeDays} 个阅读日 · ${escapeXml(
      formatDuration(totalSeconds)
    )}</text>`,
    `<g font-size="10" opacity="0.72">${monthLabels.join("")}</g>`,
    `<g font-size="10" opacity="0.72"><text x="18" y="${
      top + 1 * (cellSize + gap) + 10
    }">一</text><text x="18" y="${
      top + 3 * (cellSize + gap) + 10
    }">三</text><text x="18" y="${
      top + 5 * (cellSize + gap) + 10
    }">五</text></g>`,
    "</g>",
    `<g>${cells.join("")}</g>`,
    `<g fill="${theme.text}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif" font-size="10" opacity="0.72"><text x="${
      legendX - 24
    }" y="${height - 12}">少</text>${legend}<text x="${
      legendX + 73
    }" y="${height - 12}">多</text></g>`,
    "</svg>",
    "",
  ].join("\n");
}
