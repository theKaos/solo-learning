/* =========================================================
   SOLO LEARNING: JAPANISCH – Lern-Decks
   ---------------------------------------------------------
   Jedes Deck ist reine Daten – die React-App (app.js) liest
   sie nur. Ein neues Deck hinzufügen = neuen Block in
   LEARNING_DECKS eintragen, mehr ist nicht nötig (kein Build!).

   Aufbau eines Wort-Eintrags:
     jp       → das japanische Wort/Zeichen (steht auf der Karte)
     reading  → die Lesung in Romaji (Lautschrift)
     de       → die deutsche Bedeutung
     mnemonic → optionale Eselsbrücke (wird im Lern-Moment gezeigt)

   WICHTIG: Die Reihenfolge der Wörter ist die LERN-Reihenfolge –
   neue Wörter werden von oben nach unten eingeführt. Die Vokabel-
   Decks sind nach GESPRÄCHS-Nützlichkeit sortiert: Was man für ein
   einfaches japanisches Gespräch zuerst braucht, kommt zuerst.

   glyph → das Symbol des Decks auf dem Startbildschirm.

   promptType steuert, was in der Aufgabe abgefragt wird:
     "reading" → „Spiele die Karte, die man ‚ka' liest"
     "meaning" → „Spiele die Karte, die ‚Wasser' bedeutet"
   ========================================================= */

