import Link from "next/link";
import { getLocale } from "@/lib/preferences";
import { Logo } from "@/components/brand/logo";

// Content is intentionally plain prose (not split into i18n dictionary keys
// like the rest of the app) — a legal document reads better as continuous
// text than as heavily-templated fragments. Placeholders in [BRACKETS] are
// business/legal specifics that must be filled in by Danny before this page
// is actually complete — see the summary given alongside this change.

export const metadata = {
  title: "Privacybeleid",
};

function Dutch() {
  return (
    <>
      <h1>Privacybeleid Filmory</h1>
      <p className="text-sm text-muted-foreground">Laatst bijgewerkt: 10-10-2026</p>

      <p>
        Dit privacybeleid is van toepassing op zowel de Filmory-app als deze website, bereikbaar via{" "}
        <mark>filmvault2026@hotmail.com</mark>. App en website delen hetzelfde account en dezelfde gegevens.
      </p>

      <h2>Welke gegevens verzamelen we</h2>
      <ul>
        <li>Accountgegevens: e-mailadres en wachtwoord.</li>
        <li>Profielgegevens die je zelf invult: naam, bio, locatie (vrije tekst), website, avatar-URL.</li>
        <li>Collectiegegevens: films die je toevoegt, persoonlijke notities, tags, uitleenstatus, favorieten, beoordelingen.</li>
        <li>Sociale gegevens: wie je volgt, vriendschapsverzoeken, berichten/reviews en reacties die je plaatst, curated filmlijsten.</li>
        <li>Op de app: een pushmeldingstoken van je toestel, om je meldingen te kunnen sturen.</li>
        <li>
          Gebruiksgegevens: welke kernacties je uitvoert (bijvoorbeeld een film toevoegen, een review plaatsen of
          iemand volgen) met het tijdstip, en via welke link je je aanmeldde (bijvoorbeeld een uitnodiging). Hiervoor
          gebruiken we geen cookies of diensten van derden. <mark>[CONTROLEER]</mark>
        </li>
        <li>Of je de nieuwsbrief wilt ontvangen, en wanneer je daarvoor toestemming gaf.</li>
      </ul>

      <h2>Waarvoor gebruiken we deze gegevens</h2>
      <p>
        Uitsluitend om de functionaliteit van de app en website te leveren: je collectie bijhouden, sociale functies
        (volgen, vrienden, reviews, reacties, lijsten), en pushmeldingen. We verkopen geen gegevens en gebruiken ze
        niet voor advertentiedoeleinden.
      </p>
      <p>
        De taal van de website kiezen we automatisch op basis van je land (afgeleid van je IP-adres, via Vercel) en
        de taalinstelling van je browser. Die gegevens slaan we niet op; alleen een taal die je zelf kiest, onthouden
        we in een cookie en, als je een account hebt, in je profiel. <mark>[CONTROLEER]</mark>
      </p>
      <p>
        Daarnaast meten we websitebezoek met Vercel Web Analytics: welke pagina&apos;s bezocht worden, via welke
        website je binnenkwam, en je land en type apparaat. Dit gebeurt zonder cookies en zonder dat je als persoon
        herkenbaar bent. Vercel treedt hierbij op als verwerker. <mark>[CONTROLEER]</mark>
      </p>
      <p>
        Gebruiksgegevens bekijken we alleen als totalen, om te zien hoe nieuwe leden de app gebruiken en wat beter
        kan (bijvoorbeeld hoeveel nieuwe leden hun eerste film toevoegen). De nieuwsbrief sturen we alleen als je
        daar zelf voor kiest; je kunt je op elk moment afmelden in je profiel of via de link onderaan elke mail.
      </p>
      <p>
        De nieuwsbrief versturen we via Brevo. Heb je een account en zet je de nieuwsbrief aan, dan geven we je
        e-mailadres (en je naam, als je die invulde) door aan Brevo; zet je hem uit of verwijder je je account, dan
        halen we je daar weer weg. Zonder account kun je je ook aanmelden: je ontvangt dan eerst een mail om je
        aanmelding te bevestigen, en je e-mailadres staat alleen bij Brevo, niet in de database van Filmory. Brevo
        meet of een nieuwsbrief geopend en aangeklikt wordt, alleen om te zien wat lezers interessant vinden.
        <mark>[CONTROLEER]</mark>
      </p>

      <h2>Met wie delen we gegevens</h2>
      <p>
        We werken met deze dienstverleners die als verwerker optreden: Supabase (hosting van account- en
        appgegevens), Brevo (versturen van de nieuwsbrief, alleen als je je daarvoor aanmeldt) en Firebase/Google (aflevering van pushmeldingen op de app — hiervoor ontvangt Google een
        apparaat-token, geen accountgegevens). Filminformatie wordt opgehaald bij The Movie Database (TMDB);
        hierbij worden geen persoonsgegevens verstuurd. We geven geen gegevens door aan derden voor hun eigen
        doeleinden.
      </p>

      <h2>Bewaartermijn en verwijdering</h2>
      <p>
        Je kunt je account met bijbehorende gegevens zelf verwijderen via Profiel → Account verwijderen (in de app
        en op de website). Dit verwijdert je profiel, collecties, berichten, reacties, volgrelaties, curated
        lijsten en meldingen permanent.
      </p>

      <h2>Zichtbaarheid van je gegevens voor andere gebruikers</h2>
      <p>
        Reviews/posts en reacties zijn zichtbaar voor je volgers; curated filmlijsten zijn openbaar zichtbaar. Je
        collectie zelf is alleen zichtbaar voor geaccepteerde vrienden. Persoonlijke notities/tags/uitleeninfo bij
        collectie-items zijn altijd privé.
      </p>
      <p>
        Een eigen cover die je bij een exemplaar uploadt, wordt opgeslagen bij onze opslagdienst (Supabase) en is
        zichtbaar voor iedereen die die collectie kan zien. De link naar de afbeelding is niet te raden, maar wie de
        link heeft, kan de afbeelding openen. Je kunt een cover altijd weer verwijderen. Gebruik je de barcodescanner,
        dan worden de camerabeelden alleen op je eigen apparaat verwerkt; ze worden niet verstuurd of opgeslagen.
        <mark>[CONTROLEER]</mark>
      </p>
      <p>
        Stuur je feedback (een bug of idee), dan bewaren we je bericht met wat automatisch meegaat: de pagina waar je
        was, je browser en apparaat, je schermgrootte en taal. Met een account koppelen we de melding aan je account
        en kun je een screenshot meesturen; die is alleen zichtbaar voor jou en de beheerders. Zonder account kun je
        optioneel een e-mailadres achterlaten, alleen om je te kunnen antwoorden. Om misbruik te beperken bewaren we
        bij meldingen zonder account een onherleidbare code (hash) van je IP-adres, niet het IP-adres zelf. We bewaren
        feedback zolang die nodig is om hem af te handelen, en uiterlijk <mark>[BEWAARTERMIJN]</mark>; met je account
        verdwijnen ook je meldingen en screenshots. <mark>[CONTROLEER]</mark>
      </p>
      <p>
        Zet je een collectie zelf op &quot;openbaar via link&quot;, dan kan iedereen met die link de naam en
        beschrijving van de collectie zien, de films met formaat en editie, en je naam en avatar. Notities,
        beoordelingen, uitleenstatus en barcodes blijven privé. Je kunt het delen altijd weer uitzetten; openbare
        collecties worden niet door zoekmachines geïndexeerd.
      </p>

      <h2>Jouw rechten</h2>
      <p>
        Je kunt je gegevens inzien en aanpassen via je profiel. Voor overige verzoeken (bijvoorbeeld een volledig
        overzicht van je gegevens) kun je contact opnemen via <mark>filmvault2026@hotmail.com</mark>.
      </p>

      <h2>Contact</h2>
      <p>
        Vragen over dit privacybeleid or over je gegevens kun je sturen naar <mark>filmvault2026@hotmail.com</mark>.
      </p>

      <h2>Wijzigingen</h2>
      <p>Dit beleid kan worden bijgewerkt naarmate de app of website functionaliteit toevoegt. De datum bovenaan geeft de laatste wijziging aan.</p>
    </>
  );
}

