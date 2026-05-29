import fs from "fs";
import axios from "axios";

/* =========================
   频道映射
========================= */

const CHANNEL_MAPPING = {

  "CCTV1": [
    "CCTV1",
    "CCTV-1",
    "CCTV1综合",
    "央视1"
  ],

  "CCTV2": [
    "CCTV2",
    "CCTV-2",
    "CCTV2财经"
  ],

  "CCTV3": [
    "CCTV3",
    "CCTV-3"
  ],

  "CCTV4": [
    "CCTV4",
    "CCTV-4"
  ],

  "CCTV5": [
    "CCTV5",
    "CCTV-5",
    "央视体育"
  ],

  "CCTV5+": [
    "CCTV5+",
    "CCTV-5+",
    "赛事频道"
  ],

  "CCTV6": [
    "CCTV6",
    "CCTV-6"
  ],

  "CCTV7": [
    "CCTV7",
    "CCTV-7"
  ],

  "CCTV8": [
    "CCTV8",
    "CCTV-8"
  ],

  "CCTV9": [
    "CCTV9",
    "CCTV-9"
  ],

  "CCTV10": [
    "CCTV10",
    "CCTV-10"
  ],

  "CCTV11": [
    "CCTV11",
    "CCTV-11"
  ],

  "CCTV12": [
    "CCTV12",
    "CCTV-12"
  ],

  "CCTV13": [
    "CCTV13",
    "CCTV-13"
  ],

  "CCTV14": [
    "CCTV14",
    "CCTV-14"
  ],

  "CCTV15": [
    "CCTV15",
    "CCTV-15"
  ],

  "CCTV16": [
    "CCTV16",
    "CCTV-16"
  ],

  "CCTV17": [
    "CCTV17",
    "CCTV-17"
  ],

  "湖南卫视": [
    "湖南卫视"
  ],

  "浙江卫视": [
    "浙江卫视"
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
    "凤凰中文"
  ],

  "凤凰资讯": [
    "凤凰资讯"
  ],

  "翡翠台": [
    "翡翠台"
  ]
};

/* =========================
   分类
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
    "CCTV17"
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

  "港澳台": [
    "凤凰中文",
    "凤凰资讯",
    "翡翠台"
  ]
};

/* =========================
   初始化
========================= */

const groups = {};

const urlSet = new Set();

const MAX_CHECK = 3000;

const sources = fs
  .readFileSync("./api/sources.txt", "utf-8")
  .split("\n")
  .map(i => i.trim())
  .filter(Boolean);

/* =========================
   标准化频道名
========================= */

