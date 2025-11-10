import Layout from '@/components/ui/Layout';
import ContentBuilder from '@/components/content/ContentBuilder';

interface ContentBuilderPageProps {
  params: {
    contentType: string;
    contentId: string;
  };
}

export default function ContentBuilderPage({ params }: ContentBuilderPageProps) {
  return (
    <Layout>
      <ContentBuilder 
        contentType={params.contentType} 
        contentId={params.contentId === 'new' ? undefined : params.contentId} 
      />
    </Layout>
  );
}