function English() {
  return (
    <>
      <h1>Filmory Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 10-10-2026</p>

      <p>
        This privacy policy applies to both the Filmory app and this website, reachable at{" "}
        <mark>filmvault2026@hotmail.com</mark>. The app and website share the same account and data.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>Account data: email address and password.</li>
        <li>Profile data you provide: name, bio, location (free text), website, avatar URL.</li>
        <li>Collection data: movies you add, personal notes, tags, loan status, favorites, ratings.</li>
        <li>Social data: who you follow, friend requests, posts/reviews and comments you write, curated movie lists.</li>
        <li>On the app: a push notification token for your device, to deliver notifications.</li>
        <li>
          Usage data: which core actions you take (for example adding a film, posting a review or following someone)
          with their time, and which link you signed up through (for example an invite). We use no cookies or
          third-party services for this. <mark>[CHECK]</mark>
        </li>
        <li>Whether you want to receive the newsletter, and when you gave that consent.</li>
      </ul>

      <h2>What we use this data for</h2>
      <p>
        Solely to provide the app and website&apos;s functionality: keeping track of your collection, social
        features (following, friends, reviews, comments, lists), and push notifications. We do not sell data or use
        it for advertising purposes.
      </p>
      <p>
        We choose the website&apos;s language automatically based on your country (derived from your IP address, via
        Vercel) and your browser&apos;s language setting. We don&apos;t store that data; only a language you choose
        yourself is remembered in a cookie and, if you have an account, in your profile. <mark>[CHECK]</mark>
      </p>
      <p>
        We also measure website visits with Vercel Web Analytics: which pages are visited, which website you came
        from, and your country and device type. This happens without cookies and without identifying you as a
        person. Vercel acts as a processor for this. <mark>[CHECK]</mark>
      </p>
      <p>
        We only look at usage data as totals, to understand how new members use the app and what can be improved
        (for example how many new members add their first film). We only send the newsletter if you choose to
        receive it; you can unsubscribe at any time in your profile or through the link at the bottom of every email.
      </p>
      <p>
        We send the newsletter through Brevo. If you have an account and turn the newsletter on, we pass your email
        address (and your name, if you filled it in) to Brevo; if you turn it off or delete your account, we remove
        you there again. You can also sign up without an account: you first receive an email to confirm, and your
        address is then stored only at Brevo, not in Filmory&apos;s database. Brevo measures whether a newsletter is
        opened and clicked, only to see what readers find interesting. <mark>[CHECK]</mark>
      </p>

      <h2>Who we share data with</h2>
      <p>
        We work with these processors: Supabase (hosting of account and app data), Brevo (sending the newsletter, only
        if you sign up for it) and Firebase/Google (delivering
        push notifications on the app — Google receives a device token for this, not account data). Movie
        information is fetched from The Movie Database (TMDB); no personal data is sent in that process. We do not
        pass data to third parties for their own purposes.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        You can delete your account and its data yourself via Profile → Delete account (in the app and on the
        website). This permanently removes your profile, collections, posts, comments, follow relationships,
        curated lists, and reports.
      </p>

      <h2>Visibility of your data to other users</h2>
      <p>
        Reviews/posts and comments are visible to your followers; curated movie lists are publicly visible. Your
        collection itself is only visible to accepted friends. Personal notes/tags/loan info on collection items
        are always private.
      </p>
      <p>
        A custom cover you upload for a copy is stored with our storage provider (Supabase) and is visible to anyone
        who can see that collection. The image link can&apos;t be guessed, but anyone who has the link can open the
        image. You can always remove a cover. When you use the barcode scanner, camera images are processed on your
        own device only; they are not sent or stored. <mark>[CHECK]</mark>
      </p>
      <p>
        If you send feedback (a bug or an idea), we keep your message with what is included automatically: the page
        you were on, your browser and device, screen size and language. With an account, the message is linked to
        your account and you can attach a screenshot, visible only to you and the administrators. Without an account
        you can optionally leave an email address, used only to reply to you. To limit abuse we store a
        non-reversible code (hash) of your IP address for messages sent without an account, never the IP address
        itself. We keep feedback as long as needed to handle it, and at most <mark>[RETENTION PERIOD]</mark>; deleting
        your account also deletes your messages and screenshots. <mark>[CHECK]</mark>
      </p>
      <p>
        If you set a collection to &quot;public via link&quot; yourself, anyone with that link can see the
        collection&apos;s name and description, the films with format and edition, and your name and avatar. Notes,
        ratings, loan status and barcodes stay private. You can switch sharing off at any time; public collections
        are not indexed by search engines.
      </p>

      <h2>Your rights</h2>
      <p>
        You can view and edit your data via your profile. For other requests (for example a full export of your
        data), contact <mark>filmvault2026@hotmail.com</mark>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this privacy policy or your data can be sent to <mark>filmvault2026@hotmail.com</mark>.
      </p>

      <h2>Changes</h2>
      <p>This policy may be updated as the app or website adds functionality. The date above reflects the last change.</p>
    </>
  );
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-12">
      <Link href="/" className="mb-10 inline-block">
        <Logo markClassName="size-7" />
      </Link>
      <article className="max-w-none text-sm leading-relaxed text-foreground/90 [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_mark]:rounded [&_mark]:bg-primary/15 [&_mark]:px-1 [&_mark]:font-medium [&_mark]:text-primary [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {locale === "en" ? <English /> : <Dutch />}
      </article>
    </div>
  );
}
