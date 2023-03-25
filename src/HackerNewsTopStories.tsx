import { Component } from 'react';
import { HackerNewsAPI, IHackerNewsItem } from './api';

interface Props {
  maxItems?: number;
}

interface State {
  topStories: (IHackerNewsItem | null)[];
}

class HackerNewsTopStories extends Component<Props, State> {
  private api: HackerNewsAPI;

  constructor(props: Props) {
    super(props);

    this.state = {
      topStories: [],
    };

    this.api = new HackerNewsAPI();
  }

  async componentDidMount() {
    const { maxItems } = this.props;
    const topStoryIds = (await this.api.getTopStories()).slice(0, maxItems);
    this.setState({ topStories: topStoryIds.map(() => null) });
    topStoryIds.forEach(async (storyId, index) => {
      const story = await this.api.getItem(storyId);
      const { topStories } = this.state;
      topStories[index] = story;
      this.setState({ topStories });
    });
  }

  render() {
    const { topStories } = this.state;

    return (
      <ul>
        {topStories.map((story) => story && (
          <li key={story.id}>
            <a href={story.url}>{story.title}</a> - {story.score} points by {story.by}
          </li>
        ))}
      </ul>
    );
  }
}

export default HackerNewsTopStories;
