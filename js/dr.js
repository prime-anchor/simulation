console.log("dr.jsを読み込みました");

// 企業は3社。この中から「既存顧客」と「新規企業」を選ぶ
var companies = ["株式会社グー", "株式会社チョキ", "株式会社パー"];

var ledger = [];            // 営業台帳（登録した企業が入っていく）
var existingIndex = 0;      // 既存顧客にした企業の番号
var existingCompany = "";   // 既存顧客
var firstCompany = "";      // 1件目に届く新規企業（3件目にもう一度届く）
var inquiryNo = 0;          // 何件目の問い合わせか
var company = "";           // いま届いている問い合わせの企業
var partner = "";           // いま届いている問い合わせのパートナー
var allowed = {             // 照合結果から決まる「いま選べる操作」
    register: false,
    handoff: false,
    merge: false
};

// 動きを抑える設定の場合、フェード演出を省略する
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $.fx.off = true;
}


// 進行バーの表示を切り替える（1：台帳づくり／2：LP公開・受付）
function setStep(n) {
    if (n === 1) {
        $("#step-1").removeClass("is-done").addClass("is-current")
            .attr("aria-current", "step");
        $("#step-1 .step-num").text("1");
        $("#step-2").removeClass("is-current is-done")
            .removeAttr("aria-current");
    } else {
        $("#step-1").removeClass("is-current").addClass("is-done")
            .removeAttr("aria-current");
        $("#step-1 .step-num").text("✓");
        $("#step-2").addClass("is-current").attr("aria-current", "step");
    }
}


// 台帳の中から企業名を探す（見つからなければ null）
function findInLedger(name) {
    var i;

    for (i = 0; i < ledger.length; i++) {
        if (ledger[i].name === name) {
            return ledger[i];
        }
    }

    return null;
}


// 台帳の中身を画面に描く（updatedName は光らせる企業）
// STEP1の大きな一覧と、STEP2の上部バー、2か所を同じデータから作る
function renderLedger(updatedName) {
    $("#ledger-list").empty();
    $("#strip-list").empty();

    $.each(ledger, function (i, row) {
        var badgeClass = "";
        var via = "";
        var viaShort = "";

        if (row.kind === "既存顧客") {
            badgeClass = "is-existing";
        } else {
            badgeClass = "is-new";
        }

        if (row.partners.length === 0) {
            via = "経由パートナー：なし";
            viaShort = "経由なし";
        } else {
            via = "経由パートナー：" + row.partners.join("、");
            viaShort = row.partners.join("、");
        }

        // STEP1：大きな一覧
        var $item = $('<li class="ledger-item"></li>');
        var $main = $('<div class="ledger-main"></div>');

        $main.append($('<span class="ledger-name"></span>').text(row.name));
        $main.append(
            $('<span class="ledger-badge"></span>')
                .addClass(badgeClass)
                .text(row.kind)
        );

        $item.append($main);
        $item.append(
            $('<p class="ledger-meta"></p>').text(via + "　／　" + row.status)
        );

        // STEP2：上部バーの小さな札
        var $chip = $('<li class="strip-item"></li>');

        $chip.append($('<span class="strip-name"></span>').text(row.name));
        $chip.append(
            $('<span class="ledger-badge"></span>')
                .addClass(badgeClass)
                .text(row.kind)
        );
        $chip.append(
            $('<span class="strip-meta"></span>')
                .text(viaShort + "／" + row.status)
        );

        if (row.name === updatedName) {
            $item.addClass("is-updated");
            $chip.addClass("is-updated");
        }

        $("#ledger-list").append($item);
        $("#strip-list").append($chip);
    });

    // 台帳が空のときだけ「まだありません」を出す
    if (ledger.length === 0) {
        $("#ledger-empty").show();
    } else {
        $("#ledger-empty").hide();
    }

    $("#ledger-count").text(ledger.length + "社");
    $("#strip-count").text(ledger.length + "社");
}


