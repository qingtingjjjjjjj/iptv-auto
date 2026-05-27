export default {

  async fetch() {

    const url =
      "https://raw.githubusercontent.com/qingtingjjjjjjj/iptv-auto/main/output/tv.m3u";

    const res = await fetch(url);

    return new Response(await res.text(), {

      headers: {
        "content-type":
          "application/vnd.apple.mpegurl;charset=utf-8",

        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
