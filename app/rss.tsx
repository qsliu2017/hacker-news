import { Item } from './types';
import { QueryClient } from '@tanstack/react-query';

export class RssSourceItem implements Item {
  constructor(
    private title: string,
    private feedUrl: string,
  ) {}

  url() {
    return this.feedUrl;
  }

  async expand(queryClient: QueryClient) {
    const res = await queryClient.fetchQuery({
      queryKey: ['rss', this.feedUrl],
      queryFn: () => fetch(this.feedUrl).then(res => res.text()),
      staleTime: 1000 * 60 * 60, // 1 hour
    });
    const parser = new DOMParser();
    const doc = parser.parseFromString(res, 'application/xml');
    const items = doc.querySelectorAll('item');
    return Array.from(items).map(
      item =>
        new RssItem(
          item.querySelector('title')!.textContent!,
          item.querySelector('link')!.textContent!,
          item.querySelector('pubDate')?.textContent ?? undefined,
        ),
    );
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
  ) {}

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
