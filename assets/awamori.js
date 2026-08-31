/* 泡盛DB — サイト共通スクリプト
   外部ライブラリ・外部APIは一切使わない（自サイト完結）。 */
(function () {
  "use strict";

  /* --- ナビ開閉 --------------------------------------------------------- */
  var burger = document.querySelector(".hd__burger");
  var nav = document.querySelector(".hd__nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* --- 年齢確認 ---------------------------------------------------------
     酒類サイトなので初回訪問時に確認する。
     localStorage は private window 等で例外を投げることがあるので必ず try/catch。 */
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* 使えなくても表示は壊さない */ }
    return null;
  }

  if (store("awamori_age_ok") !== "1") {
    var g = document.createElement("div");
    g.className = "gate";
    g.innerHTML =
      '<div class="gate__box">' +
      '<h2>あなたは20歳以上ですか？</h2>' +
      '<p>20歳未満の方の飲酒は法律で禁止されています。<br>' +
      'このサイトは酒類（泡盛）の情報を扱っています。</p>' +
      '<div class="gate__btns">' +
      '<button type="button" class="yes">はい（20歳以上）</button>' +
      '<button type="button" class="no">いいえ</button>' +
      "</div></div>";
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(g);
      g.querySelector(".yes").addEventListener("click", function () {
        store("awamori_age_ok", "1");
        g.remove();
      });
      g.querySelector(".no").addEventListener("click", function () {
        location.href = "https://www.google.com/";
      });
    });
  }

  /* --- 現在地をナビに反映 ------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
    document.querySelectorAll(".hd__nav a").forEach(function (a) {
      var p = a.getAttribute("href");
      if (!p) return;
      var t = new URL(a.href).pathname.replace(/index\.html$/, "").replace(/\/$/, "");
      if (t && t === here) a.setAttribute("aria-current", "page");
    });
  });
})();
