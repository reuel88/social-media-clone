import { z } from "zod";
import type { Prisma } from "@prisma/client/extension";
import {
  type createTRPCContext,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import type { inferAsyncReturnType } from "@trpc/server";

const getInfiniteTweets = async ({
  ctx,
  cursor,
  limit,
  whereClause,
}: {
  ctx: inferAsyncReturnType<typeof createTRPCContext>;
  cursor: { id: string; createdAt: Date } | undefined;
  limit: number;
  whereClause?: Prisma.TweetWhereInput;
}) => {
  const currentUserId = ctx.session?.user.id;

  const data = await ctx.prisma.tweet.findMany({
    take: limit + 1,
    cursor: cursor ? { createdAt_id: cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: whereClause,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { likes: true } },
      likes:
        currentUserId == null ? false : { where: { userId: currentUserId } },
      user: {
        select: {
          name: true,
          id: true,
          image: true,
        },
      },
    },
  });

  let nextCursor: typeof cursor | undefined;

  if (data.length > limit) {
    const nextItem = data.pop();
    if (nextItem != null) {
      nextCursor = {
        id: nextItem.id,
        createdAt: nextItem.createdAt,
      };
    }
  }

  return {
    tweets: data.map((tweet) => {
      return {
        id: tweet.id,
        content: tweet.content,
        createdAt: tweet.createdAt,
        likeCount: tweet._count.likes,
        user: tweet.user,
        likedByMe: tweet.likes?.length > 0,
      };
    }),
    nextCursor,
  };
};

export const tweetRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input: { content }, ctx }) => {
      const tweet = await ctx.prisma.tweet.create({
        data: {
          content,
          userId: ctx.session.user.id,
        },
      });

      void ctx.revalidateSSG?.(`/profile/${ctx.session.user.id}`)

      return tweet;
    }),
  infiniteFeed: publicProcedure
    .input(
      z.object({
        cursor: z
          .object({
            id: z.string(),
            createdAt: z.date(),
          })
          .optional(),
        limit: z.number().optional(),
        onlyFollowing: z.boolean().optional(),
      }),
    )
    .query(
      async ({ input: { cursor, limit = 10, onlyFollowing = false }, ctx }) => {
        const currentUserId = ctx.session?.user.id;

        return await getInfiniteTweets({
          ctx,
          cursor,
          limit,
          whereClause:
            currentUserId == null || !onlyFollowing
              ? undefined
              : {
                  user: {
                    followers: { some: { id: currentUserId } },
                  },
                },
        });
      },
    ),
  infiniteProfileFeed: publicProcedure
    .input(
      z.object({
        cursor: z
          .object({
            id: z.string(),
            createdAt: z.date(),
          })
          .optional(),
        limit: z.number().optional(),
        userId: z.string(),
      }),
    )
    .query(async ({ input: { cursor, limit = 10, userId }, ctx }) => {
      return await getInfiniteTweets({
        ctx,
        cursor,
        limit,
        whereClause: { userId },
      });
    }),
  toggleLike: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input: { id }, ctx }) => {
      const data = { tweetId: id, userId: ctx.session.user.id };

      const existingLike = await ctx.prisma.like.findUnique({
        where: {
          userId_tweetId: data,
        },
      });

      if (existingLike) {
        await ctx.prisma.like.delete({
          where: {
            userId_tweetId: data,
          },
        });
        return { addedLike: false };
      } else {
        await ctx.prisma.like.create({
          data,
        });
        return { addedLike: true };
      }
    }),
});
