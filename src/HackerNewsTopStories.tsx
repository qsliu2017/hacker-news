import { Component } from 'react';
import { HackerNewsAPI, IHackerNewsItem } from './api';

interface Props {
  maxItems?: number;
}

interface State {
  topStories: IHackerNewsItem[];
  loading: boolean;
}

class HackerNewsTopStories extends Component<Props, State> {
  private api: HackerNewsAPI;

  constructor(props: Props) {
    super(props);

    this.state = {
      topStories: [],
      loading: true,
    };

    this.api = new HackerNewsAPI();
  }

  async componentDidMount() {
    const { maxItems } = this.props;
    const topStoryIds = await this.api.getTopStories();
    const topStories = await Promise.all(
      topStoryIds.slice(0, maxItems).map((storyId) => this.api.getItem(storyId))
    );
    this.setState({ topStories, loading: false });
  }

  render() {
    const { topStories, loading } = this.state;

    if (loading) {
      return <div>Loading...</div>;
    }

    return (
      <ul>
        {topStories.map((story) => (
          <li key={story.id}>
            <a href={story.url}>{story.title}</a> - {story.score} points by {story.by}
          </li>
        ))}
      </ul>
    );
  }
}

export default HackerNewsTopStories;
