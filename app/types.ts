import { QueryClient } from '@tanstack/react-query';

/**
 * Item is a single item in a column.
 */
export interface Item {
  /**
   * The URL to open when the item is active and the user presses Enter.
   */
  url?: () => string;
  /**
   * Expand the children of the item to a column.
   * Called when the user presses ArrowRight.
   */
  expand?: (queryClient: QueryClient) => Promise<Item[]>;
  /**
   * Render the item.
   * Network requests should be done lazily in this function.
   */
  render(): React.ReactNode;
}
