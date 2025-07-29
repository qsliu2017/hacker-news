import { QueryClient, useQuery } from '@tanstack/react-query';
import { Item } from './types';

/** Example
{
  "by" : "dhouston",
  "descendants" : 71,
  "id" : 8863,
  "kids" : [ 8952, 9224, 8917, 8884, 8887, 8943, 8869, 8958, 9005, 9671, 8940, 9067, 8908, 9055, 8865, 8881, 8872, 8873, 8955, 10403, 8903, 8928, 9125, 8998, 8901, 8902, 8907, 8894, 8878, 8870, 8980, 8934, 8876 ],
  "score" : 111,
  "time" : 1175714200,
  "title" : "My YC app: Dropbox - Throw away your USB drive",
  "type" : "story",
  "url" : "http://www.getdropbox.com/u/2/screencast.html"
}
 */
type Story = {
  by: string;
  descendants: number;
  id: number;
  kids: number[];
  score: number;
  time: number;
  title: string;
  type: 'story';
  url: string;
};

/** Example
{
  "by" : "norvig",
  "id" : 2921983,
  "kids" : [ 2922097, 2922429, 2924562, 2922709, 2922573, 2922140, 2922141 ],
  "parent" : 2921506,
  "text" : "Aw shucks, guys ... you make me blush with your compliments.<p>Tell you what, Ill make a deal: I'll keep writing if you keep reading. K?",
  "time" : 1314211127,
  "type" : "comment"
}
 */
type Comment = {
  by: string;
  id: number;
  kids: number[];
  parent: number;
  text: string;
  time: number;
  type: 'comment';
};

export const HackerNewsTopStoriesItem: Item = {
  url() {
    return `https://hacker-news.firebaseio.com/v0/topstories.json`;
  },

  async expand(queryClient: QueryClient) {
    const ids = await queryClient.fetchQuery({
      queryKey: ['hackernews', 'topstories'],
      queryFn: async () => {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/topstories.json`);
        const json = await res.json();
        return json as number[];
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
    return ids.map(id => new HackerNewsItem(id));
  },

  render() {
    return <div className='group-[.active]:bg-slate-400'>Hacker News</div>;
  },
};

/**
 * Item key used for query client.
 */
function itemKey(id: number) {
  return {
    queryKey: ['hackernews', id],
    queryFn: async () => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const json = await res.json();
      return json as Story | Comment;
    },
    staleTime: Infinity,
  };
}

class HackerNewsItem implements Item {
  private item: Story | Comment | null = null;
  constructor(private id: number) {}

  url() {
    return `https://hacker-news.firebaseio.com/v0/item/${this.id}.json`;
  }

  async expand(queryClient: QueryClient) {
    this.item = await queryClient.fetchQuery(itemKey(this.id));
    return this.item!.kids.map(id => new HackerNewsItem(id));
  }

  render() {
    return <HackerNewsItemElement id={this.id} />;
  }
}

function HackerNewsItemElement({ id }: { id: number }) {
  const { isError, error, isSuccess, data } = useQuery(itemKey(id));
  if (isError) return <div>Error: {error!.message}</div>;
  if (!isSuccess) return <div>Loading</div>;
  const item = data;
  switch (item.type) {
    case 'story':
      return <StoryItem story={item} />;
    case 'comment':
      return <CommentItem comment={item} />;
    default:
      return <div className='group-[.active]:bg-slate-400'>Unknown item: {JSON.stringify(item)}</div>;
  }
}

function StoryItem({ story }: { story: Story }) {
  const { url, title, time } = story;
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
    <div className='comment flex flex-col gap-1 group-[.active]:bg-slate-400' style={{ transition: 'font-size 0.1s' }}>
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
