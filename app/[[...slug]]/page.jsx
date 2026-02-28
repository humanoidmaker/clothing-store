import dynamic from 'next/dynamic';

const LegacyApp = dynamic(() => import('../../client/src/App'), {
  ssr: false
});

const CatchAllPage = () => {
  return <LegacyApp />;
};

export default CatchAllPage;
