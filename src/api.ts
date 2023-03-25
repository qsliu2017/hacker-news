/**
* Represents an item on Hacker News
*/
export interface IHackerNewsItem {
  /** The item's unique id */
  id: number;
  /** True if the item is deleted */
  deleted?: boolean;
  /** The type of item. One of "job", "story", "comment", "poll", or "pollopt" */
  type: "job" | "story" | "comment" | "poll" | "pollopt";
  /** The username of the item's author */
  by: string;
  /** Creation date of the item, in Unix Time */
  time: number;
  /** The comment, story or poll text. HTML */
  text?: string;
  /** True if the item is dead */
  dead?: boolean;
  /** The comment's parent: either another comment or the relevant story */
  parent?: number;
  /** The pollopt's associated poll */
  poll?: number;
  /** The ids of the item's comments, in ranked display order */
  kids?: number[];
  /** The URL of the story */
  url?: string;
  /** The story's score, or the votes for a pollopt */
  score?: number;
  /** The title of the story, poll or job. HTML */
  title?: string;
  /** A list of related pollopts, in display order */
  parts?: number[];
  /** In the case of stories or polls, the total comment count */
  descendants?: number;
}

export class HackerNewsAPI {
  baseUrl: string;

  constructor(
    baseUrl = 'https://hacker-news.firebaseio.com/v0/'
  ) {
    this.baseUrl = baseUrl;
  }

  async getItem(itemId: number): Promise<IHackerNewsItem> {
    const response = await fetch(`${this.baseUrl}item/${itemId}.json`);
    const data: IHackerNewsItem = await response.json();
    return data;
  }

  async getMaxItemId(): Promise<number> {
    const response = await fetch(`${this.baseUrl}maxitem.json`);
    const data: number = await response.json();
    return data;
  }

  async getTopStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}topstories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getNewStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}newstories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getBestStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}beststories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getAskStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}askstories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getShowStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}showstories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getJobStories(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}jobstories.json`);
    const data: number[] = await response.json();
    return data;
  }

  async getItemUpdates(): Promise<{ items: number[]; profiles: string[] }> {
    const response = await fetch(`${this.baseUrl}updates.json`);
    const data = await response.json();
    return data;
  }
}
