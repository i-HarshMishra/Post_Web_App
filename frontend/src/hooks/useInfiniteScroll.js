import { useEffect } from 'react';

export function useInfiniteScroll(loading, hasMore, onLoadMore) {
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + document.documentElement.scrollTop + 1 >= document.documentElement.scrollHeight;
      if (scrolledToBottom && hasMore && !loading) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, onLoadMore]);
}
