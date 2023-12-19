'use client';

import { useEffect, useState } from 'react';
import StoryList from './StoryList';

export default function Home() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
      .then(res => res.json())
      .then(json => json as number[])
      .then(setIds);
  }, []);
  return (
    <main className='mx-auto mb-auto w-full max-w-4xl'>
      <StoryList ids={ids} />
    </main>
  );
}
