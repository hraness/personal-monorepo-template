import { ProductionHomepage } from "../src/production-homepage";
import { personalSite } from "../src/site";
import { JsonLdScript } from "./seo/json-ld";
import { publicSite } from "./site";

export default function HomePage() {
  return (
    <>
      <JsonLdScript
        id="profile-structured-data"
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "@id": `${publicSite.canonicalUrl}/#profile`,
          url: publicSite.canonicalUrl,
          name: personalSite.name,
          description: personalSite.introduction,
          mainEntity: {
            "@type": "Person",
            "@id": `${publicSite.canonicalUrl}/#person`,
            name: personalSite.name,
            url: publicSite.canonicalUrl,
            description: personalSite.introduction,
            sameAs: personalSite.socialLinks.map(({ href }) => href),
          },
        }}
      />
      <ProductionHomepage content={personalSite} />
    </>
  );
}
