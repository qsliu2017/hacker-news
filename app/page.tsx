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
      .then(ids => setStack([{ ids, active: 0 }]));
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

  const listContainerRef = useRef<HTMLOListElement>(null);
  const lastLevelRef = useRef(stack.length - 1);
  const centerLastList = useCallback(() => {
    const lastLevel = lastLevelRef.current,
      listContainer = listContainerRef.current!;
    if (lastLevel < 0) return;
    const { offsetWidth: lastListWidth } = (listContainer.children[lastLevel] as HTMLElement)!,
      { offsetWidth: containerWidth } = listContainer,
      { innerWidth: windowWidth } = window;
    const oldStyle = listContainer.getAttribute('style');
    listContainer.setAttribute('style', `left: ${windowWidth - lastListWidth / 2 - containerWidth}px`);
    return () => {
      oldStyle && listContainer.setAttribute('style', oldStyle);
    };
  }, []);

  useEffect(() => {
    lastLevelRef.current = stack.length - 1;
    return centerLastList();
  }, [stack.length]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centerLastList();
    };
    return () => {
      window.onresize = old;
    };
  }, []);

  if (stack.length === 0) return <div>Loading</div>;
  return (
    <QueryClientProvider client={queryClient}>
      <main className='h-screen w-screen overflow-hidden'>
        <ol className='relative flex h-full w-fit gap-2 transition-all' ref={listContainerRef}>
          {stack.map((list, index) => (
            <li className='w-[500px] overflow-hidden border-x border-slate-400 px-4' key={index}>
              <ItemList {...list} />
            </li>
          ))}
        </ol>
      </main>
    </QueryClientProvider>
  );
}

const N_PREFETCH = 10;

function ItemList({ ids, active }: IdList) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(active);
  const centerActiveItem = useCallback(() => {
    const list = listRef.current!;
    const { offsetHeight, offsetTop } = (list.children[activeRef.current] as HTMLElement)!,
      { innerHeight: windowHeight } = window;
    const oldStyle = list.getAttribute('style');
    list.setAttribute('style', `transition: top 0.2s; top: ${windowHeight / 2 - offsetHeight / 2 - offsetTop}px`);
    return () => {
      oldStyle && list.setAttribute('style', oldStyle);
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    return centerActiveItem();
  }, [active]);
  useEffect(() => {
    const old = window.onresize;
    window.onresize = e => {
      old?.apply(window, [e]);
      centerActiveItem();
    };
    return () => {
      window.onresize = old;
    };
  }, []);

  return (
    <ul className='relative flex flex-col gap-4' ref={listRef}>
      {ids.map((id, index) =>
        active - N_PREFETCH < index && index < active + N_PREFETCH ? (
          <li key={index} className={`group group-[.active]:scale-110 ${index === active ? 'active' : ''}`}>
            <Item id={id} />
          </li>
        ) : (
          <li key={index} />
        ),
      )}
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
      <div dangerouslySetInnerHTML={{ __html: text }} />
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
