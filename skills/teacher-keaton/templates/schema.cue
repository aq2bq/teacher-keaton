package <name>

// 構造検証のスキーマ層: 「このデータは well-formed か」
// コードが読込時に行っている検証(重複ID拒否・必須フィールド・値の範囲等)を写し取る。

// 必要なら列挙型や部分スキーマをここに定義する。
// 例: #TaskStatus: "backlog" | "active" | "done"

// 中心となるエンティティのスキーマ。
// <kind> は種別(例: "character" / "item" / "status")。
#<Concept>: {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	definition:    string @ja(定義)
	// 必要に応じて属性や関係を足す。
	// relations?: [...#Relation] @ja(関係)
	// 観測事実をどこで観測したか(監査性)。あれば用語表に根拠カラムが出る。
	// sources?: [...#Source] @ja(根拠)
}

// 根拠。観測事実の位置は自由形式(コードに行番号が無い文書・表でも使える)。
// 例: "src/task.ts:1" / "出荷規則.md §3.2" / "在庫.xlsx 'ロット状態'シート"
// #Source: {
// 	location: string @ja(位置)
// 	note?:    string @ja(注記)
// }

// 関係のスキーマ(概念同士を繋ぐ場合)。
// #Relation: {
// 	type:   "<relation-type>" @ja(関係種別)
// 	target: string            @ja(対象)
// }

// ── 測度(数値尺度) ────────────────────────────────────────────────
// 数値項目は範囲だけでは意味が決まらない。値が大きいほど良いのか悪いのかという
// 契約(極性)が別にあり、これは項目名から推定してはならない。「品質」「満足度」の
// ような肯定的な名前で「悪さ」「気になる程度」を測っていることがあるため、
// 範囲・極性・閾値・超過時の意味・根拠を一組で宣言する。
// 数値尺度を持たないシステムでは、この節ごと削除してよい。
// 使う場合は、上の #Source の定義(コメント)を有効にすること。

// 極性: 値が大きくなるほど良い状態か、悪い状態かの契約。
#Polarity:
	"higherIsBetter" | // 大きいほど良い(悪い側は小さい方)
	"lowerIsBetter" | // 小さいほど良い(悪い側は大きい方)
	"neutral" | // 良し悪しの向きを持たない(座標・設定値等)
	"unresolved" // 実コードからは向きが決まらない(TODO.mdで判断を仰ぐ)

#Measure: {
	id:            string     @ja(識別子)
	preferredName: string     @ja(名称)
	definition:    string     @ja(定義)
	unit?:         string     @ja(単位)
	polarity:      #Polarity  @ja(極性)

	// 上限・下限。片方しか無い尺度は片方だけ書く。
	// 分からない境界を埋めない(発明しない)。
	range: {
		min?: number @ja(下限)
		max?: number @ja(上限)
	} @ja(範囲)

	// 極性の根拠。名前からは推定できないので、観測した位置を1件以上残す。
	// 根拠になるもの: 閾値超過時の分岐先、警告・アラートの文言、ソート順、
	// 色分け、集計での min/max の取り方、表示ラベル。
	if polarity != "unresolved" {
		polarityEvidence: [#Source, ...#Source] @ja(極性の根拠)
	}
	// 向きが決まらない場合は発明せず、決まらない理由を残してTODO.mdへ渡す。
	if polarity == "unresolved" {
		unresolvedNote: string @ja(未確認の理由)
	}

	// 振る舞い(Quint)でこの測度を保持する変数名(あれば)。
	quintVar?: string @ja(振る舞いの変数)

	thresholds?: [...#Threshold] @ja(閾値)
	sources?: [...#Source] @ja(根拠)
}

#Threshold: {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	at:            number @ja(閾値)
	// 閾値の値そのものを「悪い側」に含めるか。
	// 「3以上は要対応」は既定(true)、「80未満は不合格」は false。
	inclusive: bool | *true @ja(閾値を含む)
	// 閾値を超えたときの意味。ここが空欄なら、その閾値はまだ理解できていない。
	meaning: string @ja(超過時の意味)
	// 超えたときに入る状態(モデルにあれば既知id)。
	entersState?: string @ja(遷移先状態)
	sources?: [...#Source] @ja(根拠)
}

// 極性から比較の向きを導出する。>= と <= を人が書き分ける箇所を作らないための型。
// 用例(positives/negatives)はこれを通して書き、極性を取り違えたら
// tools/vet が落ちるようにする(極性を荷重部材にする)。
#MeasureVerdict: {
	measure:   #Measure  @ja(測度)
	threshold: #Threshold @ja(閾値)
	value:     number     @ja(値)

	isWorseSide: bool @ja(悪い側か)
	if measure.polarity == "lowerIsBetter" {
		if threshold.inclusive {isWorseSide: value >= threshold.at}
		if !threshold.inclusive {isWorseSide: value > threshold.at}
	}
	if measure.polarity == "higherIsBetter" {
		if threshold.inclusive {isWorseSide: value <= threshold.at}
		if !threshold.inclusive {isWorseSide: value < threshold.at}
	}
	// neutral / unresolved では悪い側が決まらないため、
	// isWorseSide が具体値にならず cue vet が落ちる(意味の発明を防ぐ)。
}
