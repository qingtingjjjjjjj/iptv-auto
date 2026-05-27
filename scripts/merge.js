import fs from "fs";
import axios from "axios";

/* =========================
   频道别名映射
========================= */

const CHANNEL_MAPPING = {

  "CCTV1": [
    "CCTV1",
    "CCTV-1",
    "CCTV1综合",
    "CCTV-1综合",
    "央视1",
    "央视综合"
  ],

  "CCTV2": [
    "CCTV2",
    "CCTV-2",
    "CCTV2财经",
    "央视财经"
  ],

  "CCTV3": [
    "CCTV3",
    "CCTV-3",
    "综艺频道"
  ],

  "CCTV4": [
    "CCTV4",
    "CCTV-4",
    "中文国际"
  ],

  "CCTV5": [
    "CCTV5",
    "CCTV-5",
    "CCTV体育",
    "央视体育",
    "CCTV5HD"
  ],

  "CCTV5+": [
    "CCTV5+",
    "CCTV-5+",
    "赛事频道"
  ],

  "CCTV6": [
    "CCTV6",
    "CCTV-6",
    "电影频道"
  ],

  "CCTV8": [
    "CCTV8",
    "CCTV-8",
    "电视剧频道"
  ],

  "湖南卫视": [
    "湖南卫视",
    "湖南卫视HD",
    "HNWS"
  ],

  "浙江卫视": [
    "浙江卫视",
    "浙江卫视HD"
  ],

  "江苏卫视": [
    "江苏卫视"
  ],

  "东方卫视": [
    "东方卫视"
  ],

  "北京卫视": [
    "北京卫视"
  ],

  "广东卫视": [
    "广东卫视"
  ],

  "深圳卫视": [
    "深圳卫视"
  ],

  "凤凰中文": [
    "凤凰中文",
    "凤凰中文台"
  ],

  "凤凰资讯": [
    "凤凰资讯",
    "凤凰资讯台"
  ],

  "翡翠台": [
    "翡翠台",
    "TVB翡翠台"
  ]
};

/* =========================
   频道分类
========================= */

const CHANNEL_CATEGORIES = {

  "央视频道": [
    "CCTV1",
    "CCTV2",
    "CCTV3",
    "CCTV4",
    "CCTV5",
    "CCTV5+",
    "CCTV6",
    "CCTV7",
    "CCTV8",
    "CCTV9",
    "CCTV10",
    "CCTV11",
    "CCTV12",
    "CCTV13",
    "CCTV14",
    "CCTV15",
    "CCTV16",
    "CCTV17",
    "CCTV4K",
    "CCTV8K"
  ],

  "卫视频道": [
    "湖南卫视",
    "浙江卫视",
    "江苏卫视",
    "东方卫视",
    "北京卫视",
    "广东卫视",
    "深圳卫视"
  ],

  "体育频道": [
    "CCTV5",
    "CCTV5+"
  ],

  "港澳台": [
    "凤凰中文",
    "凤凰资讯",
    "翡翠台"
  ]
};

/* =========================
   标准化频道名
========================= */

function normalizeChannelName(name) {

  if (!name) return "未知频道";

  name = name
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/高清|超清|HD|HEVC|H265|HDR|4K/gi, "")
    .replace(/\s+/g, "")
    .trim();

  for (const standard in CHANNEL_MAPPING) {

    const aliases = CHANNEL_MAPPING[standard];

    if (
      aliases.some(alias =>
        name.includes(alias)
      )
    ) {
      return standard;
    }
  }

  return name;
}

/* =========================
   分类
========================= */

function getGroup(name) {

  for (const group in CHANNEL_CATEGORIES) {

    if (
      CHANNEL_CATEGORIES[group]
      .includes(name)
    ) {
      return group;
    }
  }

  if (/卫视/.test(name)) {
    return "卫视频道";
  }

  if (/CCTV/.test(name)) {
    return "央视频道";
  }

  if (/凤凰|TVB|翡翠/.test(name)) {
    return "港澳台";
  }

  return "其他频道";
}

/* =========================
   初始化
========================= */

const groups = {};

const urlSet = new Set();

const sources = fs
  .readFileSync("./api/sources.txt", "utf-8")
  .split("\n")
  .map(i => i.trim())
  .filter(Boolean);

/* =========================
   下载接口
========================= */

async function loadUrl(url) {

  try {

    const { data } = await axios.get(url, {
      timeout: 15000
    });

    return data;

  } catch (e) {

    console.log("失败:", url);

    return "";
  }
}

/* =========================
   添加频道
========================= */

function addChannel(name, url) {

  if (!url.startsWith("http")) {
    return;
  }

  if (urlSet.has(url)) {
    return;
  }

  urlSet.add(url);

  const group = getGroup(name);

  if (!groups[group]) {
    groups[group] = [];
  }

  groups[group].push({
    name,
    url
  });
}

/* =========================
   解析 TXT / M3U
========================= */

function parse(text) {

  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {

    const line = lines[i].trim();

    if (!line) continue;

    /* m3u */

    if (line.includes("#EXTINF")) {

      const rawName =
        line.split(",").pop()?.trim();

      const name =
        normalizeChannelName(rawName);

      const url = lines[i + 1]?.trim();

      if (!url) continue;

      addChannel(name, url);
    }

    /* txt */

    else if (line.includes(",")) {

      const arr = line.split(",");

      if (arr.length < 2) continue;

      const rawName = arr[0].trim();

      const name =
        normalizeChannelName(rawName);

      const url = arr[1].trim();

      addChannel(name, url);
    }
  }
}

/* =========================
   输出
========================= */

async function run() {

  for (const url of sources) {

    console.log("抓取:", url);

    const text = await loadUrl(url);

    parse(text);
  }

  let txt = "";

  let m3u = "#EXTM3U\n\n";

  for (const group in groups) {

    txt += `${group},#genre#\n`;

    for (const item of groups[group]) {

      txt += `${item.name},${item.url}\n`;

      m3u +=
        `#EXTINF:-1 group-title="${group}",${item.name}\n`;

      m3u += `${item.url}\n`;
    }

    txt += "\n";
    m3u += "\n";
  }

  fs.mkdirSync("./output", {
    recursive: true
  });

  fs.writeFileSync(
    "./output/tv.txt",
    txt
  );

  fs.writeFileSync(
    "./output/tv.m3u",
    m3u
  );

  console.log("生成完成");
}

run();
