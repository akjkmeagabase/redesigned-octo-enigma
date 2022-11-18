// ===================================================================== Imports
import TiersPageData from '../content/pages/tiers.json';
import Scroll2Top from '../components/scroll2top/scroll2top.js';
import BlockBuilder from '../components/blockbuilder/blockbuilder.js';

// ===================================================================== Exports
export default function Home() {
  const sections = TiersPageData.page_content;
  return (
    <>
      <main className="page page-pricing">
        {sections.map((section, index) => (
          <BlockBuilder id={`pricing_section_${index + 1}`} key={`section_${index}`} subsections={section} />
        ))}
      </main>

      <Scroll2Top />
    </>
  );
}

export function getStaticProps() {
  return {
    props: {
      title: 'Tiers - Web3 Storage - Simple file storage with IPFS & Filecoin',
      description:
        'Web3.Storage is a service that grows with your needs, and offers a significant free tier with no strings attached.',
    },
  };
}
