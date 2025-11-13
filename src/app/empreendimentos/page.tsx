import { Suspense } from 'react';
import EmpreendimentosClient from './EmpreendimentosClient';

export default function Page() {
  return (
    <Suspense fallback={<div></div>}>
      <EmpreendimentosClient />
    </Suspense>
  );
}
