import { VscRefresh } from "react-icons/vsc";

type LoadingSpinnerProps = {
  big?: boolean;
};

const LoadingSpinner = ({ big = false }: LoadingSpinnerProps) => {
  const sizeClass = big ? "h-16 w-16" : "h-10 w-10";

  return (
    <div className="flex justify-center p-2">
      <VscRefresh className={`animate-spin ${sizeClass}`} />
    </div>
  );
};

export default LoadingSpinner;
