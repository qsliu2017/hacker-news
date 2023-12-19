'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { useEffect, useState } from 'react';
import { Comment, fetchAs } from './items';

export default function CommentList({ ids }: { ids: number[] }) {
  return (
    <ul className='flex flex-col gap-2 shadow-md'>
      {ids.map(id => (
        <li key={id.toString()}>
          <CommentListItem id={id} />
        </li>
      ))}
    </ul>
  );
}

function CommentListItem({ id }: { id: number }) {
  const [comment, setComment] = useState<Comment | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetchAs<Comment>(id).then(setComment);
  }, [id]);

  if (comment === null) return <div>Loading</div>;

  const { text, kids } = comment;
  return (
    <Collapsible open={open} onOpenChange={setOpen} disabled={!(kids?.length > 0)}>
      <div className='flex items-start gap-1'>
        <CollapsibleTrigger className='ui-open:before:rotate-180 before:inline-block before:h-[15px] before:w-[15px] before:content-[url(/chevron-down.svg)]' />
        <div dangerouslySetInnerHTML={{ __html: text }} />
      </div>
      <CollapsibleContent className='ml-2'>
        <CommentList ids={kids} />
      </CollapsibleContent>
    </Collapsible>
  );
}
