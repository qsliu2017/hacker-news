'use client';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Comment, Item, Story, fetchAs } from './items';

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
  }, []);

  useEffect(() => {
    const old = window.onkeydown;
    window.onkeydown = e => {
      e.preventDefault();
      old?.apply(window, [e]);
      const { active, ids } = stack.at(-1)!;
      switch (e.key) {
        case 'ArrowUp':
          setStack([...stack.slice(0, -1), { ids, active: Math.max(active - 1, 0) }]);
          break;
        case 'ArrowDown':
          setStack([...stack.slice(0, -1), { ids, active: Math.min(active + 1, ids.length - 1) }]);
          break;
        case 'ArrowLeft':
          setStack([...stack.slice(0, 1), ...stack.slice(1, -1)]);
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

  const listElement = useRef<HTMLOListElement>(null);
  const centeralizeLastLevelList = useCallback((lastLevel: number) => {
    if (lastLevel < 0) return;
    const lastListElement = listElement.current?.children[lastLevel] as HTMLElement;
    const { offsetWidth: lastListWidth } = lastListElement!;
    const { offsetWidth: containerWidth } = listElement.current!;
    const windowWidth = window.innerWidth;
    const oldStyle = listElement.current?.getAttribute('style');
    listElement.current?.setAttribute('style', `transition: left 0.2s; left: ${windowWidth - lastListWidth / 2 - containerWidth}px`);
    return () => {
      oldStyle && listElement.current?.setAttribute('style', oldStyle);
    };
  }, []);

  useEffect(() => centeralizeLastLevelList(stack.length - 1), [stack.length]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centeralizeLastLevelList(stack.length - 1);
    };
    return () => {
      window.onresize = old;
    };
  }, [stack.length]);

  if (stack.length === 0) return <div>Loading</div>;
  return (
    <QueryClientProvider client={queryClient}>
      <main className='h-screen w-screen overflow-hidden'>
        <ol className='relative flex h-full w-fit gap-2' ref={listElement}>
          {stack.map(({ ids, active }, index) => (
            <li className='w-[500px] overflow-hidden border-x border-slate-400' key={index}>
              <ItemList ids={ids} active={active} />
            </li>
          ))}
        </ol>
      </main>
    </QueryClientProvider>
  );
}

function ItemList({ ids, active }: { ids: number[]; active: number }) {
  const listElement = useRef<HTMLUListElement>(null);
  const centeralizeActiveItem = useCallback((active: number) => {
    const activeElement = listElement.current?.children[active] as HTMLElement;
    const { offsetHeight, offsetTop } = activeElement!;
    const windowHeight = window.innerHeight;
    const oldStyle = listElement.current?.getAttribute('style');
    listElement.current?.setAttribute('style', `transition: top 0.2s; top: ${windowHeight / 2 - offsetHeight / 2 - offsetTop}px`);
    return () => {
      oldStyle && listElement.current?.setAttribute('style', oldStyle);
    };
  }, []);

  useEffect(() => {
    centeralizeActiveItem(active);
  }, [active]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centeralizeActiveItem(active);
    };
    return () => {
      window.onresize = old;
    };
  }, []);

  return (
    <ul className='relative flex flex-col gap-4' ref={listElement}>
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
      <time className='flex-shrink-0' dateTime={unixTime.toISOString()}>
        {localeTime}
      </time>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { text, kids } = comment;
  return (
    <div className='flex items-start gap-1 group-[.active]:bg-slate-400 group-[.active]:text-xl' style={{ transition: 'font-size 0.1s' }}>
      <div dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}
