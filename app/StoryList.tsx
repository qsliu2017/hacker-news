'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { useEffect, useState } from 'react';
import CommentList from './CommentList';
import { Story, fetchAs } from './items';

export default function StoryList({ ids, active }: { ids: number[]; active: number }) {
  return (
    <ul className='flex flex-col gap-4'>
      {ids.map((id, index) => (
        <li key={id.toString()}>
          <StoryListItem id={id} active={index === active} />
        </li>
      ))}
    </ul>
  );
}

function StoryListItem({ id, active }: { id: number; active: boolean }) {
  const [story, setStory] = useState<Story | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetchAs<Story>(id).then(setStory);
  }, [id]);

  if (story === null) return <div>Loading</div>;

  const { url, title, time, kids } = story;
  const unixTime = new Date(time * 1000);
  const localeTime = unixTime.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
  return (
    <Collapsible disabled={!(kids?.length > 0)} open={open} onOpenChange={setOpen} className={active ? 'bg-slate-500' : ''}>
      <div className='flex justify-between'>
        <p>
          <CollapsibleTrigger>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='h-[15px] w-[15px] data-[open]:rotate-90'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
            </svg>
          </CollapsibleTrigger>
          <a
            target='_blank'
            className='underline after:inline-block after:h-[15px]  after:w-[15px] after:align-sub after:content-[url(/external-link.svg)]'
            href={url}
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </p>
        <time dateTime={unixTime.toISOString()}>{localeTime}</time>
      </div>
      <CollapsibleContent className='ml-4 mr-1 mt-2'>
        <CommentList ids={kids} />
      </CollapsibleContent>
    </Collapsible>
  );
}
