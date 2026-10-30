import { describe, expect, it } from "vitest";
import { looksLikeXml, xmlToTable } from "@/lib/xml-import";

const col = (table: string[][], name: string) => table.slice(1).map((r) => r[table[0].indexOf(name)]);

describe("xmlToTable", () => {
  it("reads a DVD Profiler export", () => {
    const xml = `<?xml version="1.0"?><Collection>
      <DVD><UPC>0883929124445</UPC><Title>Inception</Title><ProductionYear>2010</ProductionYear>
        <MediaTypes><DVD>false</DVD><BluRay>true</BluRay><UltraHD>true</UltraHD></MediaTypes>
        <PurchaseInfo><Price>19.99</Price><Date>2021-05-01</Date><Place>MediaMarkt</Place></PurchaseInfo></DVD>
      <DVD><UPC>5051888270935</UPC><Title>Dune &amp; Co</Title><ProductionYear>2024</ProductionYear>
        <MediaTypes><DVD>true</DVD><BluRay>false</BluRay><UltraHD>false</UltraHD></MediaTypes></DVD>
    </Collection>`;
    const t = xmlToTable(xml);
    expect(col(t, "Titel")).toEqual(["Inception", "Dune & Co"]);
    expect(col(t, "Barcode")).toEqual(["0883929124445", "5051888270935"]);
    expect(col(t, "Formaat")).toEqual(["4K Ultra HD + Blu-ray", "DVD"]);
    expect(col(t, "Aankoopprijs")).toEqual(["19.99", ""]);
    expect(col(t, "Winkel")).toEqual(["MediaMarkt", ""]);
  });

  it("reads a CLZ Movies export (displayname nodes)", () => {
    const xml = `<movieinfo><movielist>
      <movie><title>Alien</title><upc>024543617839</upc><format><displayname>Blu-ray</displayname></format>
        <releasedate><year><displayname>1979</displayname></year></releasedate><seenit>Yes</seenit>
        <location><displayname>Kast 1</displayname></location></movie>
      <movie><title>Brazil</title><upc>715515123456</upc><format><displayname>DVD</displayname></format><seenit>No</seenit></movie>
    </movielist></movieinfo>`;
    const t = xmlToTable(xml);
    expect(col(t, "Titel")).toEqual(["Alien", "Brazil"]);
    expect(col(t, "Formaat")).toEqual(["Blu-ray", "DVD"]);
    expect(col(t, "Jaar")).toEqual(["1979", ""]);
    expect(col(t, "Bekeken")).toEqual(["ja", "nee"]);
    expect(col(t, "Plek")).toEqual(["Kast 1", ""]);
  });

  it("reads a single-title file and keeps leading zeros", () => {
    const t = xmlToTable(`<Titles><Title><LocalTitle>Amélie</LocalTitle><Barcode>0012345678905</Barcode><Type>DVD</Type></Title></Titles>`);
    expect(col(t, "Titel")).toEqual(["Amélie"]);
    expect(col(t, "Barcode")).toEqual(["0012345678905"]);
  });

  it("spots XML", () => {
    expect(looksLikeXml("<?xml version='1.0'?><a/>")).toBe(true);
    expect(looksLikeXml("Titel;Jaar")).toBe(false);
  });
});
