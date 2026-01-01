/**
 * DOI resolver — LaTeXiS
 * ---------------------
 * Phase 1: Resolve DOI into clean, structured metadata.
 * Responsibilities:
 *  - Normalize DOI input
 *  - Query Crossref (primary)
 *  - Enrich via OpenAlex (secondary)
 *  - Return structured metadata
 *  - DO NOT write files
 *  - DO NOT touch editor state
 */


export type ResolvedDOIMetadata = {
  doi: string;
  title?: string;
  authors?: string[];
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  abstract?: string;
  keywords?: string[];
  url?: string;
  rawBibTeX?: string;
  source: "crossref" | "openalex";
};

/**
 * Normalize DOI input:
 *  - trim
 *  - lowercase
 *  - strip https://doi.org/, dx.doi.org/, doi:
 */
function normalizeDOI(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "");
}

/**
 * Resolve DOI via Crossref and return structured metadata.
 */
export async function resolveDOI(rawDoi: string): Promise<ResolvedDOIMetadata> {
  const doi = normalizeDOI(rawDoi);

  if (!doi) {
    throw new Error("DOI vacío o inválido.");
  }

  const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(
    doi
  )}`;

  let crossrefJson: any;

  try {
    const res = await fetch(crossrefUrl, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Crossref error ${res.status}`);
    }

    const data = (await res.json()) as any;
    crossrefJson = data.message;
  } catch (err) {
    throw new Error("No se pudo resolver el DOI usando Crossref.");
  }

  const metadata: ResolvedDOIMetadata = {
    doi,
    title: crossrefJson.title?.[0],
    authors: crossrefJson.author?.map(
      (a: any) => `${a.family ?? ""}, ${a.given ?? ""}`.trim()
    ),
    year:
      crossrefJson.issued?.["date-parts"]?.[0]?.[0]?.toString() ??
      crossrefJson.created?.["date-parts"]?.[0]?.[0]?.toString(),
    journal: crossrefJson["container-title"]?.[0],
    volume: crossrefJson.volume,
    issue: crossrefJson.issue,
    pages: crossrefJson.page,
    publisher: crossrefJson.publisher,
    url: crossrefJson.URL,
    source: "crossref"
  };

  // Attempt OpenAlex enrichment (abstract, keywords)
  try {
    const oaUrl = `https://api.openalex.org/works/doi:${encodeURIComponent(
      doi
    )}`;
    const oaRes = await fetch(oaUrl);
    if (oaRes.ok) {
      const oaData = (await oaRes.json()) as any;

      if (oaData.abstract_inverted_index) {
        const words: string[] = [];
        for (const [word, positions] of Object.entries(
          oaData.abstract_inverted_index
        ) as any) {
          positions.forEach((pos: number) => {
            words[pos] = word;
          });
        }
        metadata.abstract = words.join(" ");
      }

      metadata.keywords = oaData.concepts
        ?.slice(0, 8)
        ?.map((c: any) => c.display_name);
      metadata.source = "openalex";
    }
  } catch {
    // OpenAlex is optional — ignore failures
  }

  // Fetch raw BibTeX as fallback/reference
  try {
    const bibUrl = `https://api.crossref.org/works/${encodeURIComponent(
      doi
    )}/transform/application/x-bibtex`;

    const bibRes = await fetch(bibUrl, {
      headers: { Accept: "application/x-bibtex" }
    });

    if (bibRes.ok) {
      metadata.rawBibTeX = (await bibRes.text()).trim();
    }
  } catch {
    // ignore bibtex fetch errors
  }

  return metadata;
}
