import fs from "fs";
import axios from "axios";

const sources = fs
  .readFileSync("./api/sources.txt", "utf-8")
  .split("\n")
  .map(i => i.trim())
  .filter(Boolean);

const groups = {
  "央视频道": [],
  "卫视频道": [],
  "体育频道": [],
  "港澳台": [],
  "4K专区": [],
  "地方频道": [],
  "备用频道": []
};

const urlSet = new Set();

function getGroup(name) {

  if (/CCTV|央视/.test(name)) {
    if (/5|体育/.test(name)) {
      return "体育频道";
    }

    if (/4K|8K/.test(name)) {
      return "4K专区";
    }

    return "央视频道";
  }

  if (/卫视/.test(name)) {
    return "卫视频道";
  }

  if (/凤凰|翡翠|TVB|澳门|港台/.test(name)) {
    return "港澳台";
  }

  if (/4K|8K|HDR|HEVC/.test(name)) {
    return "4K专区";
  }

  if (/广东|湖南|江苏|浙江|山东|河南/.test(name)) {
    return "地方频道";
  }

  return "备用频道";
}

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

function parse(text) {

  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {

    const line = lines[i].trim();

    if (!line) continue;

    if (line.includes("#EXTINF")) {

      const name =
        line.split(",").pop()?.trim() || "未知频道";

      const url = lines[i + 1]?.trim();

      if (!url) continue;

      if (urlSet.has(url)) continue;

      urlSet.add(url);

      const group = getGroup(name);

      groups[group].push({
        name,
        url
      });

    } else if (line.includes(",")) {

      const arr = line.split(",");

      if (arr.length < 2) continue;

      const name = arr[0].trim();

      const url = arr[1].trim();

      if (!url.startsWith("http")) continue;

      if (urlSet.has(url)) continue;

      urlSet.add(url);

      const group = getGroup(name);

      groups[group].push({
        name,
        url
      });
    }
  }
}

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

      m3u += `#EXTINF:-1 group-title="${group}",${item.name}\n`;
      m3u += `${item.url}\n`;
    }

    txt += "\n";
    m3u += "\n";
  }

  fs.mkdirSync("./output", {
    recursive: true
  });

  fs.writeFileSync("./output/tv.txt", txt);

  fs.writeFileSync("./output/tv.m3u", m3u);

  console.log("生成完成");
}

run();
