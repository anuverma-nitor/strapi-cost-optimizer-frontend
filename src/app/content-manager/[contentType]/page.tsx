import Layout from '@/components/ui/Layout';
import ContentItemList from '@/components/content/ContentItemList';

interface ContentTypePageProps {
  params: {
    contentType: string;
  };
}

export default function ContentTypePage({ params }: ContentTypePageProps) {
  return (
    <Layout>
      <ContentItemList contentType={params.contentType} />
    </Layout>
  );
}

