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

  /* --- 銘柄ページの固定CTAバー ------------------------------------------
     最初の購入ボックス（#buy）が画面の上に流れたら下端にバーを出す。
     まだ買う気を測っていない冒頭では出さない（うるさいだけ）。 */
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".ctabar");
    var buyEl = document.getElementById("buy");
    if (!bar || !buyEl || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) {
      var e = es[0];
      /* #buy が視界の上に消えたときだけ出す（下にあるうちは出さない） */
      bar.hidden = !(e.boundingClientRect.bottom < 0 && !e.isIntersecting);
    }).observe(buyEl);
  });

  /* --- ふるさと納税：ポータルで絞り込む --------------------------------------
     2026/09/03 社長「ふるさと納税のサイトごとに絞れたらいいね」。
     仕組み：[data-p="choice aupay …"] を持つ要素（品・ポータルのボタン）のうち、
     選んだキーを含まないものを hidden にする。一覧ページでは行ごとの品数
     （data-n-<key>）で行の表示と「N品を確認」「全N品を見る」を差し替え、
     蔵ごとの箇条書きは先頭 data-limit 品だけ見せる。?portal=rakuten で直リンク可。 */
  document.addEventListener("DOMContentLoaded", function () {
    var box = document.querySelector("[data-fportal]");
    if (!box) return;
    var chips = Array.prototype.slice.call(box.querySelectorAll(".chip[data-key]"));
    var keys = chips.map(function (c) { return c.getAttribute("data-key"); });

    function has(el, key) {
      return key === "all" || (" " + (el.getAttribute("data-p") || "") + " ").indexOf(" " + key + " ") > -1;
    }
    function apply(key, push) {
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-key") === key ? "true" : "false");
      });
      /* 隠したリンクの直後の「PR」印も一緒に隠す（印だけが残っていた） */
      function hideWithPr(el, hide) {
        el.hidden = hide;
        var sup = el.nextElementSibling;
        if (sup && sup.classList && sup.classList.contains("prsup")) sup.hidden = hide;
      }
      document.querySelectorAll("[data-p]").forEach(function (el) { hideWithPr(el, !has(el, key)); });
      /* 品ごとのポータルのリンクも、選んだポータルだけにする（押す先が迷わない） */
      document.querySelectorAll("[data-pk]").forEach(function (a) {
        hideWithPr(a, key !== "all" && a.getAttribute("data-pk") !== key);
      });
      /* 箇条書きは先頭 N 品まで */
      document.querySelectorAll("[data-flist]").forEach(function (ul) {
        var lim = parseInt(ul.getAttribute("data-limit"), 10) || 5, n = 0;
        ul.querySelectorAll("li").forEach(function (li) {
          if (li.hidden) return;
          n++;
          if (n > lim) li.hidden = true;
        });
        ul.setAttribute("data-shown", n > lim ? lim : n);
      });
      /* 一覧の行：そのポータルの品数で表示・件数を切り替える */
      document.querySelectorAll("tr[data-n-all]").forEach(function (tr) {
        var n = parseInt(tr.getAttribute("data-n-" + key), 10) || 0;
        tr.hidden = n === 0;
        var sub = tr.querySelector("[data-count]");
        if (sub) sub.textContent = n + "品を確認";
        var more = tr.querySelector("[data-more]");
        var ul = tr.querySelector("[data-flist]");
        if (more) {
          var shown = ul ? parseInt(ul.getAttribute("data-shown"), 10) || 0 : 0;
          more.textContent = "全" + n + "品を見る →";
          more.hidden = n <= shown;
        }
      });
      document.querySelectorAll("[data-fsec]").forEach(function (sec) {
        var any = Array.prototype.some.call(sec.querySelectorAll("tr[data-n-all]"), function (tr) { return !tr.hidden; });
        sec.hidden = !any;
      });
      var empty = document.querySelector(".fempty");
      if (empty) {
        empty.hidden = Array.prototype.some.call(document.querySelectorAll("[data-fsec]"), function (s) { return !s.hidden; })
          || !document.querySelector("[data-fsec]");
      }
      if (push) {
        try {
          var u = new URL(location.href);
          if (key === "all") u.searchParams.delete("portal"); else u.searchParams.set("portal", key);
          history.replaceState(null, "", u.toString());
        } catch (e) {}
      }
    }
    chips.forEach(function (c) {
      c.addEventListener("click", function () { apply(c.getAttribute("data-key"), true); });
    });
    var init = "all";
    try { init = new URLSearchParams(location.search).get("portal") || "all"; } catch (e) {}
    if (keys.indexOf(init) === -1) init = "all";
    apply(init, false);
  });

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
