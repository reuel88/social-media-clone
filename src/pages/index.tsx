import type { NextPage } from "next";
import { useSession } from "next-auth/react";
import { useState } from "react";
import NewTweetForm from "~/components/NewTweetForm";
import RecentTweets from "~/components/RecentTweets";
import FollowingTweets from "~/components/FollowingTweets";

const TABS = ["Recent", "Following"] as const;

const Home: NextPage = () => {
  const [selectedTab, setSelectedTab] =
    useState<(typeof TABS)[number]>("Recent"); // ["Recent", "Following"]
  const session = useSession();

  return (
    <>
      <header className="sticky top-0 border-b bg-white pt-2">
        <h1 className="mb-2 px-4 text-lg font-bold">Home</h1>
        {session.status === "authenticated" && (
          <div className="flex">
            {TABS.map((tab) => {
              const selectedClass =
                tab === selectedTab
                  ? "border-b-4 border-b-blue-500 font-bold"
                  : "";

              return (
                <button
                  key={tab}
                  className={`flex-grow p-2 hover:bg-gray-200 ${selectedClass}`}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        )}
      </header>
      <NewTweetForm />
      {selectedTab === TABS[0]? (<RecentTweets />) : (<FollowingTweets />)}
    </>
  );
};

export default Home;
