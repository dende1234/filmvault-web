/** Public SEO guides (/gids). Dutch first (the audience in the marketing
 * plan is NL/Vlaanderen), plus English versions of the main ones for
 * international searches; `alternate` links a guide to its translation
 * (hreflang). Only describe Filmory features that actually exist. */

export type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export type GuideLang = "nl" | "en";

export type Guide = {
  slug: string;
  lang: GuideLang;
  /** Slug of the same guide in the other language. */
  alternate?: string;
  title: string;
  description: string;
  updated: string;
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "filmcollectie-online-bijhouden",
    lang: "nl",
    alternate: "track-your-movie-collection",
    title: "Je filmcollectie online bijhouden: zo begin je",
    description:
      "Een praktische aanpak om je dvd's, Blu-rays en 4K UHD's overzichtelijk vast te leggen: van eerste film tot een collectie van honderden titels.",
    updated: "2026-10-14",
    sections: [
      {
        heading: "Waarom een overzicht van je collectie helpt",
        paragraphs: [
          "Wie een paar planken vol films heeft, kent het: je staat in de winkel en weet niet meer zeker of je die ene editie al hebt. Of je leent een film uit en weet een maand later niet meer aan wie.",
          "Een online overzicht lost dat op. Je ziet in één oogopslag wat je hebt, in welk formaat en welke editie, wat je nog niet hebt gekeken en wat er nog op je verlanglijst staat.",
        ],
      },
      {
        heading: "Begin klein: één kast tegelijk",
        paragraphs: [
          "De grootste valkuil is alles in één keer willen invoeren. Begin met één plank of één formaat, bijvoorbeeld je 4K UHD's. Zo heb je snel resultaat en houd je het vol.",
        ],
        bullets: [
          "Maak een collectie per plek of per formaat, bijvoorbeeld \"Woonkamerkast\" of \"4K UHD\".",
          "Voeg films toe op titel of met de barcode op de achterkant van de doos.",
          "Leg meteen formaat en editie vast: dat is later het lastigst om terug te vinden.",
        ],
      },
      {
        heading: "Wat je per film vastlegt",
        paragraphs: [
          "Een titel alleen is voor een verzamelaar te weinig. Dezelfde film kun je bezitten op dvd, als Blu-ray-steelbook en als 4K UHD Collector's Edition. Leg daarom per exemplaar vast welk formaat en welke editie het is.",
          "Bij series komt daar nog iets bij: welke seizoenen er in de uitgave zitten. Een losse box van seizoen 1 is een ander exemplaar dan een complete serie, en zo zie je meteen welke seizoenen je nog mist.",
          "Handig om daarnaast bij te houden: of je de film al hebt gezien, je eigen beoordeling, de staat van het exemplaar en aan wie je hem hebt uitgeleend.",
        ],
      },
      {
        heading: "Boxsets en speciale edities",
        paragraphs: [
          "Een boxset bevat meerdere films onder één barcode. Leg zo'n box vast als één geheel, zodat je collectie klopt met wat er in de kast staat en je niet per film een losse doos zoekt die niet bestaat.",
        ],
      },
      {
        heading: "Zo doe je het in Filmory",
        paragraphs: [
          "In Filmory maak je een account aan, richt je je eerste collectie in en voeg je films en series toe op titel of barcode, met formaat, editie en bij series de seizoenen. Boxsets houd je bij als één geheel, en wat je nog wilt hebben zet je op je verlanglijst.",
        ],
      },
    ],
  },
  {
    slug: "blu-ray-collectie-registreren",
    lang: "nl",
    title: "Je Blu-ray-collectie registreren zonder gedoe",
    description:
      "Zo registreer je je Blu-rays snel en netjes: barcode of titel, formaat en editie, en een indeling die blijft werken als je collectie groeit.",
    updated: "2026-10-14",
    sections: [
      {
        heading: "Barcode of titel?",
        paragraphs: [
          "De barcode (EAN) op de achterkant van een Blu-ray hoort bij één specifieke uitgave. Daarmee leg je dus niet alleen de film vast, maar precies het exemplaar dat je hebt. Zoeken op titel is sneller als je de doos niet bij de hand hebt.",
          "Een goede gewoonte: voer nieuwe aankopen in met de barcode, en gebruik de titel voor oudere films die je snel wilt toevoegen.",
        ],
      },
      {
        heading: "Blu-ray, 4K UHD en combipacks",
        paragraphs: [
          "Veel 4K UHD-uitgaven bevatten ook een gewone Blu-ray. Kies het formaat waarom je de uitgave kocht, meestal de 4K UHD. Zo blijft je telling per formaat kloppen.",
          "Series op Blu-ray komen vaak per seizoen of als complete box uit. Registreer de uitgave zoals hij in de kast staat, en leg vast welke seizoenen erin zitten.",
        ],
      },
      {
        heading: "Een indeling die meegroeit",
        paragraphs: ["Bij een paar honderd titels wordt de indeling belangrijker dan het invoeren zelf. Een paar beproefde indelingen:"],
        bullets: [
          "Per plek: handig als je films in meerdere kasten of kamers staan.",
          "Per formaat: overzichtelijk als je vooral Blu-ray en 4K UHD verzamelt.",
          "Per thema of label: voor wie bijvoorbeeld een Criterion- of Arrow-collectie opbouwt.",
        ],
      },
      {
        heading: "Controleer of je niets dubbel hebt",
        paragraphs: [
          "Een overzicht laat ook zien welke films je in meerdere edities hebt. Soms is dat bewust, soms niet. Het helpt in elk geval bij de vraag of die nieuwe steelbook echt iets toevoegt.",
        ],
      },
    ],
  },
  {
    slug: "steelbook-collectie-organiseren",
    lang: "nl",
    title: "Je steelbook-collectie organiseren",
    description:
      "Steelbooks verzamelen draait om de editie. Zo houd je overzicht over je steelbooks, limited editions en collector's editions.",
    updated: "2026-10-14",
    sections: [
      {
        heading: "Waarom steelbooks extra aandacht vragen",
        paragraphs: [
          "Bij steelbooks gaat het niet alleen om de film, maar om de uitgave: het ontwerp, de oplage en soms het land of de winkel waar hij exclusief verscheen. Twee steelbooks van dezelfde film kunnen voor een verzamelaar heel verschillend zijn.",
        ],
      },
      {
        heading: "Leg de editie altijd vast",
        paragraphs: [
          "Registreer een steelbook als aparte editie naast het formaat, bijvoorbeeld 4K UHD met de editie Steelbook. Zo zie je bij elk exemplaar welke uitgave het is, en haal je een gewone Blu-ray en een steelbook van dezelfde film nooit door elkaar.",
        ],
        bullets: [
          "Formaat: dvd, Blu-ray of 4K UHD.",
          "Editie: Steelbook, Limited Edition of Collector's Edition.",
          "Eigen notitie: bijvoorbeeld de winkel of het nummer van een genummerde oplage.",
        ],
      },
      {
        heading: "Bewaren en beschermen",
        paragraphs: [
          "Steelbooks zijn gevoelig voor deukjes en krassen. Bewaar ze rechtop en niet te strak tegen elkaar, en overweeg beschermhoesjes voor exemplaren die je in topconditie wilt houden. Leg de staat van een exemplaar vast als je hem tweedehands koopt.",
        ],
      },
      {
        heading: "Je mooiste edities laten zien",
        paragraphs: [
          "Een steelbook-collectie is er om bekeken te worden. In Filmory kun je een collectie openbaar maken via een link en zo je mooiste edities delen met andere verzamelaars, zonder dat je notities of beoordelingen zichtbaar worden.",
        ],
      },
    ],
  },
  {
    slug: "dvd-blu-ray-4k-verschillen",
    lang: "nl",
    title: "Dvd, Blu-ray en 4K UHD: de verschillen voor verzamelaars",
    description:
      "Wat is het verschil tussen dvd, Blu-ray en 4K UHD Blu-ray, en waar let je op als je fysieke films verzamelt?",
    updated: "2026-10-14",
    sections: [
      {
        heading: "Dvd",
        paragraphs: [
          "De dvd heeft standaardresolutie (576 lijnen in Europa). Het beeld is zichtbaar minder scherp op een groot scherm, maar veel films en vooral oudere series zijn alleen op dvd verschenen. Voor verzamelaars blijft de dvd daarom waardevol, zeker voor titels die nooit in hogere kwaliteit uitkwamen.",
        ],
      },
      {
        heading: "Blu-ray",
        paragraphs: [
          "Een Blu-ray biedt Full HD (1080p) en meestal betere geluidssporen dan een dvd. Het is het meest verzamelde formaat: het aanbod is groot, er zijn veel speciale edities en de prijzen zijn redelijk.",
        ],
      },
      {
        heading: "4K UHD Blu-ray",
        paragraphs: [
          "Een 4K UHD Blu-ray heeft vier keer zoveel pixels als Full HD en vaak HDR (zoals HDR10 of Dolby Vision) voor meer contrast en kleur. Je hebt er een 4K-speler en een geschikt scherm voor nodig. Veel 4K UHD-uitgaven bevatten ook een gewone Blu-ray.",
        ],
      },
      {
        heading: "Regiocodes",
        paragraphs: [
          "Dvd's en Blu-rays kunnen een regiocode hebben die bepaalt op welke spelers ze afspelen. Europa is regio 2 (dvd) en regio B (Blu-ray). 4K UHD-schijven zijn vrijwel altijd regiovrij. Let hierop als je importuitgaven koopt.",
        ],
      },
      {
        heading: "Wat betekent dit voor je collectie?",
        paragraphs: [
          "Veel verzamelaars hebben dezelfde film in meerdere formaten. Door per exemplaar het formaat vast te leggen, zie je precies welke films je al in 4K hebt en welke nog een upgrade verdienen.",
        ],
      },
    ],
  },
  {
    slug: "nooit-meer-dubbel-kopen",
    lang: "nl",
    alternate: "stop-buying-duplicate-movies",
    title: "Nooit meer een film dubbel kopen",
    description:
      "Bijna elke verzamelaar heeft het: thuiskomen met een film die al in de kast staat. Zo voorkom je het, in de winkel en als je samen koopt.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Waarom het zo vaak gebeurt",
        paragraphs: [
          "Hoe groter je collectie, hoe lastiger het wordt om alles te onthouden. Daar komen edities bij: de gewone Blu-ray, de steelbook, de 4K-versie, de Director's Cut. Je weet dat je de film hebt, maar welke versie?",
          "En koop je samen met je partner of gezin, dan weet de een niet wat de ander al heeft gekocht. Dubbele Disney-films zijn een klassieker.",
        ],
      },
      {
        heading: "Check in de winkel met de barcode",
        paragraphs: [
          "Het snelst is scannen. In Filmory open je de Winkelmodus op je telefoon en houd je de barcode op de achterkant voor de camera. Je ziet meteen een van deze antwoorden:",
        ],
        bullets: [
          "Heb je al: precies deze uitgave staat in je collectie.",
          "Andere editie in bezit: je hebt de film, maar in een andere uitgave, en je ziet welke.",
          "Op je verlanglijst: deze wilde je nog hebben (een Holy Grail valt extra op).",
          "Nieuw voor je: je hebt hem niet.",
        ],
      },
      {
        heading: "Geen barcode bij de hand?",
        paragraphs: [
          "In de kringloopwinkel of op een rommelmarkt zit er soms geen barcode op, of is hij beschadigd. Zoek dan op titel: je ziet direct of en in welke uitgave je de film al hebt.",
        ],
      },
      {
        heading: "Samen kopen: deel je collectie",
        paragraphs: [
          "Maak je collectie openbaar via een link en stuur die naar je partner. Die kan dan in de winkel zelf kijken wat er al in de kast staat, zonder account.",
        ],
      },
      {
        heading: "Tip: zet Filmory op je beginscherm",
        paragraphs: [
          "Zet Filmory op het beginscherm van je telefoon (op iPhone via Delen → Zet op beginscherm, op Android via Installeren). Dan open je de Winkelmodus met één tik, ook als je haast hebt in de winkel.",
        ],
      },
    ],
  },
  {
    slug: "filmcollectie-inboedelverzekering",
    lang: "nl",
    alternate: "movie-collection-home-insurance-list",
    title: "Je filmcollectie vastleggen voor de inboedelverzekering",
    description:
      "Bij brand, waterschade of inbraak wil je kunnen laten zien wat je had. Zo maak je een overzicht van je dvd's, Blu-rays en 4K's dat je kunt bewaren of opsturen.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Waarom een lijst zoveel scheelt",
        paragraphs: [
          "Een collectie van een paar honderd films vertegenwoordigt al snel flink wat geld, zeker met steelbooks, boutique-labels en 4K-edities. Na schade moet je kunnen aantonen wat je bezat. Uit je hoofd lukt dat niet.",
          "Vraag bij je verzekeraar na wat zij als bewijs vragen en of je collectie onder je inboedel valt. Een duidelijk overzicht helpt in elk geval.",
        ],
      },
      {
        heading: "Wat je per exemplaar vastlegt",
        paragraphs: ["Hoe specifieker, hoe beter. Leg per exemplaar vast:"],
        bullets: [
          "Titel, formaat (dvd, Blu-ray, 4K UHD) en editie (bijvoorbeeld steelbook of Collector's Edition).",
          "Barcode: daarmee is de precieze uitgave terug te vinden.",
          "Label of uitgever en de cut, bij bijzondere uitgaven.",
          "Conditie: nieuw, gebruikt of beschadigd.",
          "Een eigen foto van je exemplaar, als extra bewijs.",
        ],
      },
      {
        heading: "Een PDF maken in Filmory",
        paragraphs: [
          "Ga naar Collecties en kies Meer → Alles printen / PDF, of doe het per collectie. Kies in het printvenster \"Opslaan als PDF\". Je krijgt een lijst met cover, formaat, editie, regio, barcode, conditie en de datum van toevoegen, met bovenaan het totaal per formaat.",
          "Wil je de gegevens liever in een spreadsheet? Kies dan Exporteren: je krijgt een CSV-bestand.",
        ],
      },
      {
        heading: "Bewaar de lijst buiten je huis",
        paragraphs: [
          "Een lijst die verbrandt met je kast heb je niets aan. Bewaar de PDF in je cloudopslag of mail hem naar jezelf, en maak een nieuwe als je collectie flink gegroeid is.",
        ],
      },
    ],
  },
  {
    slug: "filmreeksen-compleet-maken",
    lang: "nl",
    title: "Filmreeksen compleet maken",
    description:
      "Twee van de drie Lord of the Rings, maar welke mist er nou? Zo houd je bij welke delen van een filmreeks je hebt en wat je nog zoekt.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Waarom reeksen lastig zijn",
        paragraphs: [
          "Bij reeksen als Harry Potter, Star Wars of Toy Story raak je snel het overzicht kwijt. Er komen nieuwe delen bij, je koopt losse delen en boxen door elkaar, en sommige delen heb je in een andere uitgave dan de rest.",
        ],
      },
      {
        heading: "Zie in één oogopslag wat je mist",
        paragraphs: [
          "In Filmory staat onder Reeksen elke filmreeks waarvan je minstens één deel hebt. Per reeks zie je hoeveel delen je hebt; ontbrekende delen zijn grijs. Alleen films die al uitgebracht zijn tellen mee, dus een aangekondigd vervolg staat er niet als \"missend\".",
          "Op de pagina van een film zie je ook bij welke reeks hij hoort en hoeveel delen je hebt.",
        ],
      },
      {
        heading: "Ontbrekende delen op je verlanglijst",
        paragraphs: [
          "Met één klik zet je alle ontbrekende delen van een reeks op je verlanglijst. Het deel dat je het liefst wilt, maak je een Holy Grail: dat valt extra op, ook in de Winkelmodus als je hem in een winkel scant.",
          "Voeg je een deel later toe aan je collectie, dan verdwijnt het vanzelf van je verlanglijst.",
        ],
      },
    ],
  },
  {
    slug: "overstappen-spreadsheet-letterboxd",
    lang: "nl",
    alternate: "import-movie-collection-spreadsheet",
    title: "Overstappen van een spreadsheet, Letterboxd of CLZ",
    description:
      "Je collectie staat al in Excel, Google Sheets, Letterboxd of een andere app? Zo zet je hem over zonder alles opnieuw in te typen.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Exporteer eerst je huidige lijst",
        paragraphs: [
          "Vrijwel elke spreadsheet of app kan een CSV-bestand maken. In Excel en Google Sheets kies je Opslaan als of Downloaden als CSV. In Letterboxd exporteer je je gegevens via de instellingen (Import & Export) en pak je het zip-bestand uit.",
        ],
      },
      {
        heading: "Importeren in Filmory",
        paragraphs: [
          "Ga naar Collecties → Importeren en upload het bestand. De kolommen worden automatisch herkend, ook als ze anders heten of in het Engels staan. Je controleert alles voordat er iets wordt toegevoegd.",
        ],
        bullets: [
          "Een titel is genoeg. Daarnaast worden onder meer jaar, barcode, formaat, editie, cut, label, regio, talen, bekeken en rating herkend.",
          "Een box in één cel, zoals \"Box • Film 1 • Film 2\", wordt ook begrepen.",
          "Uit Letterboxd gaan watched.csv, diary.csv en ratings.csv naar Bekeken, en watchlist.csv naar je verlanglijst.",
          "Download het voorbeeldbestand als je wilt zien welke kolommen werken.",
        ],
      },
      {
        heading: "Je gegevens blijven van jou",
        paragraphs: [
          "Wil je later weer weg, of een back-up maken? Met Exporteren krijg je een CSV in hetzelfde formaat als de import, dus je kunt hem altijd weer inlezen, ook elders.",
        ],
      },
    ],
  },
  {
    slug: "track-your-movie-collection",
    lang: "en",
    alternate: "filmcollectie-online-bijhouden",
    title: "How to keep track of your movie collection",
    description:
      "A practical way to catalog your DVDs, Blu-rays and 4K UHDs: from your first disc to a collection of hundreds of titles.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Why an overview helps",
        paragraphs: [
          "Once you have a few shelves of movies, you know the feeling: standing in a store, unsure whether you already own that edition. Or lending a movie and forgetting who has it a month later.",
          "An online overview solves that. You see at a glance what you own, in which format and edition, what you haven't watched yet and what's still on your wishlist.",
        ],
      },
      {
        heading: "Start small: one shelf at a time",
        paragraphs: ["The biggest trap is trying to enter everything at once. Start with one shelf or one format, such as your 4K UHDs."],
        bullets: [
          "Make a collection per place or format, like \"Living room shelf\" or \"4K UHD\".",
          "Add movies by title or by scanning the barcode on the back.",
          "Record format and edition right away; that's the hardest thing to look up later.",
        ],
      },
      {
        heading: "What to record per copy",
        paragraphs: [
          "A title alone isn't enough for a collector. You can own the same movie on DVD, as a Blu-ray steelbook and as a 4K Collector's Edition, so record format and edition per copy. For TV series, record which seasons the release contains.",
          "Useful extras: whether you've watched it, your rating, the condition, the cut (theatrical, extended, director's cut), audio and subtitle languages, and who you lent it to.",
        ],
      },
      {
        heading: "How it works in Filmory",
        paragraphs: [
          "Create a free account, set up your first collection and add movies and series by title or barcode. Barcodes are shared by the community: if one isn't known yet, Filmory suggests the movie where it can and the barcode is reviewed once, after which it works for everyone. European releases are covered best so far.",
        ],
      },
    ],
  },
  {
    slug: "stop-buying-duplicate-movies",
    lang: "en",
    alternate: "nooit-meer-dubbel-kopen",
    title: "How to stop buying movies you already own",
    description:
      "Almost every collector has come home with a movie that was already on the shelf. Here's how to avoid it, in the store and when you buy together.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Why it happens so often",
        paragraphs: [
          "The bigger your collection, the harder it is to remember everything. Then there are editions: the regular Blu-ray, the steelbook, the 4K, the director's cut. You know you own the movie, but which version?",
          "And when you buy with a partner or family, one person doesn't know what the other already bought.",
        ],
      },
      {
        heading: "Check in the store with the barcode",
        paragraphs: ["Scanning is quickest. In Filmory, open Shop mode on your phone and point the camera at the barcode. You get one of these answers:"],
        bullets: [
          "You own this: this exact release is in your collection.",
          "You own another edition: you have the movie, in another release, and you see which.",
          "On your wishlist: you wanted this one (a Holy Grail stands out).",
          "New to you: you don't own it.",
        ],
      },
      {
        heading: "No barcode at hand?",
        paragraphs: ["At a thrift store or flea market the barcode is sometimes missing or damaged. Search by title instead: you see right away whether, and in which release, you own it."],
      },
      {
        heading: "Buying together: share your collection",
        paragraphs: ["Make a collection public via a link and send it to your partner. They can check the shelf from the store, without an account."],
      },
    ],
  },
  {
    slug: "movie-collection-home-insurance-list",
    lang: "en",
    alternate: "filmcollectie-inboedelverzekering",
    title: "Documenting your movie collection for home insurance",
    description:
      "After a fire, flood or burglary you want to show what you had. Here's how to make a list of your DVDs, Blu-rays and 4Ks that you can keep or send.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Why a list makes such a difference",
        paragraphs: [
          "A few hundred movies quickly add up, especially with steelbooks, boutique labels and 4K editions. After damage you need to show what you owned, and memory won't cut it.",
          "Check with your insurer what proof they ask for and whether your collection is covered. A clear overview helps either way.",
        ],
      },
      {
        heading: "What to record per copy",
        paragraphs: ["The more specific, the better:"],
        bullets: [
          "Title, format (DVD, Blu-ray, 4K UHD) and edition (such as steelbook or Collector's Edition).",
          "Barcode: it identifies the exact release.",
          "Label and cut, for special releases.",
          "Condition: new, used or damaged.",
          "Your own photo of the copy, as extra proof.",
        ],
      },
      {
        heading: "Making a PDF in Filmory",
        paragraphs: [
          "Go to Collections and choose More → Print all / PDF, or do it per collection. In the print dialog choose \"Save as PDF\". You get a list with cover, format, edition, region, barcode, condition and date added, with totals per format at the top. Prefer a spreadsheet? Choose Export to get a CSV file.",
        ],
      },
      {
        heading: "Keep the list outside your home",
        paragraphs: ["A list that burns with your shelf is no use. Keep the PDF in cloud storage or email it to yourself, and make a new one when your collection has grown."],
      },
    ],
  },
  {
    slug: "import-movie-collection-spreadsheet",
    lang: "en",
    alternate: "overstappen-spreadsheet-letterboxd",
    title: "Moving your movie collection from a spreadsheet, Letterboxd or CLZ",
    description:
      "Your collection already lives in Excel, Google Sheets, Letterboxd or another app? Here's how to move it over without retyping everything.",
    updated: "2026-10-25",
    sections: [
      {
        heading: "Export your current list first",
        paragraphs: [
          "Almost every spreadsheet or app can make a CSV file. In Excel and Google Sheets choose Save as or Download as CSV. In Letterboxd, export your data in the settings (Import & Export) and unzip the file.",
        ],
      },
      {
        heading: "Importing into Filmory",
        paragraphs: ["Go to Collections → Import and upload the file. Columns are recognized automatically, in English or Dutch. You check everything before anything is added."],
        bullets: [
          "A title is enough. Year, barcode, format, edition, cut, label, region, languages, watched and rating are recognized too.",
          "A box set in one cell, like \"Box • Movie 1 • Movie 2\", works as well.",
          "From Letterboxd, watched.csv, diary.csv and ratings.csv go to Watched, and watchlist.csv to your wishlist.",
        ],
      },
      {
        heading: "Your data stays yours",
        paragraphs: ["Want to leave later, or make a backup? Export gives you a CSV in the same format as the import, so you can always read it back in, anywhere."],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** The labels around a guide (back link, date, call to action) per language. */
export const GUIDE_UI: Record<GuideLang, { all: string; updated: string; ctaTitle: string; ctaText: string; ctaButton: string; more: string; index: string; otherLang: string; read: string }> = {
  nl: {
    all: "Alle gidsen",
    updated: "Bijgewerkt op",
    ctaTitle: "Houd je collectie bij in Filmory",
    ctaText: "Nu gratis te gebruiken. Voeg films en series toe op titel of barcode, leg formaat en editie vast en houd je verlanglijst bij.",
    ctaButton: "Gratis beginnen",
    more: "Meer gidsen",
    index: "Gidsen",
    otherLang: "In English",
    read: "Lees de gids",
  },
  en: {
    all: "All guides",
    updated: "Updated",
    ctaTitle: "Track your collection in Filmory",
    ctaText: "Free to use right now. Add movies and series by title or barcode, record format and edition, and keep your wishlist.",
    ctaButton: "Start for free",
    more: "More guides",
    index: "Guides",
    otherLang: "In het Nederlands",
    read: "Read the guide",
  },
};
