import Layout from '@/components/ui/Layout';
import ContentBuilder from '@/components/content/ContentBuilder';

interface ContentBuilderPageProps {
  params: Promise<{
    contentType: string;
    contentId: string;
  }>;
}

export default async function ContentBuilderPage({ params }: ContentBuilderPageProps) {
  const { contentType, contentId } = await params;
  
  return (
    <Layout>
      <ContentBuilder 
        contentType={contentType} 
        contentId={contentId === 'new' ? undefined : contentId} 
      />
    </Layout>
  );
}

