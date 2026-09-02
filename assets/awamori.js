/* 泡盛DB — サイト共通スクリプト
   外部ライブラリ・外部APIは一切使わない（自サイト完結）。 */
(function () {
  "use strict";

  /* --- ナビ開閉 ---------------------------------------------------------
     2026/09/02 監査での指摘に対応:
       ・開いているのか閉じているのか、ボタンの見た目で分からなかった
       ・Escape・メニュー外タップで閉じられなかった */
  var burger = document.querySelector(".hd__burger");
  var nav = document.querySelector(".hd__nav");
  if (burger && nav) {
    nav.id = nav.id || "site-nav";
    burger.setAttribute("aria-controls", nav.id);
    function setNav(open) {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.textContent = open ? "✕ 閉じる" : "☰ メニュー";
    }
    setNav(false);
    burger.addEventListener("click", function () {
      setNav(!nav.classList.contains("is-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setNav(false);
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open")
          && !nav.contains(e.target) && !burger.contains(e.target)) setNav(false);
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

  /* 2026/09/02 監査での指摘に対応:
       ・「いいえ」誤タップで確認なしに即サイト外へ飛ばされ、戻ってもまたゲート
         → 同じオーバーレイ内の案内に差し替え、「やり直す」で復帰できるようにした
       ・「はい」「いいえ」が同格・11px間隔で誤タップしやすかった
         → 「はい」を主ボタン（琥珀）、「いいえ」を弱いスタイルに（CSS側）
       ・ダイアログのARIAとフォーカスが無かった */
  if (store("awamori_age_ok") !== "1") {
    var g = document.createElement("div");
    g.className = "gate";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-labelledby", "gate-q");
    g.innerHTML =
      '<div class="gate__box">' +
      '<h2 id="gate-q">あなたは20歳以上ですか？</h2>' +
      '<p>20歳未満の方の飲酒は法律で禁止されています。<br>' +
      'このサイトは酒類（泡盛）の情報を扱っています。</p>' +
      '<div class="gate__btns">' +
      '<button type="button" class="yes">はい（20歳以上）</button>' +
      '<button type="button" class="no">いいえ</button>' +
      "</div></div>";
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(g);
      var yes = g.querySelector(".yes");
      var no = g.querySelector(".no");
      yes.focus();
      /* Tabをゲートの中に閉じる（背後のページへ移動させない） */
      g.addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;
        var f = g.querySelectorAll("button");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      });
      yes.addEventListener("click", function () {
        store("awamori_age_ok", "1");
        g.remove();
      });
      no.addEventListener("click", function () {
        var box = g.querySelector(".gate__box");
        box.innerHTML =
          '<h2>ご覧いただけません</h2>' +
          '<p>20歳未満の方はこのサイトをご覧いただけません。</p>' +
          '<div class="gate__btns">' +
          '<button type="button" class="back">まちがえた（やり直す）</button>' +
          "</div>";
        var back = box.querySelector(".back");
        back.focus();
        back.addEventListener("click", function () {
          location.reload();
        });
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

/* 計測オプトアウトの状態表示
   ?ga=off / ?ga=on で来たときだけ、効いたかどうかを画面で知らせる。
   実際の切り替えは head 内のスクリプトが gtag.js より先に済ませている。
   ここは「効いたことが社長に見える」ためだけの表示。 */
(function () {
  var s = location.search;
  if (s.indexOf('ga=off') === -1 && s.indexOf('ga=on') === -1) return;
  var off;
  try { off = localStorage.getItem('adb_noga') === '1'; } catch (e) { off = null; }
  var el = document.createElement('div');
  el.className = 'ga-note' + (off ? ' ga-note--off' : '');
  el.setAttribute('role', 'status');
  el.textContent = off === null
    ? 'このブラウザでは設定を保存できません（プライベートモードの可能性）'
    : off
      ? 'このブラウザからのアクセスを計測しません（解除は ?ga=on）'
      : 'このブラウザの計測を再開しました';
  document.body.appendChild(el);
  setTimeout(function () { el.classList.add('is-out'); }, 4200);
  setTimeout(function () { el.remove(); }, 5000);
})();
