/** Public SEO guides (/gids). Dutch only on purpose: the audience in the
 * marketing plan is NL/Vlaanderen, and these pages target Dutch searches.
 * Content is a first draft — review before relying on it. Only describe
 * Filmory features that actually exist. */

export type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export type Guide = {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "filmcollectie-online-bijhouden",
    title: "Je filmcollectie online bijhouden: zo begin je",
    description:
      "Een praktische aanpak om je dvd's, Blu-rays en 4K UHD's overzichtelijk vast te leggen: van eerste film tot een collectie van honderden titels.",
    updated: "2026-10-10",
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
          "In Filmory maak je gratis een account aan, richt je je eerste collectie in en voeg je films toe op titel of barcode, met formaat en editie. Boxsets houd je bij als één geheel, en films die je nog wilt hebben zet je op je verlanglijst.",
        ],
      },
    ],
  },
  {
    slug: "blu-ray-collectie-registreren",
    title: "Je Blu-ray-collectie registreren zonder gedoe",
    description:
      "Zo registreer je je Blu-rays snel en netjes: barcode of titel, formaat en editie, en een indeling die blijft werken als je collectie groeit.",
    updated: "2026-10-10",
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
    title: "Je steelbook-collectie organiseren",
    description:
      "Steelbooks verzamelen draait om de editie. Zo houd je overzicht over je steelbooks, limited editions en collector's editions.",
    updated: "2026-10-10",
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
    title: "Dvd, Blu-ray en 4K UHD: de verschillen voor verzamelaars",
    description:
      "Wat is het verschil tussen dvd, Blu-ray en 4K UHD Blu-ray, en waar let je op als je fysieke films verzamelt?",
    updated: "2026-10-10",
    sections: [
      {
        heading: "Dvd",
        paragraphs: [
          "De dvd heeft standaardresolutie (576 lijnen in Europa). Het beeld is zichtbaar minder scherp op een groot scherm, maar veel films en series zijn alleen op dvd verschenen. Voor verzamelaars blijft de dvd daarom waardevol, zeker voor titels die nooit in hogere kwaliteit uitkwamen.",
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
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
