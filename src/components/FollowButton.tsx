import Button from "~/components/Button";
import { useSession } from "next-auth/react";

type FollowButtonProps = {
  isFollowing?: boolean;
  isLoading?: boolean;
  userId: string;
  onClick: () => void;
};

const FollowButton = ({
  userId,
  isFollowing,
  isLoading,
  onClick,
}: FollowButtonProps) => {
  const session = useSession();
  if (session.status !== "authenticated" || session.data.user.id === userId) {
    return null;
  }

  return (
    <Button disabled={isLoading} onClick={onClick} small gray={isFollowing}>
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
};

export default FollowButton;
