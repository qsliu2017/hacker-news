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
        case 'Enter': {
          const id = ids[active];
          const item = queryClient.getQueryData<Item>(itemKey(id));
          if (item?.type === 'story' && item.url) window.open(item.url, '_blank');
          break;
        }
        case 'ArrowUp':
          setStack([...stack.slice(0, -1), { ids, active: Math.max(active - 1, 0) }]);
          break;
        case 'ArrowDown':
          setStack([...stack.slice(0, -1), { ids, active: Math.min(active + 1, ids.length - 1) }]);
          break;
        case 'ArrowLeft':
          setStack([...stack.slice(0, 1), ...stack.slice(1, -1)]);
          break;
        case 'ArrowRight': {
          const id = ids[active];
          const item = queryClient.getQueryData<Item>(itemKey(id));
          if (item?.kids) {
            setStack([...stack, { ids: item.kids, active: 0 }]);
          }
          break;
        }
      }
    };
    return () => {
      window.onkeydown = old;
    };
  }, [stack]);

  const listElement = useRef<HTMLOListElement>(null);
  const centerLastLevelList = useCallback((lastLevel: number) => {
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

  useEffect(() => centerLastLevelList(stack.length - 1), [stack.length]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centerLastLevelList(stack.length - 1);
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
  const centerActiveItem = useCallback((active: number) => {
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
    centerActiveItem(active);
  }, [active]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centerActiveItem(active);
    };
    return () => {
      window.onresize = old;
    };
  }, [active]);

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
  return (
    <div className='flex justify-between group-[.active]:bg-slate-400'>
      <a
        target='_blank'
        className='underline after:inline-block after:h-[15px] after:w-[15px] after:align-sub after:content-[url(/external-link.svg)]'
        href={url}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <Time className='flex-shrink-0' time={time} />
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { text, kids, time, by } = comment;
  return (
    <div className='flex flex-col gap-1 group-[.active]:bg-slate-400' style={{ transition: 'font-size 0.1s' }}>
      <div className='flex justify-between'>
        <span>@{by}</span>
        <span>
          <Time time={time} />
          {kids?.length > 0 && (
            <>
              {' '}
              | <span>{kids.length} reply</span>
            </>
          )}
        </span>
      </div>
      <div className='group-[.active]:text-xl' dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function Time({ time, ...props }: { time: number } & React.HTMLAttributes<HTMLTimeElement>) {
  const unixTime = new Date(time * 1000);
  const currentTime = new Date();
  const diff = currentTime.getTime() - unixTime.getTime();
  // transform to 'about x minutes ago', 'about y hours ago' or 'yy/mm/dd'
  return (
    <time dateTime={unixTime.toISOString()} {...props}>
      {diff < 60 * 1000
        ? 'just now'
        : diff < 60 * 60 * 1000
          ? `${Math.floor(diff / (60 * 1000))} minutes ago`
          : diff < 24 * 60 * 60 * 1000
            ? `${Math.floor(diff / (60 * 60 * 1000))} hours ago`
            : unixTime.toLocaleString('zh-cn', {
                year: currentTime.getFullYear() === unixTime.getFullYear() ? undefined : 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
    </time>
  );
}