const LEARNING_DECKS = [
  {
    id: "hiragana",
    name: "Hiragana",
    subtitle: "Die Schriftzeichen lesen lernen",
    level: "Einsteiger",
    glyph: "あ",
    promptType: "reading",
    words: [
      { jp: "あ", reading: "a",   de: "a",   mnemonic: "Sieht aus wie ein Apfel mit Stiel und Blatt – a wie Apfel." },
      { jp: "い", reading: "i",   de: "i",   mnemonic: "Zwei Eiszapfen nebeneinander – i wie Eis (ii = kalt!)." },
      { jp: "う", reading: "u",   de: "u",   mnemonic: "Ein U-Boot-Periskop, das aus dem Wasser schaut." },
      { jp: "え", reading: "e",   de: "e",   mnemonic: "Ein energischer Läufer mitten im Schritt – e wie energisch." },
      { jp: "お", reading: "o",   de: "o",   mnemonic: "Ein rundes O mit einem kleinen Ohr dran." },
      { jp: "か", reading: "ka",  de: "ka",  mnemonic: "Ein Karateka beim Tritt – ka wie Karate." },
      { jp: "き", reading: "ki",  de: "ki",  mnemonic: "Ein Schlüssel (englisch „key“) – ki wie key." },
      { jp: "く", reading: "ku",  de: "ku",  mnemonic: "Ein offener Kuckucks-Schnabel – ku wie Kuckuck." },
      { jp: "け", reading: "ke",  de: "ke",  mnemonic: "Ein Kegel neben der Bahn – ke wie Kegel." },
      { jp: "こ", reading: "ko",  de: "ko",  mnemonic: "Zwei Kohle-Striche übereinander – ko wie Kohle." },
      { jp: "さ", reading: "sa",  de: "sa",  mnemonic: "Ein Samurai-Schwert mit Griff – sa wie Samurai." },
      { jp: "し", reading: "shi", de: "shi", mnemonic: "Ein Angelhaken im Wasser – shi wie fishing." },
      { jp: "す", reading: "su",  de: "su",  mnemonic: "Ein Strudel mit Schwänzchen – su wie Strudel." },
      { jp: "せ", reading: "se",  de: "se",  mnemonic: "Ein Segel im Wind – se wie Segel." },
      { jp: "そ", reading: "so",  de: "so",  mnemonic: "Ein Zickzack-Blitz – SO ein Blitz!" },
      { jp: "た", reading: "ta",  de: "ta",  mnemonic: "Links ein „t“, rechts ein „a“ – zusammen: ta!" },
      { jp: "ち", reading: "chi", de: "chi", mnemonic: "Eine gespiegelte 5 – die trickige (tricky) 5: chi." },
      { jp: "つ", reading: "tsu", de: "tsu", mnemonic: "Eine große Welle – tsu wie Tsunami." },
      { jp: "て", reading: "te",  de: "te",  mnemonic: "Ein Tisch von der Seite – te wie Tisch." },
      { jp: "と", reading: "to",  de: "to",  mnemonic: "Ein Zeh mit Splitter – to wie „toe“ (Zeh)." },
      { jp: "な", reading: "na",  de: "na",  mnemonic: "Eine Nonne kniet vor einem Kreuz – na wie Nonne." },
      { jp: "に", reading: "ni",  de: "ni",  mnemonic: "Ein Knie von der Seite – ni wie „knee“." },
      { jp: "ぬ", reading: "nu",  de: "nu",  mnemonic: "Nudeln, die sich um die Gabel wickeln – nu wie Nudeln." },
      { jp: "ね", reading: "ne",  de: "ne",  mnemonic: "Eine Katze mit eingerolltem Schwanz – „neko“ heißt Katze!" },
      { jp: "の", reading: "no",  de: "no",  mnemonic: "Ein Verbotsschild – NO! (durchgestrichener Kreis)" },
      { jp: "は", reading: "ha",  de: "ha",  mnemonic: "Ein H mit Luftballon – HAha, er fliegt weg!" },
      { jp: "ひ", reading: "hi",  de: "hi",  mnemonic: "Ein breites Grinsen – hihi!" },
      { jp: "ふ", reading: "fu",  de: "fu",  mnemonic: "Der Fuji-Vulkan mit Rauchwölkchen – fu wie Fuji." },
      { jp: "へ", reading: "he",  de: "he",  mnemonic: "Ein flacher Hügel – he, wie eben der ist!" },
      { jp: "ほ", reading: "ho",  de: "ho",  mnemonic: "Ein Segelmast mit zwei Segeln – hisst sie ho-ho-hoch!" },
      { jp: "ま", reading: "ma",  de: "ma",  mnemonic: "Mama mit Haar-Dutt unten – ma wie Mama." },
      { jp: "み", reading: "mi",  de: "mi",  mnemonic: "Eine geschwungene 21 – und „mi“ heißt auf Japanisch drei. Gemein!" },
      { jp: "む", reading: "mu",  de: "mu",  mnemonic: "Eine Kuh von vorn mit Horn – muuu!" },
      { jp: "め", reading: "me",  de: "me",  mnemonic: "Ein Auge mit Wimper – „me“ heißt Auge!" },
      { jp: "も", reading: "mo",  de: "mo",  mnemonic: "Ein Angelhaken mit zwei Würmern – fängt mo(hr) Fische." },
      { jp: "や", reading: "ya",  de: "ya",  mnemonic: "Ein Yak mit krummem Horn – ya wie Yak." },
      { jp: "ゆ", reading: "yu",  de: "yu",  mnemonic: "Ein Fisch im Aquarium von der Seite – schwimmt im U." },
      { jp: "よ", reading: "yo",  de: "yo",  mnemonic: "Ein Yo-Yo an der Schnur – yo!" },
      { jp: "ら", reading: "ra",  de: "ra",  mnemonic: "Eine startende Rakete – ra wie Rakete." },
      { jp: "り", reading: "ri",  de: "ri",  mnemonic: "Zwei Reishalme nebeneinander – ri wie Reis." },
      { jp: "る", reading: "ru",  de: "ru",  mnemonic: "Wie eine 3 MIT Schlaufe am Ende – ru (Merkhilfe: die Schlaufe rollt)." },
      { jp: "れ", reading: "re",  de: "re",  mnemonic: "Ein Läufer, der gerade losrennt – re wie rennen." },
      { jp: "ろ", reading: "ro",  de: "ro",  mnemonic: "Wie eine 3 OHNE Schlaufe – ro (Gegenstück zu る ru)." },
      { jp: "わ", reading: "wa",  de: "wa",  mnemonic: "Ein Wal mit rundem Bauch – wa wie Wal." },
      { jp: "を", reading: "wo",  de: "wo",  mnemonic: "Ein Wasserfall, der über Felsen stürzt – wo wie Wasserfall." },
      { jp: "ん", reading: "n",   de: "n",   mnemonic: "Sieht fast aus wie ein kleines geschriebenes „n“ – einfach n!" }
    ]
  },

  {
    id: "erste-gespraeche",
    name: "Erste Gespräche",
    subtitle: "Begrüßen, fragen, sich verständigen",
    level: "Grundstufe",
    glyph: "話",
    promptType: "meaning",
    words: [
      // 1. Begrüßung & Höflichkeit – das Fundament jedes Gesprächs
      { jp: "こんにちは",   reading: "konnichiwa",    de: "Hallo / Guten Tag" },
      { jp: "ありがとう",   reading: "arigatou",      de: "Danke" },
      { jp: "すみません",   reading: "sumimasen",     de: "Entschuldigung" },
      { jp: "はい",         reading: "hai",           de: "ja" },
      { jp: "いいえ",       reading: "iie",           de: "nein" },
      { jp: "おはよう",     reading: "ohayou",        de: "Guten Morgen" },
      { jp: "こんばんは",   reading: "konbanwa",      de: "Guten Abend" },
      { jp: "おねがいします", reading: "onegaishimasu", de: "bitte (um etwas bitten)" },
      { jp: "ごめんなさい", reading: "gomen nasai",   de: "Es tut mir leid" },
      { jp: "さようなら",   reading: "sayounara",     de: "Auf Wiedersehen" },
      { jp: "またね",       reading: "mata ne",       de: "Bis bald" },
      // 2. Über sich sprechen
      { jp: "わたし",       reading: "watashi",       de: "ich" },
      { jp: "あなた",       reading: "anata",         de: "du / Sie" },
      { jp: "なまえ",       reading: "namae",         de: "Name" },
      { jp: "です",         reading: "desu",          de: "bin / ist (höflich)" },
      { jp: "にほん",       reading: "nihon",         de: "Japan" },
      { jp: "にほんご",     reading: "nihongo",       de: "Japanisch (Sprache)" },
      { jp: "ドイツ",       reading: "doitsu",        de: "Deutschland" },
      { jp: "ともだち",     reading: "tomodachi",     de: "Freund / Freundin" },
      { jp: "ひと",         reading: "hito",          de: "Mensch / Person" },
      // 3. Fragen stellen – der Motor jedes Gesprächs
      { jp: "なに",         reading: "nani",          de: "was" },
      { jp: "だれ",         reading: "dare",          de: "wer" },
      { jp: "どこ",         reading: "doko",          de: "wo" },
      { jp: "いつ",         reading: "itsu",          de: "wann" },
      { jp: "どう",         reading: "dou",           de: "wie" },
      { jp: "いくら",       reading: "ikura",         de: "wie viel (Preis)" },
      { jp: "これ",         reading: "kore",          de: "das hier" },
      { jp: "それ",         reading: "sore",          de: "das da" },
      { jp: "あれ",         reading: "are",           de: "das dort" },
      // 4. Sich retten, wenn man nicht weiterkommt
      { jp: "わかります",   reading: "wakarimasu",    de: "ich verstehe" },
      { jp: "わかりません", reading: "wakarimasen",   de: "ich verstehe nicht" },
      { jp: "もういちど",   reading: "mou ichido",    de: "noch einmal" },
      { jp: "ゆっくり",     reading: "yukkuri",       de: "langsam" },
      { jp: "だいじょうぶ", reading: "daijoubu",      de: "alles in Ordnung" },
      // 5. Erste Meinungen & Gefühle
      { jp: "すき",         reading: "suki",          de: "mögen / gern haben" },
      { jp: "いい",         reading: "ii",            de: "gut" },
      { jp: "げんき",       reading: "genki",         de: "munter / gesund" },
      { jp: "おいしい",     reading: "oishii",        de: "lecker" },
      { jp: "たのしい",     reading: "tanoshii",      de: "macht Spaß" },
      { jp: "じゃあね",     reading: "jaa ne",        de: "Tschüss (locker)" }
    ]
  },

  {
    id: "alltag-vertiefen",
    name: "Alltag & Vertiefung",
    subtitle: "Verben, Orte und Smalltalk für echte Gespräche",
    level: "Fortgeschritten",
    glyph: "日",
    promptType: "meaning",
    words: [
      // 1. Die wichtigsten Verben (höfliche Form – sofort benutzbar)
      { jp: "たべます",     reading: "tabemasu",   de: "essen" },
      { jp: "のみます",     reading: "nomimasu",   de: "trinken" },
      { jp: "いきます",     reading: "ikimasu",    de: "gehen" },
      { jp: "きます",       reading: "kimasu",     de: "kommen" },
      { jp: "みます",       reading: "mimasu",     de: "sehen" },
      { jp: "ききます",     reading: "kikimasu",   de: "hören / fragen" },
      { jp: "はなします",   reading: "hanashimasu", de: "sprechen" },
      { jp: "します",       reading: "shimasu",    de: "machen / tun" },
      { jp: "あります",     reading: "arimasu",    de: "es gibt (Dinge)" },
      { jp: "います",       reading: "imasu",      de: "es gibt (Lebewesen)" },
      { jp: "ほしい",       reading: "hoshii",     de: "haben wollen" },
      // 2. Essen & Trinken – der Smalltalk-Klassiker
      { jp: "みず",         reading: "mizu",       de: "Wasser" },
      { jp: "おちゃ",       reading: "ocha",       de: "Tee" },
      { jp: "コーヒー",     reading: "koohii",     de: "Kaffee" },
      { jp: "ごはん",       reading: "gohan",      de: "Essen / Reis" },
      // 3. Zeit – für Verabredungen
      { jp: "きょう",       reading: "kyou",       de: "heute" },
      { jp: "あした",       reading: "ashita",     de: "morgen" },
      { jp: "きのう",       reading: "kinou",      de: "gestern" },
      { jp: "いま",         reading: "ima",        de: "jetzt" },
      { jp: "じかん",       reading: "jikan",      de: "Zeit" },
      { jp: "なんじ",       reading: "nanji",      de: "wie spät" },
      // 4. Orte – sich zurechtfinden
      { jp: "いえ",         reading: "ie",         de: "Haus / Zuhause" },
      { jp: "えき",         reading: "eki",        de: "Bahnhof" },
      { jp: "みせ",         reading: "mise",       de: "Geschäft / Laden" },
      { jp: "トイレ",       reading: "toire",      de: "Toilette" },
      { jp: "がっこう",     reading: "gakkou",     de: "Schule" },
      { jp: "しごと",       reading: "shigoto",    de: "Arbeit" },
      // 5. Familie – worüber man immer redet
      { jp: "かぞく",       reading: "kazoku",     de: "Familie" },
      { jp: "おかあさん",   reading: "okaasan",    de: "Mutter" },
      { jp: "おとうさん",   reading: "otousan",    de: "Vater" },
      // 6. Eigenschaften – Dinge beschreiben
      { jp: "おおきい",     reading: "ookii",      de: "groß" },
      { jp: "ちいさい",     reading: "chiisai",    de: "klein" },
      { jp: "あたらしい",   reading: "atarashii",  de: "neu" },
      { jp: "たかい",       reading: "takai",      de: "teuer / hoch" },
      { jp: "やすい",       reading: "yasui",      de: "billig" },
      { jp: "あつい",       reading: "atsui",      de: "heiß" },
      { jp: "さむい",       reading: "samui",      de: "kalt" },
      { jp: "むずかしい",   reading: "muzukashii", de: "schwierig" },
      { jp: "かんたん",     reading: "kantan",     de: "einfach" },
      { jp: "おもしろい",   reading: "omoshiroi",  de: "interessant / lustig" }
    ]
  }
];
