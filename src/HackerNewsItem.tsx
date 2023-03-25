import { Component } from 'react';
import { HackerNewsAPI, IHackerNewsItem } from './api';

interface Props {
  itemId: number;
}

interface State {
  item: IHackerNewsItem | null;
}

class HackerNewsItem extends Component<Props, State> {
  private api: HackerNewsAPI;

  constructor(props: Props) {
    super(props);

    this.state = {
      item: null,
    };

    this.api = new HackerNewsAPI();
  }

  async componentDidMount() {
    const { itemId } = this.props;
    const item = await this.api.getItem(itemId);
    this.setState({ item });
  }

  render() {
    const { item } = this.state;

    if (!item) {
      return <div>Loading...</div>;
    }

    const { by, time, text, kids } = item;

    return (
      <div>
        <p>
          {by} - {new Date(time * 1000).toLocaleString()}
        </p>
        <p dangerouslySetInnerHTML={{ __html: text ?? '' }} />
        {kids && (
          <ul>
            {kids.map((kidId) => (
              <li key={kidId}>
                <HackerNewsItem itemId={kidId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

export default HackerNewsItem;