function normalizeChannelName(name) {

  if (!name) {
    return "未知频道";
  }

  name = name
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(
      /高清|超清|HD|HEVC|H265|HDR|4K/gi,
      ""
    )
    .replace(/\s+/g, "")
    .trim();

  for (const standard in CHANNEL_MAPPING) {

    const aliases =
      CHANNEL_MAPPING[standard];

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
   获取分组
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
   排序
========================= */

function getChannelOrder(name) {

  if (name.includes("CCTV5+")) {
    return 5.5;
  }

  const cctvMatch =
    name.match(/CCTV(\d+)/);

  if (cctvMatch) {

    return parseInt(
      cctvMatch[1]
    );
  }

  return 9999;
}

/* =========================
   下载接口
========================= */

async function loadUrl(url) {

  try {

    const { data } =
      await axios.get(url, {
        timeout: 10000
      });

    return data;

  } catch {

    console.log(
      "抓取失败:",
      url
    );

    return "";
  }
}

/* =========================
   极速测速
========================= */

async function checkStream(url) {

  const start =
    Date.now();

  try {

    await axios({

      url,

      method: "HEAD",

      timeout: 3000,

      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

    return {
      ok: true,
      speed:
        Date.now() - start
    };

  } catch {

    return {
      ok: false,
      speed: 99999
    };
  }
}

/* =========================
   添加频道
========================= */

function addChannel(
  name,
  url,
  speed,
  customGroup = null
) {

  if (
    !url.startsWith("http")
  ) {
    return;
  }

  if (
    urlSet.has(url)
  ) {
    return;
  }

  urlSet.add(url);

  const group =
    customGroup ||
    getGroup(name);

  if (!groups[group]) {
    groups[group] = [];
  }

  groups[group].push({

    name,

    url,

    speed
  });
}

/* =========================
   解析公开源
========================= */

async function parse(text) {

  const lines =
    text.split("\n");

  const tasks = [];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    if (
      tasks.length >=
      MAX_CHECK
    ) {
      break;
    }

    const line =
      lines[i].trim();

    if (!line) {
      continue;
    }

    let rawName = "";
    let url = "";

    if (
      line.includes(
        "#EXTINF"
      )
    ) {

      rawName =
        line
          .split(",")
          .pop()
          ?.trim();

      url =
        lines[
          i + 1
        ]?.trim();
    }

    else if (
      line.includes(",")
    ) {

      const arr =
        line.split(",");

      if (
        arr.length < 2
      ) {
        continue;
      }

      rawName =
        arr[0].trim();

      url =
        arr[1].trim();
    }

    if (!url) {
      continue;
    }

    const name =
      normalizeChannelName(
        rawName
      );

    tasks.push(
      async () => {

        const result =
          await checkStream(
            url
          );

        if (
          !result.ok
        ) {
          return;
        }

        addChannel(
          name,
          url,
          result.speed
        );
      }
    );
  }

  /* 并发测速 */

  const batch = 200;

  for (
    let i = 0;
    i < tasks.length;
    i += batch
  ) {

    const chunk =
      tasks.slice(
        i,
        i + batch
      );

    await Promise.all(
      chunk.map(
        fn => fn()
      )
    );

    console.log(
      "完成 " +
      Math.min(
        i + batch,
        tasks.length
      ) +
      "/" +
      tasks.length
    );
  }
}

/* =========================
   自定义源
========================= */

function loadCustomSources() {

  if (
    !fs.existsSync(
      "./config/custom.txt"
    )
  ) {
    return;
  }

  console.log(
    "加载自定义源"
  );

  const text =
    fs.readFileSync(
      "./config/custom.txt",
      "utf-8"
    );

  const lines =
    text.split("\n");

  let currentGroup =
    "自定义频道";

  for (const line of lines) {

    const text =
      line.trim();

    if (!text) {
      continue;
    }

    /* 分组 */

    if (
      text.includes(
        "#genre#"
      )
    ) {

      currentGroup =
        text
          .split(",")[0]
          .trim();

      if (
        !groups[currentGroup]
      ) {
        groups[currentGroup] = [];
      }

      continue;
    }

    /* 频道 */

    if (
      text.includes(",")
    ) {

      const arr =
        text.split(",");

      if (arr.length < 2) {
        continue;
      }

      const name =
        arr[0].trim();

      const url =
        arr[1].trim();

      addChannel(
        name,
        url,
        0,
        currentGroup
      );
    }
  }
}

/* =========================
   主程序
========================= */

async function run() {

  for (const url of sources) {

    console.log(
      "抓取:",
      url
    );

    const text =
      await loadUrl(url);

    await parse(text);
  }

  /* 自定义源 */

  loadCustomSources();

  /* 排序 */

  for (const group in groups) {

    groups[group].sort(
      (a, b) => {

        const orderA =
          getChannelOrder(
            a.name
          );

        const orderB =
          getChannelOrder(
            b.name
          );

        if (
          orderA !== orderB
        ) {
          return (
            orderA -
            orderB
          );
        }

        return (
          a.speed -
          b.speed
        );
      }
    );
  }

  /* 输出 */

  let txt = "";

  let m3u =
    "#EXTM3U\n\n";

  for (const group in groups) {

    txt +=
      `${group},#genre#\n`;

    for (const item of groups[group]) {

      txt +=
        `${item.name},${item.url}\n`;

      m3u +=
        `#EXTINF:-1 group-title="${group}",${item.name}\n`;

      m3u +=
        `${item.url}\n`;
    }

    txt += "\n";

    m3u += "\n";
  }

  fs.mkdirSync(
    "./output",
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    "./output/tv.txt",
    txt
  );

  fs.writeFileSync(
    "./output/tv.m3u",
    m3u
  );

  console.log(
    "生成完成"
  );
}

run();