// 操作ボタン1つを「選べる／選べない」に切り替える
// enabled：選べるか　note：ボタンの下に出す一言（理由）
function setAction(action, enabled, note) {
    var $button = $('.action-button[data-action="' + action + '"]');

    allowed[action] = enabled;

    $button.prop("disabled", !enabled);
    $button.find(".action-note").text(note);
}


// 次の問い合わせに備えて、判定・操作ボタンの表示を戻す
function clearInquiryView() {
    $("#result").stop(true, true).hide().removeClass("is-ok is-ng");
    $("#actions").stop(true, true).hide();
    $("#checking").hide();

    $(".action-button").prop("disabled", false).removeClass("is-chosen");
    $(".action-note").text("");
    allowed = { register: false, handoff: false, merge: false };
    $("#action-message").removeClass("is-done").text("");

    $("#check")
        .prop("disabled", false)
        .html('バッティングを確認する <span>→</span>');
}


// 問い合わせが1件届く
function arriveInquiry() {
    inquiryNo = inquiryNo + 1;

    // 1件目：新規企業 → 2件目：既存顧客 → 3件目：1件目と同じ企業（別パートナー）
    if (inquiryNo === 1) {
        company = firstCompany;
        partner = "パートナーA";
    } else if (inquiryNo === 2) {
        company = existingCompany;
        partner = "パートナーB";
    } else {
        company = firstCompany;
        partner = "パートナーC";
    }

    console.log(
        "問い合わせ到着：" + inquiryNo + "件目",
        company,
        "（経由：" + partner + "）"
    );

    clearInquiryView();

    // 待機表示を消して、問い合わせを表示
    $("#waiting").hide();

    $("#company").text(company);
    $("#partner").text(partner);
    $("#count").text(inquiryNo + "件").addClass("has-inquiry");
    $("#inquiry").fadeIn(400);

    $("#status").text(
        "共同LPから問い合わせが" + inquiryNo + "件届きました"
    );
}


// 振り分けが終わったあとの流れ
function nextStep() {
    $("#inquiry").stop(true, true).hide();
    clearInquiryView();

    if (inquiryNo < 3) {
        // まだ問い合わせが来る
        $("#waiting-text").text("次の問い合わせを待っています");
        $("#waiting-dots").show();
        $("#waiting").show();
        $("#status").text("次の問い合わせを待っています");

        setTimeout(arriveInquiry, 1500);

    } else {
        // 3件とも終わった
        console.log("すべての問い合わせを振り分けました。台帳：" + ledger.length + "社");

        $("#waiting").hide();
        $("#status").text("すべての問い合わせを振り分けました");
        $("#finished-message").text(
            "3件の問い合わせを振り分け、営業台帳は" + ledger.length + "社になりました。"
        );
        $("#finished").fadeIn(400);
        $("#reset").show();
    }
}


// ① 営業台帳を作る（STEP1）
$("#make-ledger").on("click", function () {
    console.log("営業台帳を作るボタンをクリックしました");

    // 3社からランダムに1社を選んで、既存顧客にする
    existingIndex = Math.floor(Math.random() * 3);
    existingCompany = companies[existingIndex];
    console.log("既存顧客の番号：", existingIndex);

    // 既存顧客を1社目として、台帳に入れる
    ledger = [];
    ledger.push({
        name: existingCompany,
        kind: "既存顧客",
        partners: [],
        status: "取引中"
    });

    console.log("台帳更新：既存顧客を設定", existingCompany);
    console.log("現在の台帳：", JSON.stringify(ledger));

    $("#make-ledger")
        .prop("disabled", true)
        .text("営業台帳を作成しました");

    $("#ledger-status").text(
        "営業台帳を作成しました（既存顧客：" + existingCompany + "）"
    );

    renderLedger(existingCompany);

    // 台帳ができたので、次の工程へ進めるようにする
    $("#next-stage").fadeIn(400);
});


