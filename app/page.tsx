'use client';

import { useEffect, useRef, useState } from 'react';
import { Comment, Item, Story, fetchAs } from './items';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

type IdList = {
  ids: number[];
  active: number;
};

const queryClient = new QueryClient();

const itemKey = (id: number) => [{ id }];

function itemOptions<T>(id: number) {
  return {
    queryKey: itemKey(id),
    queryFn: () => fetchAs<T>(id),
    staleTime: Infinity,
  };
}

export default function Home() {
  const [stack, setStack] = useState<IdList[]>([]);
  useEffect(() => {
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
      .then(res => res.json())
      .then(json => json as number[])
      .then(ids => setStack([{ ids: ids.slice(0, 40), active: 0 }]));
    window.onscroll = e => e.preventDefault();
  }, []);

  useEffect(() => {
    const old = window.onkeydown;
    window.onkeydown = e => {
      e.preventDefault();
      const { active, ids } = stack.at(-1)!;
      switch (e.key) {
        case 'ArrowUp':
          setStack([...stack.slice(0, -1), { ids, active: Math.max(active - 1, 0) }]);
          break;
        case 'ArrowDown':
          setStack([...stack.slice(0, -1), { ids, active: Math.min(active + 1, ids.length - 1) }]);
          break;
        case 'ArrowLeft':
          setStack([stack.at(0)!, ...stack.slice(1, -1)]);
          break;
        case 'ArrowRight':
          const id = ids[active];
          const item = queryClient.getQueryData<Item>(itemKey(id));
          if (item?.kids) {
            setStack([...stack, { ids: item.kids, active: 0 }]);
          }
          break;
      }
    };
    return () => {
      window.onkeydown = old;
    };
  }, [stack]);

  if (stack.length === 0) return <div>Loading</div>;
  return (
    <QueryClientProvider client={queryClient}>
      <main className='flex h-screen w-screen justify-end'>
        {stack.map(({ ids, active }, index) => (
          <div className='overflow-overflow w-96' key={index}>
            <ItemList ids={ids} active={active} />
          </div>
        ))}
      </main>
    </QueryClientProvider>
  );
}

function ItemList({ ids, active }: { ids: number[]; active: number }) {
  const listElement = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // set top as the offset of the active element
    const activeElement = listElement.current?.children[active] as HTMLElement;
    const { offsetHeight, offsetTop } = activeElement!;
    const windowHeight = window.innerHeight;
    // use transition to animate the scroll
    listElement.current?.setAttribute('style', `transition: top 0.2s; top: ${windowHeight / 2 - offsetHeight / 2 - offsetTop}px`);
  }, [active]);

  return (
    <ul className='relative flex flex-col gap-4 transition' ref={listElement}>
      {ids.map((id, index) => (
        <li key={index} className={'group' + (index === active ? ' active' : '')}>
          <Item id={id} />
        </li>
      ))}
    </ul>
  );
}

function Item({ id }: { id: number }) {
  const { isError, error, isSuccess, data } = useQuery(itemOptions<Item>(id));
  if (isError) return <div>Error: {error!.message}</div>;
  if (!isSuccess) return <div>Loading</div>;
  const item = data;
  switch (item.type) {
    case 'story':
      return <StoryItem story={item} />;
    case 'comment':
      return <CommentItem comment={item} />;
    default:
      const { by, time, type } = item;
      return <span className='group-[.active]:bg-slate-400'>{`${type} by ${by} at ${time}`}</span>;
  }
}

function StoryItem({ story }: { story: Story }) {
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
    <div className='flex justify-between group-[.active]:bg-slate-400'>
      <a
        target='_blank'
        className='underline after:inline-block after:h-[15px] after:w-[15px] after:align-sub after:content-[url(/external-link.svg)]'
        href={url}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <time dateTime={unixTime.toISOString()}>{localeTime}</time>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { text, kids } = comment;
  return (
    <div className='flex items-start gap-1 group-[.active]:bg-slate-400'>
      <div dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}
