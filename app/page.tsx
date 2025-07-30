'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HackerNewsTopStoriesItem } from './hackernews';
import { Item } from './types';
import { MixedRssSourceItem, RssSourceItem } from './rss';

const shortcutKeys = new Set(['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const queryClient = new QueryClient();

type Column = {
  items: Item[];
  active: number;
  maxReached: number;
};

function crosproxy(url: string) {
  return `https://corsproxy.io/?url=${url}`;
}

export default function Home() {
  const [stack, setStack] = useState<Column[]>([
    {
      items: [
        HackerNewsTopStoriesItem,
        new RssSourceItem('Neon', 'https://neon.com/blog/rss.xml'),
        new MixedRssSourceItem('rust', [
          'https://blog.rust-lang.org/feed.xml',
          crosproxy('https://research.swtch.com/feed.atom')
        ]),
      ],
      active: 0,
      maxReached: 0,
    },
  ]);

  useEffect(() => {
    const old = window.onkeydown;
    window.onkeydown = e => {
      if (!shortcutKeys.has(e.key)) {
        return old?.apply(window, [e]);
      }
      e.preventDefault();
      const { active, items, maxReached } = stack.at(-1)!;
      switch (e.key) {
        case 'Enter': {
          const item = items[active];
          if (item.url) window.open(item.url(), '_blank');
          break;
        }
        case 'ArrowUp':
          setStack([...stack.slice(0, -1), { items, active: Math.max(active - 1, 0), maxReached }]);
          break;
        case 'ArrowDown':
          const active_ = Math.min(active + 1, items.length - 1);
          setStack([...stack.slice(0, -1), { items, active: active_, maxReached: Math.max(maxReached, active_) }]);
          break;
        case 'ArrowLeft':
          setStack([...stack.slice(0, 1), ...stack.slice(1, -1)]);
          break;
        case 'ArrowRight': {
          const item = items[active];
          if (item.expand) {
            item.expand(queryClient).then(items => setStack([...stack, { items, active: 0, maxReached: 0 }]));
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
    const { offsetWidth: containerWidth } = listContainer,
      { innerWidth: windowWidth } = window;
    const oldStyle = listContainer.getAttribute('style');
    listContainer.setAttribute('style', `left: ${windowWidth - containerWidth - /* gap-2 = */ 8}px`);
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
          {stack.map((column, index) => (
            <li className='w-[500px] overflow-hidden border-x border-slate-400 px-4' key={index}>
              <ItemColumn {...column} />
            </li>
          ))}
        </ol>
      </main>
    </QueryClientProvider>
  );
}

const N_PREFETCH = 10;

function ItemColumn({ items, active, maxReached }: Column) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(active);
  const centerActiveItem = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
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
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const resizeObserver = new ResizeObserver(centerActiveItem);
    resizeObserver.observe(list);
  }, []);

  return (
    <ul className='relative flex flex-col gap-4' ref={listRef}>
      {items.slice(0, maxReached + N_PREFETCH).map((item, index) => (
        <li key={index} className={`group group-[.active]:scale-110 ${index === active ? 'active' : ''}`}>
          {item.render()}
        </li>
      ))}
    </ul>
  );
}