// ② STEP2へ進む（台帳の画面 → LP公開・受付の画面）
$("#next-stage").on("click", function () {
    console.log("STEP2へ進みます（LP公開・問い合わせ受付）");

    setStep(2);

    $("#stage1").hide();
    $("#ledger-strip").show();
    $("#stage2").fadeIn(400);

    window.scrollTo(0, 0);
});


// ③ LPを公開する（STEP2）
$("#publish").on("click", function () {
    console.log("LP公開ボタンをクリックしました");

    // 公開済みにして連打を防ぐ
    $("#publish")
        .prop("disabled", true)
        .text("公開しました");

    // CSSのクラスを付けて、LPの見た目を変える
    $("#preview").addClass("is-published");
    $("#preview-status").text("公開中");

    $("#status").text("共同LPを公開しました");
    $("#waiting-text").text("問い合わせを待っています");
    $("#waiting-dots").show();

    // 1件目に届く新規企業を決める（既存顧客ではない2社から1社）
    var newIndex = Math.floor(Math.random() * 2);   // 0 か 1

    if (newIndex >= existingIndex) {
        newIndex = newIndex + 1;                     // 既存顧客の番号を飛ばす
    }

    firstCompany = companies[newIndex];

    console.log(
        "LPを公開。届く順番：1件目 " + firstCompany +
        " → 2件目 " + existingCompany +
        " → 3件目 " + firstCompany + "（別パートナー）"
    );

    inquiryNo = 0;

    // 2秒後に1件目の問い合わせが届く
    setTimeout(arriveInquiry, 2000);
});


// ④ バッティングを確認する（営業台帳と照合する）
$("#check").on("click", function () {
    console.log("バッティング確認を開始：", company);

    $("#check")
        .prop("disabled", true)
        .text("照合中…");

    // 動くバーを表示
    $("#checking").show();

    console.log("営業台帳を照合しています（登録数：" + ledger.length + "社）");

    // 1.5秒後に判定を表示
    setTimeout(function () {

        // 台帳に同じ企業がいるか探す
        var found = findInLedger(company);

        $("#checking").hide();
        $("#check").text("照合完了");

        if (found === null) {

            // 台帳にいない → 新規企業（選べるのは新規登録だけ）
            setAction("register", true,  "台帳に追加");
            setAction("handoff", false, "既存顧客ではない");
            setAction("merge",   false, "まとめ先がない");

            $("#result").addClass("is-ok");
            $("#result-symbol").text("✓");
            $("#result-title").text("新規企業です");
            $("#result-message").text("営業台帳に、該当する企業はありません。");

            console.log("照合結果：新規企業（台帳に該当なし）", company);

        } else if (found.kind === "既存顧客") {

            // 台帳にいて、既存顧客 → 選べるのは担当者への引き継ぎだけ
            setAction("register", false, "登録済み");
            setAction("handoff", true,  "担当者に渡す");
            setAction("merge",   false, "まとめ先がない");

            $("#result").addClass("is-ng");
            $("#result-symbol").text("!");
            $("#result-title").text("既存顧客です");
            $("#result-message").text(
                "営業台帳に、既存顧客として登録されています。"
            );

            console.log("照合結果：既存顧客", company);

        } else {

            // 台帳にいて、新規登録した案件 → 選べるのは登録済み案件にまとめるだけ
            setAction("register", false, "登録済み");
            setAction("handoff", false, "既存顧客ではない");
            setAction("merge",   true,  "既存案件に追記");

            $("#result").addClass("is-ng");
            $("#result-symbol").text("!");
            $("#result-title").text("登録済みの案件です");
            $("#result-message").text(
                found.partners.join("、") + "経由で、営業台帳にすでに登録されています。" +
                "今回は" + partner + "経由の問い合わせです。"
            );

            console.log(
                "照合結果：登録済みの案件（別パートナー経由）",
                company,
                "登録済み：" + found.partners.join("、"),
                "今回：" + partner
            );

        }

        // 選べる操作が何個あるかを、ボタンの上の案内文に出す
        var choices = 0;

        if (allowed.register) {
            choices = choices + 1;
        }
        if (allowed.handoff) {
            choices = choices + 1;
        }
        if (allowed.merge) {
            choices = choices + 1;
        }

        $("#actions-label").text(
            "この問い合わせを、どう振り分けますか？（選べる操作：" + choices + "つ）"
        );

        console.log("選べる操作：", JSON.stringify(allowed));

        $("#result").fadeIn(400);
        $("#actions").fadeIn(400);

    }, 1500);
});


