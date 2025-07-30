import { Item } from './types';
import { QueryClient } from '@tanstack/react-query';

/**
 * A source item that combines multiple RSS feeds into a single feed. Children are ordered by date.
 * 
 * This is useful for combining multiple feeds into a single feed, such as a blog that has multiple authors.
 * 
 * @param title - The title of the source item.
 * @param feedUrls - The URLs of the RSS feeds to combine.
 */
export class MixedRssSourceItem implements Item {
  constructor(
    private title: string,
    private feedUrls: string[],
  ) { }

  async expand(queryClient: QueryClient) {
    const items = await Promise.all(this.feedUrls.map(async url => {
      const res = await queryClient.fetchQuery({
        queryKey: ['rss', url],
        queryFn: () => fetch(url).then(res => res.text()),
        staleTime: 1000 * 60 * 60, // 1 hour
      });
      return parseRssText(res);
    }));
    return items.flat().filter(item => item.date() !== undefined).sort((a, b) => b.date()!.getTime() - a.date()!.getTime());
  }

  render() {
    return <div className='group-[.active]:bg-slate-400'>{this.title}</div>;
  }
}

export class RssSourceItem implements Item {
  constructor(
    private title: string,
    private feedUrl: string,
  ) { }

  url() {
    return this.feedUrl;
  }

  async expand(queryClient: QueryClient) {
    const res = await queryClient.fetchQuery({
      queryKey: ['rss', this.feedUrl],
      queryFn: () => fetch(this.feedUrl).then(res => res.text()),
      staleTime: 1000 * 60 * 60, // 1 hour
    });
    return parseRssText(res);
  }

  render() {
    return <div className='group-[.active]:bg-slate-400'>{this.title}</div>;
  }
}

class RssItem implements Item {
  constructor(
    private title: string,
    private link: string,
    private pubDate?: string,
  ) { }

  url() {
    return this.link;
  }

  render() {
    return (
      <div className='flex justify-between group-[.active]:bg-slate-400'>
        <a
          target='_blank'
          className='underline after:inline-block after:h-[15px] after:w-[15px] after:align-sub after:content-[url(/external-link.svg)]'
          href={this.link}
          dangerouslySetInnerHTML={{ __html: this.title }}
        />
        {this.pubDate && <span className='flex-shrink-0 text-sm text-gray-500'>{parseRssDate(this.pubDate)}</span>}
      </div>
    );
  }

  date() {
    return this.pubDate ? new Date(this.pubDate) : undefined;
  }
}

function parseRssText(text: string) {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(text, 'application/xml');
  // Determine feed type based on root element
  const rootElement = doc.documentElement.tagName.toLowerCase();
  const isAtom = rootElement === 'feed';
  const isRss = rootElement === 'rss';

  if (!isAtom && !isRss) {
    throw new Error('Unsupported feed format');
  }

  // Function maps for parsing different feed types
  const parsers = {
    rss: {
      itemSelector: 'item',
      getTitle: (item: Element) => item.querySelector('title')?.textContent || '',
      getLink: (item: Element) => item.querySelector('link')?.textContent || '',
      getDate: (item: Element) => item.querySelector('pubDate')?.textContent || undefined,
    },
    atom: {
      itemSelector: 'entry',
      getTitle: (item: Element) => item.querySelector('title')?.textContent || '',
      getLink: (item: Element) => {
        const linkElement = item.querySelector('link');
        return linkElement?.getAttribute('href') || linkElement?.textContent || '';
      },
      getDate: (item: Element) => {
        return item.querySelector('published')?.textContent ||
          item.querySelector('updated')?.textContent || undefined;
      },
    }
  };

  const feedParser = isAtom ? parsers.atom : parsers.rss;
  const items = doc.querySelectorAll(feedParser.itemSelector);

  return Array.from(items).map(item =>
    new RssItem(
      feedParser.getTitle(item),
      feedParser.getLink(item),
      feedParser.getDate(item),
    ),
  );
}

function parseRssDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If it's today, show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    // If it's this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    // Otherwise show month, day, and year
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    // If parsing fails, return the original string
    return dateString;
  }
}
