import Layout from '@/components/ui/Layout';
import ContentItemList from '@/components/content/ContentItemList';

interface ContentTypePageProps {
  params: Promise<{
    contentType: string;
  }>;
}

export default async function ContentTypePage(props: ContentTypePageProps) {
  const params = await props.params;
  const { contentType } = params;

  return (
    <Layout>
      <ContentItemList contentType={contentType} />
    </Layout>
  );
}