// ⑤ 操作ボタン（新規登録／担当者に引き継ぐ／登録済み案件にまとめる）
$(".action-button").on("click", function () {
    var action = $(this).data("action");
    var message = "";
    var row = null;

    console.log("操作ボタンをクリック：", action);

    // 選べない操作なら何もしない（ボタンは無効になっているので、通常ここには来ない）
    if (allowed[action] !== true) {
        console.log("この操作は選べません。台帳は変更しません");
        return;
    }

    // 連打を防ぐ。選んだボタンだけ色を残す
    $(".action-button").prop("disabled", true);
    $(this).addClass("is-chosen");

    if (action === "register") {

        // 新規登録：台帳に追加（次の問い合わせの照合に使われる）
        ledger.push({
            name: company,
            kind: "新規登録",
            partners: [partner],
            status: "新規登録済み"
        });

        message = company + "を、営業台帳に新規登録しました。";
        console.log("台帳更新：新規登録", company, "（経由：" + partner + "）");

    } else if (action === "handoff") {

        // 引き継ぎ：既存顧客の行に、今回のパートナーと状況を書き足す
        row = findInLedger(company);
        row.partners.push(partner);
        row.status = "担当者へ引き継ぎ済み";

        message = company + "の担当者に、引き継ぎました。";
        console.log("台帳更新：担当者へ引き継ぎ", company, "（経由：" + partner + "）");

    } else {

        // まとめる：登録済みの行に、今回のパートナーを書き足す
        row = findInLedger(company);
        row.partners.push(partner);
        row.status = row.partners.length + "件まとめ済み";

        message = company + "の登録済み案件に、まとめました。";
        console.log("台帳更新：登録済み案件にまとめる", company, "（経由：" + partner + "）");

    }

    console.log("現在の台帳：", JSON.stringify(ledger));

    renderLedger(company);
    $("#action-message").addClass("is-done").text(message);

    // 少し見せてから、次へ進む
    setTimeout(nextStep, 1800);
});


// ⑥ 最初からやり直す（STEP1に戻る）
$("#reset").on("click", function () {
    console.log("リセットを開始します");

    company = "";
    partner = "";
    existingCompany = "";
    firstCompany = "";
    inquiryNo = 0;
    ledger = [];

    // STEP2の表示を片づける
    $("#inquiry, #finished").stop(true, true).hide();
    $("#reset, #waiting-dots").hide();
    clearInquiryView();

    // 公開状態のクラスを外す
    $("#preview").removeClass("is-published");

    $("#preview-status").text("公開前");
    $("#count").text("0件").removeClass("has-inquiry");

    $("#publish")
        .prop("disabled", false)
        .html('LPを公開する <span>↗</span>');

    $("#status").text("公開の準備ができています");
    $("#waiting-text").text("まだ問い合わせはありません");
    $("#waiting").show();

    // STEP1の表示を元に戻す
    renderLedger("");

    $("#make-ledger")
        .prop("disabled", false)
        .html('営業台帳を作る <span>＋</span>');

    $("#next-stage").stop(true, true).hide();
    $("#ledger-status").text("最初に、照合のもとになる営業台帳を作ります");

    // 画面をSTEP1に切り替える
    setStep(1);
    $("#ledger-strip").hide();
    $("#stage2").stop(true, true).hide();
    $("#stage1").show();

    window.scrollTo(0, 0);

    console.log("リセット完了");
});