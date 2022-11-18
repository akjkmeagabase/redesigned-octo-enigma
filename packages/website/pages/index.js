// ===================================================================== Imports
import IndexPageData from '../content/pages/index.json';
import Scroll2Top from '../components/scroll2top/scroll2top.js';
import BlockBuilder from '../components/blockbuilder/blockbuilder.js';

// ===================================================================== Exports
export default function Home() {
  const sections = IndexPageData.page_content;
  return (
    <>
      <main className="page page-index">
        {sections.map((section, index) => (
          <BlockBuilder id={`section_${index + 1}`} key={`section_${index + 1}`} subsections={section} />
        ))}
      </main>

      <Scroll2Top />
    </>
  );
}

export function getStaticProps() {
  return {
    props: {
      title: 'Web3 Storage - Simple file storage with IPFS & Filecoin',
    },
  };
}
