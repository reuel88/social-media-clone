import Link from "next/link";
import { useSession } from "next-auth/react";
import InfiniteScroll from "react-infinite-scroll-component";
import { api } from "~/utils/api";
import ProfileImage from "./ProfileImage";
import { VscHeartFilled, VscHeart } from "react-icons/vsc";
import IconHoverEffect from "./IconHoverEffect";

type HeartIconProps = {
  isLoading: boolean;
  likedByMe: boolean;
  likeCount: number;
  onClick: () => void;
};

const HeartButton = ({
  isLoading,
  likedByMe,
  likeCount,
  onClick,
}: HeartIconProps) => {
  const session = useSession();
  const HeartIcon = likedByMe ? VscHeartFilled : VscHeart;

  if (session.status !== "authenticated")
    return (
      <div className="mb-1 mt-1 flex items-center gap-3 self-start text-gray-500">
        <HeartIcon />
        <span>{likeCount}</span>
      </div>
    );

  const likedByMeButtonClass = likedByMe
    ? "text-red-500"
    : "text-gray-500 hover:text-red-500 focus-visible:text-red-500";
  const likedByMeIconClass = likedByMe
    ? "fill-red-500"
    : "fill-gray-500 group-hover:fill-red-500 group-focus-visible:fill-red-500";

  return (
    <button
      className={`group -ml-2 flex items-center gap-1 self-start transition-colors duration-200 ${likedByMeButtonClass}`}
      disabled={isLoading}
      onClick={onClick}
    >
      <IconHoverEffect red>
        <HeartIcon
          className={`transition-colors duration-200 ${likedByMeIconClass}`}
        />
      </IconHoverEffect>
      <span>{likeCount}</span>
    </button>
  );
};

type Tweet = {
  id: string;
  content: string;
  createdAt: Date;
  likedByMe: boolean;
  likeCount: number;
  user: {
    id: string;
    image: string | null;
    name: string | null;
  };
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
});

const TweetCard = ({
  id,
  content,
  createdAt,
  likedByMe,
  likeCount,
  user,
}: Tweet) => {
  const trpcUtils = api.useContext();
  const toggleLike = api.tweet.toggleLike.useMutation({
    onSuccess: ({ addedLike }) => {
      const updateData: Parameters<
        typeof trpcUtils.tweet.infiniteFeed.setInfiniteData
      >[1] = (oldData) => {
        if (oldData == null) return;

        const countModifier = addedLike ? 1 : -1;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            tweets: page.tweets.map((tweet) => {
              if(tweet.id === id){
                return {
                  ...tweet,
                  likedByMe: addedLike,
                  likeCount: tweet.likeCount + countModifier,
                }
              }

              return tweet;
            }),
          })),
        };
      };

      trpcUtils.tweet.infiniteFeed.setInfiniteData({}, updateData);
    },
  });

  const handleToggleLike = () => {
    toggleLike.mutate({ id });
  };

  return (
    <li className="flex gap-2 border-b px-4 py-4">
      <Link href={`/profiles/${user.id}`}>
        <ProfileImage src={user.image} />
      </Link>
      <div className="flex flex-grow flex-col">
        <div className="flex gap-1">
          <Link
            className="font-bold hover:underline focus-visible:underline"
            href={`/profiles/${user.id}`}
          >
            {user.name}
          </Link>
          <span className="text-gray-500">-</span>
          <span className="text-gray-500">
            {dateTimeFormatter.format(createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
        <HeartButton
          onClick={handleToggleLike}
          isLoading={toggleLike.isLoading}
          likedByMe={likedByMe}
          likeCount={likeCount}
        />
      </div>
    </li>
  );
};

type InfiniteTweetListProps = {
  isError: boolean;
  isLoading: boolean;
  fetchNextPage: () => Promise<unknown>;
  hasMore?: boolean;
  tweets?: Tweet[];
};

const InfiniteTweetList = ({
  isError,
  isLoading,
  fetchNextPage,
  hasMore = false,
  tweets,
}: InfiniteTweetListProps) => {
  if (isLoading) return <h1>Loading...</h1>;
  if (isError) return <h1>Error</h1>;

  if (tweets == null || tweets.length === 0) {
    return (
      <h1 className="my-4 text-center text-2xl text-gray-500">No tweets</h1>
    );
  }

  return (
    <ul>
      <InfiniteScroll
        dataLength={tweets.length}
        next={fetchNextPage}
        hasMore={hasMore}
        loader={"Loading..."}
      >
        {tweets.map((tweet) => {
          return <TweetCard key={tweet.id} {...tweet} />;
        })}
      </InfiniteScroll>
    </ul>
  );
};

const RecentTweets = () => {
  const tweets = api.tweet.infiniteFeed.useInfiniteQuery(
    {},
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  return (
    <InfiniteTweetList
      tweets={tweets.data?.pages.flatMap((page) => page.tweets)}
      isError={tweets.isError}
      isLoading={tweets.isLoading}
      hasMore={tweets.hasNextPage}
      fetchNextPage={tweets.fetchNextPage}
    />
  );
};

export default RecentTweets;
