import Layout from '@/components/ui/Layout';
import ContentTypeList from '@/components/content/ContentTypeList';

export default function ContentBuilderPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Builder</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a content type to start building or editing content.
          </p>
        </div>
        <ContentTypeList />
      </div>
    </Layout>
  );
}

