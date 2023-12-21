'use client';

import { LegacyRef, forwardRef, useEffect, useRef, useState } from 'react';
import StoryList from './StoryList';
import { Item, Story, fetchAs } from './items';

type IdList = {
  ids: number[];
  active: number;
};

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
          console.info('keydown right');
          const id = ids[active];
          console.info('fetching', id);
          fetchAs<Item>(id)
            .then(item => {
              console.info('fetched', item);
              if (item?.kids?.length > 0) {
                setStack([...stack, { ids: item.kids, active: 0 }]);
              }
            })
            .catch(console.error);
          break;
      }
    };
    return () => {
      window.onkeydown = old;
    };
  }, [stack]);

  if (stack.length === 0) return <div>Loading</div>;
  return (
    <main className='flex h-screen w-screen justify-end'>
      {stack.map(({ ids, active }, index) => (
        <div className='overflow-overflow w-96' key={index}>
          <ItemList ids={ids} active={active} />
        </div>
      ))}
    </main>
  );
}

function ItemList({ ids, active }: { ids: number[]; active: number }) {
  const listElement = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // set top as the offset of the active element
    const activeElement = listElement.current?.children[active] as HTMLElement;
    const {offsetHeight, offsetTop} = activeElement!;
    const windowHeight = window.innerHeight;
    // use transition to animate the scroll
    listElement.current?.setAttribute('style', `transition: top 0.2s; top: ${windowHeight / 2 - offsetHeight / 2 - offsetTop}px`);
  }, [active]);

  return (
    <ul className='relative flex flex-col gap-4 transition' ref={listElement}>
      {ids.map((id, index) => (
        <li key={index}>
          <Item id={id} active={index === active} />
        </li>
      ))}
    </ul>
  );
}

function Item({ id, active }: { id: number; active: boolean }) {
  const [item, setItem] = useState<Item | null>(null);
  useEffect(() => {
    fetchAs<Item>(id).then(setItem);
  }, [id]);
  if (item === null) return <div>Loading</div>;
  const { by, time, type } = item;
  return <span className={active ? 'bg-slate-400' : ''}>{`${type} by ${by} at ${time}`}</span>;
}
