package momotaro

// 物語のイベント。イベントも概念であり、語彙の管理を受ける。
// 投影(projection.cue)のラベルは、ここに表示名を持たない。
// イベントのidから vocabulary が表示名を解決する。
events: {
	give: #Event & {
		id:            "event-give"
		preferredName: "きびだんごを与える"
		definition:    "桃太郎がきびだんごを与え、相手が仲間になる。"
	}

	depart: #Event & {
		id:            "event-depart"
		preferredName: "鬼ヶ島へ出発"
		definition:    "桃太郎が仲間を集め終え、鬼ヶ島へ出発する。"
	}
}
